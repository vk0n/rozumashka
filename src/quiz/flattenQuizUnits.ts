import type { Question, QuestionGroup, QuizUnit } from "../types";
import type { QuestionGroupContext } from "./buildQuizUnits";

export interface FlattenedQuiz {
  questions: Question[];
  groupContextByQuestionId: Map<string, QuestionGroupContext>;
}

export function flattenQuizUnits(
  units: QuizUnit[],
  questionsById: Map<string, Question>,
  groupsById: Map<string, QuestionGroup>
): FlattenedQuiz {
  const questions: Question[] = [];
  const groupContextByQuestionId = new Map<string, QuestionGroupContext>();

  for (const unit of units) {
    if (unit.type === "question") {
      const question = questionsById.get(unit.questionId);

      if (question) {
        questions.push(question);
      }

      continue;
    }

    const group = groupsById.get(unit.groupId);

    if (!group) {
      continue;
    }

    group.questionIds.forEach((questionId, index) => {
      const question = questionsById.get(questionId);

      if (!question) {
        return;
      }

      questions.push(question);
      groupContextByQuestionId.set(question.id, {
        group,
        order: index + 1,
        total: group.questionIds.length
      });
    });
  }

  return { questions, groupContextByQuestionId };
}
