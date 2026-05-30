import type { Question, QuestionGroup, QuizUnit } from "../types";

export type GroupMatchMode = "all" | "any";

export interface QuestionGroupContext {
  group: QuestionGroup;
  order: number;
  total: number;
}

export function createQuestionMap(questions: Question[]): Map<string, Question> {
  return new Map(questions.map((question) => [question.id, question]));
}

export function createGroupMap(groups: QuestionGroup[]): Map<string, QuestionGroup> {
  return new Map(groups.map((group) => [group.id, group]));
}

export function createGroupByQuestionId(groups: QuestionGroup[]): Map<string, QuestionGroup> {
  const groupByQuestionId = new Map<string, QuestionGroup>();

  for (const group of groups) {
    for (const questionId of group.questionIds) {
      groupByQuestionId.set(questionId, group);
    }
  }

  return groupByQuestionId;
}

export function countQuestionsInUnit(unit: QuizUnit, groupsById: Map<string, QuestionGroup>): number {
  if (unit.type === "question") {
    return 1;
  }

  return groupsById.get(unit.groupId)?.questionIds.length ?? 0;
}

export function countQuestionsInUnits(units: QuizUnit[], groupsById: Map<string, QuestionGroup>): number {
  return units.reduce((total, unit) => total + countQuestionsInUnit(unit, groupsById), 0);
}

export function buildQuizUnits(
  eligibleQuestions: Question[],
  groups: QuestionGroup[],
  options: { groupMatchMode?: GroupMatchMode } = {}
): QuizUnit[] {
  const groupMatchMode = options.groupMatchMode ?? "all";
  const eligibleIds = new Set(eligibleQuestions.map((question) => question.id));
  const groupByQuestionId = createGroupByQuestionId(groups);
  const addedGroups = new Set<string>();
  const units: QuizUnit[] = [];

  for (const question of eligibleQuestions) {
    const group = groupByQuestionId.get(question.id);

    if (!group) {
      units.push({ type: "question", questionId: question.id });
      continue;
    }

    if (addedGroups.has(group.id)) {
      continue;
    }

    const shouldIncludeGroup =
      groupMatchMode === "any"
        ? group.questionIds.some((questionId) => eligibleIds.has(questionId))
        : group.questionIds.every((questionId) => eligibleIds.has(questionId));

    if (shouldIncludeGroup) {
      units.push({ type: "group", groupId: group.id });
      addedGroups.add(group.id);
    }
  }

  return units;
}

export function shuffleQuizUnits(units: QuizUnit[]): QuizUnit[] {
  const shuffled = [...units];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function selectQuizUnitsByQuestionCount(
  units: QuizUnit[],
  targetQuestionCount: number,
  groupsById: Map<string, QuestionGroup>
): QuizUnit[] {
  if (targetQuestionCount <= 0) {
    return [];
  }

  const selected: QuizUnit[] = [];
  const deferred: QuizUnit[] = [];
  let selectedQuestionCount = 0;

  for (const unit of units) {
    const unitQuestionCount = countQuestionsInUnit(unit, groupsById);

    if (unitQuestionCount === 0) {
      continue;
    }

    if (selectedQuestionCount + unitQuestionCount <= targetQuestionCount) {
      selected.push(unit);
      selectedQuestionCount += unitQuestionCount;
      continue;
    }

    deferred.push(unit);
  }

  if (selected.length === 0 && deferred.length > 0) {
    selected.push(deferred[0]);
  }

  return selected;
}
