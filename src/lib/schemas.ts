import { z } from "zod";
import { difficulties, questionTypes, sourceTypes, subjectIds } from "../types";

export const subjectSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  fullTitle: z.string().trim().min(1),
  description: z.string().trim().min(1),
  questionFile: z.string().trim().min(1),
  recommendedQuestionCount: z.number().int().positive(),
  examQuestionCount: z.number().int().positive().optional(),
  defaultDurationMinutes: z.number().int().positive().optional(),
  examDurationMinutes: z.number().int().positive().optional(),
  accent: z.string().trim().min(1)
});

const sourceYearSchema = z.union([z.number().int(), z.string().trim().min(1)]).nullable();
const quizUnitSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("question"), questionId: z.string().trim().min(1) }),
  z.object({ type: z.literal("group"), groupId: z.string().trim().min(1) })
]);

export const subjectsSchema = z.array(subjectSchema).superRefine((subjects, ctx) => {
  const seen = new Set<string>();

  for (const subject of subjects) {
    if (seen.has(subject.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [subject.id],
        message: `Duplicate subject id "${subject.id}"`
      });
    }

    seen.add(subject.id);
  }
});

export const questionSchema = z
  .object({
    id: z.string().trim().min(1),
    subject: z.enum(subjectIds),
    type: z.enum(questionTypes),
    topic: z.string().trim().min(1),
    subtopic: z.string().trim().min(1).optional(),
    difficulty: z.enum(difficulties),
    sourceType: z.enum(sourceTypes),
    sourceUrl: z.string().url().nullable().optional(),
    sourceSite: z.string().trim().min(1).nullable().optional(),
    sourceYear: sourceYearSchema.optional(),
    sourceExamSetId: z.string().trim().min(1).optional(),
    sourceQuestionOrder: z.number().int().positive().optional(),
    groupId: z.string().trim().min(1).optional(),
    groupOrder: z.number().int().positive().optional(),
    reviewed: z.boolean(),
    question: z.string().trim().min(1),
    passage: z.string().trim().min(1).optional(),
    imageUrl: z.string().trim().min(1).optional(),
    options: z.array(z.string().trim().min(1)).min(4),
    correctAnswer: z.number().int().nonnegative(),
    explanation: z.string().trim().min(1),
    explanationByOption: z.array(z.string().trim().min(1)).optional(),
    tags: z.array(z.string().trim().min(1)).optional()
  })
  .superRefine((question, ctx) => {
    if (question.correctAnswer >= question.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswer"],
        message: "correctAnswer must be a valid zero-based option index"
      });
    }

    if (question.type === "passage_single_choice" && !question.passage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passage"],
        message: "passage is required for passage_single_choice questions"
      });
    }

    if (
      question.explanationByOption &&
      question.explanationByOption.length !== question.options.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["explanationByOption"],
        message: "explanationByOption must match options length when provided"
      });
    }
  });

export const questionsSchema = z.array(questionSchema);

export const questionGroupSchema = z.object({
  id: z.string().trim().min(1),
  subject: z.enum(subjectIds),
  title: z.string().trim().min(1).nullable(),
  passage: z.string().trim().min(1),
  questionIds: z.array(z.string().trim().min(1)).min(1),
  sourceType: z.enum(sourceTypes),
  sourceUrl: z.string().url().nullable(),
  sourceSite: z.string().trim().min(1).nullable(),
  sourceYear: sourceYearSchema,
  tags: z.array(z.string().trim().min(1)).default([])
});

export const questionGroupsSchema = z.array(questionGroupSchema);

export const examSetSchema = z.object({
  id: z.string().trim().min(1),
  subject: z.enum(subjectIds),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable(),
  sourceType: z.enum(sourceTypes),
  sourceSite: z.string().trim().min(1),
  sourceUrl: z.string().url().nullable(),
  year: sourceYearSchema,
  variant: z.string().trim().min(1).nullable(),
  tags: z.array(z.string().trim().min(1)).default([]),
  units: z.array(quizUnitSchema).min(1)
});

export const examSetsSchema = z.array(examSetSchema);
