export const questionTypes = ["single_choice", "passage_single_choice"] as const;
export const difficulties = ["easy", "medium", "hard"] as const;
export const sourceTypes = [
  "official_demo",
  "public_source",
  "generated",
  "manually_added"
] as const;
export const subjectIds = ["tznk", "english", "management", "psychology-sociology"] as const;
export const quizModes = ["practice", "exam", "mistakes"] as const;
export const sourceFilters = ["all", "imported", "generated"] as const;
export const examSelectionTypes = ["random", "exam_set"] as const;

export type SubjectId = (typeof subjectIds)[number];
export type QuestionType = (typeof questionTypes)[number];
export type Difficulty = (typeof difficulties)[number];
export type SourceType = (typeof sourceTypes)[number];
export type QuizMode = (typeof quizModes)[number];
export type SourceFilter = (typeof sourceFilters)[number];
export type ExamSelectionType = (typeof examSelectionTypes)[number];

export interface Subject {
  id: string;
  title: string;
  fullTitle: string;
  description: string;
  questionFile: string;
  recommendedQuestionCount: number;
  examQuestionCount?: number;
  defaultDurationMinutes?: number;
  examDurationMinutes?: number;
  accent: string;
}

export interface Question {
  id: string;
  subject: SubjectId;
  type: QuestionType;
  topic: string;
  subtopic?: string;
  difficulty: Difficulty;
  sourceType: SourceType;
  sourceUrl?: string | null;
  sourceSite?: string | null;
  sourceYear?: number | string | null;
  sourceExamSetId?: string;
  sourceQuestionOrder?: number;
  groupId?: string;
  groupOrder?: number;
  reviewed: boolean;
  question: string;
  passage?: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  explanationByOption?: string[];
  tags?: string[];
}

export type QuizUnit =
  | { type: "question"; questionId: string }
  | { type: "group"; groupId: string };

export interface QuestionGroup {
  id: string;
  subject: SubjectId;
  title: string | null;
  passage: string;
  questionIds: string[];
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceSite: string | null;
  sourceYear: number | string | null;
  tags: string[];
}

export interface ExamSet {
  id: string;
  subject: SubjectId;
  title: string;
  description: string | null;
  sourceType: SourceType;
  sourceSite: string;
  sourceUrl: string | null;
  year: number | string | null;
  variant: string | null;
  tags: string[];
  units: QuizUnit[];
}

export interface QuizSetup {
  subjectId: string;
  mode: QuizMode;
  examSelectionType?: ExamSelectionType;
  examSetId?: string;
  sourceSite?: string;
  sourceYear?: number | string;
  sourceFilter: SourceFilter;
  questionCount: number;
  durationMinutes?: number;
  topic?: string;
}

export interface QuestionResult {
  question: Question;
  selectedAnswer: number | null;
  isCorrect: boolean;
}

export interface TopicScore {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface CompletedAttempt {
  id: string;
  dateTime: string;
  subject: string;
  subjectTitle: string;
  mode: QuizMode;
  examSelectionType?: ExamSelectionType;
  examSetId?: string;
  examSetTitle?: string;
  sourceSite?: string;
  sourceYear?: number | string;
  sourceFilter?: SourceFilter;
  score: number;
  totalQuestions: number;
  percentage: number;
  wrongQuestionIds: string[];
  topicScores: TopicScore[];
  results: QuestionResult[];
}

export interface StoredMistake {
  questionId: string;
  subject: string;
  lastAnsweredAt: string;
  timesWrong: number;
}
