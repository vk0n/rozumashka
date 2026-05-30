import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { examSetsSchema, questionGroupsSchema, questionsSchema } from "../src/lib/schemas";
import { subjectIds, type ExamSet, type Question, type QuestionGroup, type SubjectId } from "../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDataDir = path.join(projectRoot, "public", "data");
const questionsDir = path.join(publicDataDir, "questions");

const subjectFiles: Record<SubjectId, string> = {
  tznk: "tznk.json",
  english: "english.json",
  management: "management.json",
  "psychology-sociology": "psychology-sociology.json"
};

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
}

async function readOptionalJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

function printZodError(filePath: string, error: ZodError): void {
  console.error(`\n${path.relative(projectRoot, filePath)}`);
  for (const issue of error.issues) {
    const location = issue.path.length > 0 ? issue.path.join(".") : "root";
    console.error(`  - ${location}: ${issue.message}`);
  }
}

function fail(message: string): void {
  console.error(`  - ${message}`);
  process.exitCode = 1;
}

function hasDuplicate(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

async function loadPublicQuestions(): Promise<Question[]> {
  const allQuestions: Question[] = [];

  for (const subject of subjectIds) {
    const filePath = path.join(questionsDir, subjectFiles[subject]);
    allQuestions.push(...questionsSchema.parse(await readJson(filePath)));
  }

  return allQuestions;
}

function validateGroups(groups: QuestionGroup[], questionsById: Map<string, Question>): Map<string, QuestionGroup> {
  const groupsById = new Map<string, QuestionGroup>();
  const groupByQuestionId = new Map<string, QuestionGroup>();

  for (const group of groups) {
    if (groupsById.has(group.id)) {
      fail(`Duplicate question group id "${group.id}"`);
    }

    groupsById.set(group.id, group);

    if (hasDuplicate(group.questionIds)) {
      fail(`Question group "${group.id}" contains duplicate questionIds`);
    }

    group.questionIds.forEach((questionId, index) => {
      const question = questionsById.get(questionId);

      if (!question) {
        fail(`Question group "${group.id}" references missing question "${questionId}"`);
        return;
      }

      if (question.subject !== group.subject) {
        fail(`Question group "${group.id}" subject does not match question "${questionId}"`);
      }

      if (groupByQuestionId.has(questionId)) {
        fail(
          `Question "${questionId}" belongs to both "${groupByQuestionId.get(questionId)?.id}" and "${group.id}"`
        );
      }

      if (question.groupId !== group.id) {
        fail(`Question "${questionId}" is in group "${group.id}" but has groupId "${question.groupId ?? "none"}"`);
      }

      if (question.groupOrder !== index + 1) {
        fail(`Question "${questionId}" has groupOrder "${question.groupOrder ?? "none"}"; expected ${index + 1}`);
      }

      groupByQuestionId.set(questionId, group);
    });
  }

  for (const question of questionsById.values()) {
    if (question.groupId && !groupsById.has(question.groupId)) {
      fail(`Question "${question.id}" references missing group "${question.groupId}"`);
    }
  }

  return groupsById;
}

function validateExamSets(
  examSets: ExamSet[],
  questionsById: Map<string, Question>,
  groupsById: Map<string, QuestionGroup>
): void {
  const examSetIds = new Set<string>();
  const coveredQuestionIdsByExamSet = new Map<string, Set<string>>();

  for (const examSet of examSets) {
    if (examSetIds.has(examSet.id)) {
      fail(`Duplicate exam set id "${examSet.id}"`);
    }

    examSetIds.add(examSet.id);

    const unitKeys = examSet.units.map((unit) =>
      unit.type === "group" ? `group:${unit.groupId}` : `question:${unit.questionId}`
    );

    if (hasDuplicate(unitKeys)) {
      fail(`Exam set "${examSet.id}" contains duplicate units`);
    }

    const coveredQuestionIds = new Set<string>();

    for (const unit of examSet.units) {
      if (unit.type === "group") {
        const group = groupsById.get(unit.groupId);

        if (!group) {
          fail(`Exam set "${examSet.id}" references missing group "${unit.groupId}"`);
          continue;
        }

        if (group.subject !== examSet.subject) {
          fail(`Exam set "${examSet.id}" subject does not match group "${group.id}"`);
        }

        group.questionIds.forEach((questionId) => coveredQuestionIds.add(questionId));
        continue;
      }

      const question = questionsById.get(unit.questionId);

      if (!question) {
        fail(`Exam set "${examSet.id}" references missing question "${unit.questionId}"`);
        continue;
      }

      if (question.subject !== examSet.subject) {
        fail(`Exam set "${examSet.id}" subject does not match question "${question.id}"`);
      }

      if (question.groupId) {
        fail(`Exam set "${examSet.id}" separates grouped question "${question.id}" instead of group "${question.groupId}"`);
      }

      coveredQuestionIds.add(question.id);
    }

    coveredQuestionIdsByExamSet.set(examSet.id, coveredQuestionIds);
  }

  for (const question of questionsById.values()) {
    if (!question.sourceExamSetId) {
      continue;
    }

    if (!examSetIds.has(question.sourceExamSetId)) {
      fail(`Question "${question.id}" references missing exam set "${question.sourceExamSetId}"`);
      continue;
    }

    if (!coveredQuestionIdsByExamSet.get(question.sourceExamSetId)?.has(question.id)) {
      fail(`Question "${question.id}" references exam set "${question.sourceExamSetId}" but is not covered by its units`);
    }
  }
}

async function main(): Promise<void> {
  const questionGroupsPath = path.join(publicDataDir, "question-groups.json");
  const examSetsPath = path.join(publicDataDir, "exam-sets.json");
  const questions = await loadPublicQuestions();
  const questionsById = new Map(questions.map((question) => [question.id, question]));

  let groups: QuestionGroup[] = [];
  let examSets: ExamSet[] = [];

  try {
    groups = questionGroupsSchema.parse(await readOptionalJson(questionGroupsPath, []));
  } catch (error) {
    if (error instanceof ZodError) {
      printZodError(questionGroupsPath, error);
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }

    process.exit(1);
  }

  try {
    examSets = examSetsSchema.parse(await readOptionalJson(examSetsPath, []));
  } catch (error) {
    if (error instanceof ZodError) {
      printZodError(examSetsPath, error);
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }

    process.exit(1);
  }

  const groupsById = validateGroups(groups, questionsById);
  validateExamSets(examSets, questionsById, groupsById);

  if (process.exitCode) {
    console.error("\nExam set validation failed.");
    return;
  }

  const groupedQuestionCount = new Set(groups.flatMap((group) => group.questionIds)).size;
  console.log(`Validated ${groups.length} question groups, ${groupedQuestionCount} grouped questions, and ${examSets.length} exam sets.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
