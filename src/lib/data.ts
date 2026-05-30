import { examSetsSchema, questionGroupsSchema, questionsSchema, subjectsSchema } from "./schemas";
import type { ExamSet, Question, QuestionGroup, Subject } from "../types";

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(assetUrl(path));

  if (!response.ok) {
    throw new Error(`Не вдалося завантажити ${path}: ${response.status}`);
  }

  return response.json();
}

export async function loadSubjects(): Promise<Subject[]> {
  const data = await fetchJson("data/subjects.json");
  return subjectsSchema.parse(data);
}

export async function loadSubject(subjectId: string): Promise<Subject | null> {
  const subjects = await loadSubjects();
  return subjects.find((subject) => subject.id === subjectId) ?? null;
}

export async function loadQuestionsForSubject(subject: Subject): Promise<Question[]> {
  const data = await fetchJson(subject.questionFile);
  return questionsSchema.parse(data) as Question[];
}

export async function loadQuestionGroups(): Promise<QuestionGroup[]> {
  const data = await fetchJson("data/question-groups.json");
  return questionGroupsSchema.parse(data) as QuestionGroup[];
}

export async function loadExamSets(): Promise<ExamSet[]> {
  const data = await fetchJson("data/exam-sets.json");
  return examSetsSchema.parse(data) as ExamSet[];
}

export async function loadSubjectWithQuestions(
  subjectId: string
): Promise<{ subject: Subject; questions: Question[]; groups: QuestionGroup[]; examSets: ExamSet[] } | null> {
  const subject = await loadSubject(subjectId);

  if (!subject) {
    return null;
  }

  const [questions, groups, examSets] = await Promise.all([
    loadQuestionsForSubject(subject),
    loadQuestionGroups(),
    loadExamSets()
  ]);

  return {
    subject,
    questions,
    groups: groups.filter((group) => group.subject === subject.id),
    examSets: examSets.filter((examSet) => examSet.subject === subject.id)
  };
}
