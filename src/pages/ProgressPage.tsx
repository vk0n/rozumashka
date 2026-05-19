import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { loadSubjects } from "../lib/data";
import { formatDateTime, formatMode, formatPercentage } from "../lib/format";
import { getAttempts, getMistakeCount } from "../storage/progress";
import type { CompletedAttempt, Subject } from "../types";

export function ProgressPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attempts, setAttempts] = useState<CompletedAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAttempts(getAttempts());
    loadSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <LoadingState label="Збираємо прогрес..." />;
  }

  if (attempts.length === 0) {
    return (
      <EmptyState
        title="Прогрес ще порожній"
        description="Пройдіть першу практику або іспит, і тут з’являться спроби, відсотки та помилки для повторення."
        action={
          <Link className="soft-ring rounded-full bg-ink px-5 py-3 font-black text-paper" to="/subjects">
            Обрати предмет
          </Link>
        }
      />
    );
  }

  const average =
    attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length;
  const best = Math.max(...attempts.map((attempt) => attempt.percentage));
  const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.totalQuestions, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-moss">localStorage</p>
        <h1 className="mt-2 font-display text-5xl font-black">Мій прогрес</h1>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Спроб", value: attempts.length },
          { label: "Середній результат", value: formatPercentage(average) },
          { label: "Найкращий результат", value: formatPercentage(best) },
          { label: "Опрацьовано питань", value: totalQuestions }
        ].map((stat) => (
          <article key={stat.label} className="study-card p-6">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-moss">{stat.label}</p>
            <p className="mt-3 font-display text-4xl font-black">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="study-card p-6">
        <h2 className="font-display text-3xl font-black">Помилки за предметами</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              to={`/setup/${subject.id}`}
              className="rounded-2xl bg-white/70 p-4 font-semibold transition hover:bg-white"
            >
              <span>{subject.title}</span>
              <span className="float-right text-clay">{getMistakeCount(subject.id)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="study-card p-6">
        <h2 className="font-display text-3xl font-black">Останні спроби</h2>
        <div className="mt-4 overflow-hidden rounded-3xl border border-white/70">
          {attempts.map((attempt) => (
            <Link
              key={attempt.id}
              to={`/results/${attempt.id}`}
              className="grid gap-2 border-b border-white/70 bg-white/50 p-4 transition last:border-b-0 hover:bg-white md:grid-cols-[1fr_auto_auto]"
            >
              <span>
                <strong>{attempt.subjectTitle}</strong>
                <span className="ml-2 text-sm text-ink/60">{formatMode(attempt.mode)}</span>
              </span>
              <span className="font-black">
                {attempt.score}/{attempt.totalQuestions} · {formatPercentage(attempt.percentage)}
              </span>
              <span className="text-sm text-ink/60">{formatDateTime(attempt.dateTime)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
