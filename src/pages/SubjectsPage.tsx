import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { loadQuestionsForSubject, loadSubjects } from "../lib/data";
import { getMistakeCount } from "../storage/progress";
import type { Subject } from "../types";

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects()
      .then(async (loadedSubjects) => {
        const counts = await Promise.all(
          loadedSubjects.map(async (subject) => {
            const questions = await loadQuestionsForSubject(subject);
            return [subject.id, questions.length] as const;
          })
        );

        setSubjects(loadedSubjects);
        setQuestionCounts(Object.fromEntries(counts));
        setError(null);
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : "Невідома помилка");
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <EmptyState
        title="Не вдалося завантажити предмети"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-moss">крок 1</p>
        <h1 className="mt-2 font-display text-5xl font-black">Оберіть предмет</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {subjects.map((subject) => {
          const mistakes = getMistakeCount(subject.id);
          const questionCount = questionCounts[subject.id] ?? 0;

          return (
            <Link
              key={subject.id}
              to={`/setup/${subject.id}`}
              className="study-card soft-ring group block overflow-hidden p-6 transition hover:-translate-y-1 hover:bg-white/85"
            >
              <div
                className="mb-5 h-2 rounded-full"
                style={{ backgroundColor: subject.accent }}
              />
              <h2 className="font-display text-4xl font-black">{subject.title}</h2>
              <p className="mt-1 text-sm font-bold text-moss">{subject.fullTitle}</p>
              <p className="mt-4 leading-7 text-ink/70">{subject.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="pill bg-white text-ink/70">
                  питань: {questionCount}
                </span>
                <span className="pill bg-clay/10 text-clay">помилок: {mistakes}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
