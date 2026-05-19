import { questionsSchema, subjectsSchema } from "./schemas";
import type { Question, Subject } from "../types";

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

export async function loadSubjectWithQuestions(
  subjectId: string
): Promise<{ subject: Subject; questions: Question[] } | null> {
  const subject = await loadSubject(subjectId);

  if (!subject) {
    return null;
  }

  const questions = await loadQuestionsForSubject(subject);
  return { subject, questions };
}
