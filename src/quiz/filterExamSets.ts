import type { ExamSet, SourceFilter, SubjectId } from "../types";

export interface ExamSetFilters {
  subjectId?: SubjectId | string;
  sourceFilter?: SourceFilter;
  sourceSite?: string;
  sourceYear?: number | string;
}

export function filterExamSets(examSets: ExamSet[], filters: ExamSetFilters): ExamSet[] {
  return examSets.filter((examSet) => {
    if (filters.subjectId && examSet.subject !== filters.subjectId) {
      return false;
    }

    if (filters.sourceFilter === "generated" && examSet.sourceType !== "generated") {
      return false;
    }

    if (filters.sourceFilter === "imported" && examSet.sourceType === "generated") {
      return false;
    }

    if (filters.sourceSite && examSet.sourceSite !== filters.sourceSite) {
      return false;
    }

    if (filters.sourceYear !== undefined && String(examSet.year ?? "") !== String(filters.sourceYear)) {
      return false;
    }

    return true;
  });
}

export function getExamSetQuestionCount(examSet: ExamSet, groupQuestionCounts: Map<string, number>): number {
  return examSet.units.reduce((total, unit) => {
    if (unit.type === "question") {
      return total + 1;
    }

    return total + (groupQuestionCounts.get(unit.groupId) ?? 0);
  }, 0);
}
