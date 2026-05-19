import { z } from "zod";
import { difficulties, questionTypes, sourceTypes } from "../types";

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
    subject: z.string().trim().min(1),
    type: z.enum(questionTypes),
    topic: z.string().trim().min(1),
    subtopic: z.string().trim().min(1).optional(),
    difficulty: z.enum(difficulties),
    sourceType: z.enum(sourceTypes),
    sourceUrl: z.string().url().nullable().optional(),
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
