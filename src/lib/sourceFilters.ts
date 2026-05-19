import { sourceFilters, type Question, type SourceFilter } from "../types";

export const sourceFilterOptions: Array<{ value: SourceFilter; label: string; description: string }> = [
  {
    value: "all",
    label: "Усі питання",
    description: "Змішати весь доступний банк."
  },
  {
    value: "imported",
    label: "Імпортовані",
    description: "Офіційні та публічні джерела, без generated."
  },
  {
    value: "generated",
    label: "Згенеровані",
    description: "Тільки навчальні generated-питання."
  }
];

export function parseSourceFilter(value: string | null): SourceFilter {
  return sourceFilters.includes(value as SourceFilter) ? (value as SourceFilter) : "all";
}

export function formatSourceFilter(sourceFilter: SourceFilter | undefined): string {
  return sourceFilterOptions.find((option) => option.value === (sourceFilter ?? "all"))?.label ?? "Усі питання";
}

export function filterQuestionsBySource(questions: Question[], sourceFilter: SourceFilter): Question[] {
  if (sourceFilter === "generated") {
    return questions.filter((question) => question.sourceType === "generated");
  }

  if (sourceFilter === "imported") {
    return questions.filter((question) => question.sourceType !== "generated");
  }

  return questions;
}

export function getSourceCounts(questions: Question[]): Record<SourceFilter, number> {
  const generated = questions.filter((question) => question.sourceType === "generated").length;

  return {
    all: questions.length,
    imported: questions.length - generated,
    generated
  };
}

export function getSourceFilterEmptyMessage(sourceFilter: SourceFilter): string {
  if (sourceFilter === "generated") {
    return "Для цього предмета ще немає згенерованих питань.";
  }

  if (sourceFilter === "imported") {
    return "Для цього предмета ще немає імпортованих питань.";
  }

  return "Для цього предмета поки немає питань.";
}
