import type { CompletedAttempt, QuestionResult, StoredMistake } from "../types";

const ATTEMPTS_KEY = "rozumashka.examPrep.attempts";
const MISTAKES_KEY = "rozumashka.examPrep.mistakes";

type MistakeStore = Record<string, Record<string, StoredMistake>>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getAttempts(): CompletedAttempt[] {
  return readJson<CompletedAttempt[]>(ATTEMPTS_KEY, []);
}

export function getAttempt(attemptId: string): CompletedAttempt | null {
  return getAttempts().find((attempt) => attempt.id === attemptId) ?? null;
}

export function saveAttempt(attempt: CompletedAttempt): void {
  const attempts = [attempt, ...getAttempts()].slice(0, 100);
  writeJson(ATTEMPTS_KEY, attempts);
}

export function getMistakesStore(): MistakeStore {
  return readJson<MistakeStore>(MISTAKES_KEY, {});
}

export function getMistakeIds(subjectId: string): string[] {
  return Object.keys(getMistakesStore()[subjectId] ?? {});
}

export function getMistakeCount(subjectId: string): number {
  return getMistakeIds(subjectId).length;
}

export function updateMistakesFromResults(subjectId: string, results: QuestionResult[]): void {
  const store = getMistakesStore();
  const subjectMistakes = { ...(store[subjectId] ?? {}) };
  const now = new Date().toISOString();

  for (const result of results) {
    if (result.isCorrect) {
      delete subjectMistakes[result.question.id];
      continue;
    }

    const previous = subjectMistakes[result.question.id];
    subjectMistakes[result.question.id] = {
      questionId: result.question.id,
      subject: subjectId,
      lastAnsweredAt: now,
      timesWrong: (previous?.timesWrong ?? 0) + 1
    };
  }

  store[subjectId] = subjectMistakes;
  writeJson(MISTAKES_KEY, store);
}
