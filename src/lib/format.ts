import type { Difficulty, Question, QuizMode } from "../types";

export function formatMode(mode: QuizMode): string {
  const labels: Record<QuizMode, string> = {
    practice: "Практика",
    exam: "Іспит",
    mistakes: "Помилки"
  };

  return labels[mode];
}

export function formatDifficulty(difficulty: Difficulty): string {
  const labels: Record<Difficulty, string> = {
    easy: "Легке",
    medium: "Середнє",
    hard: "Складне"
  };

  return labels[difficulty];
}

export function getQuestionSourceBadge(question: Question): {
  label: string;
  className: string;
  title: string;
} {
  if (question.sourceType === "generated") {
    return {
      label: "Згенероване",
      className: "bg-honey/25 text-ink",
      title: "Питання створене як навчальний приклад"
    };
  }

  return {
    label: "Імпортоване",
    className: "bg-moss/10 text-moss",
    title: "Джерело питання збережене в метаданих"
  };
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
