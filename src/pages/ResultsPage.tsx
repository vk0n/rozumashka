import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { FormattedText } from "../components/FormattedText";
import { PassageBlock } from "../components/PassageBlock";
import { QuestionImage } from "../components/QuestionImage";
import {
  formatDateTime,
  formatMode,
  formatPercentage,
  getQuestionSourceBadge
} from "../lib/format";
import { getOptionLetter } from "../lib/options";
import { formatSourceFilter } from "../lib/sourceFilters";
import { getAttempt } from "../storage/progress";
import type { Question } from "../types";

function getQuestionTextClass(question: Question): string {
  const isLongQuestion =
    question.question.length > (question.subject === "tznk" ? 180 : 260) || question.question.includes("\n");

  return isLongQuestion
    ? "text-base font-semibold leading-8 text-ink sm:text-lg"
    : "font-display text-2xl font-black leading-tight text-ink sm:text-3xl";
}

export function ResultsPage() {
  const { attemptId } = useParams();
  const attempt = attemptId ? getAttempt(attemptId) : null;

  if (!attempt) {
    return (
      <EmptyState
        title="Результат не знайдено"
        description="Можливо, localStorage було очищено або посилання застаріло."
        action={
          <Link className="soft-ring rounded-full bg-ink px-5 py-3 font-black text-paper" to="/subjects">
            Почати новий тест
          </Link>
        }
      />
    );
  }

  const incorrect = attempt.results.filter((result) => !result.isCorrect);

  return (
    <div className="space-y-6">
      <section className="study-card p-7">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-moss">
          {attempt.subjectTitle} · {formatMode(attempt.mode)} · {formatSourceFilter(attempt.sourceFilter)} ·{" "}
          {formatDateTime(attempt.dateTime)}
        </p>
        <h1 className="mt-3 font-display text-5xl font-black">
          {attempt.score} / {attempt.totalQuestions}
        </h1>
        <p className="mt-2 text-xl font-black text-moss">{formatPercentage(attempt.percentage)}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/setup/${attempt.subject}`}
            className="soft-ring rounded-full bg-ink px-5 py-3 font-black text-paper"
          >
            Спробувати ще
          </Link>
          <Link
            to="/progress"
            className="soft-ring rounded-full bg-white/70 px-5 py-3 font-black text-ink"
          >
            До прогресу
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="study-card p-6">
          <h2 className="font-display text-3xl font-black">Результат за темами</h2>
          <div className="mt-4 space-y-3">
            {attempt.topicScores.map((topic) => (
              <div key={topic.topic}>
                <div className="flex justify-between gap-4 text-sm font-black">
                  <span>{topic.topic}</span>
                  <span>
                    {topic.correct}/{topic.total} · {formatPercentage(topic.percentage)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-moss"
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="study-card p-6">
          <h2 className="font-display text-3xl font-black">Неправильні відповіді</h2>
          {incorrect.length === 0 ? (
            <p className="mt-4 leading-7 text-ink/70">
              Жодної помилки. Це той самий тихий момент, коли можна видихнути.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {incorrect.map((result) => (
                <li key={result.question.id} className="rounded-2xl bg-clay/10 p-3 text-sm font-semibold">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-clay">
                    {result.question.topic}
                  </p>
                  <FormattedText
                    text={result.question.question}
                    compact
                    className="mt-1 text-ink/70"
                    paragraphClassName="mb-0"
                  />
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-4xl font-black">Детальний розбір</h2>
        {attempt.results.map((result, index) => {
          const sourceBadge = getQuestionSourceBadge(result.question);

          return (
            <article key={result.question.id} className="study-card p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill bg-white text-ink/70">#{index + 1}</span>
                <span className={result.isCorrect ? "pill bg-moss/10 text-moss" : "pill bg-clay/10 text-clay"}>
                  {result.isCorrect ? "правильно" : "помилка"}
                </span>
                <span className="pill bg-honey/20 text-ink/70">{result.question.topic}</span>
                <span className={`pill ${sourceBadge.className}`} title={sourceBadge.title}>
                  {sourceBadge.label}
                </span>
                {!result.question.reviewed ? (
                  <span className="pill bg-white text-ink/55" title="Це питання ще варто перевірити редактору">
                    Потребує перевірки
                  </span>
                ) : null}
              </div>

              {result.question.passage ? <PassageBlock passage={result.question.passage} className="mt-5" /> : null}
              {result.question.imageUrl ? (
                <QuestionImage imageUrl={result.question.imageUrl} alt={result.question.question} className="mt-5" />
              ) : null}

              <div className="question-text mt-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-ink/45">Питання</p>
                <FormattedText
                  text={result.question.question}
                  className={getQuestionTextClass(result.question)}
                  paragraphClassName="mb-3 last:mb-0"
                />
              </div>

              <div className="mt-4 grid gap-2">
                {result.question.options.map((option, optionIndex) => (
                  <div
                    key={`${optionIndex}-${option}`}
                    className={[
                      "rounded-2xl border p-3 text-sm font-semibold leading-6",
                      optionIndex === result.question.correctAnswer
                        ? "border-moss bg-moss/10 text-moss"
                        : optionIndex === result.selectedAnswer
                          ? "border-clay bg-clay/10 text-clay"
                          : "border-white bg-white/60 text-ink/65"
                    ].join(" ")}
                  >
                    <span className="mr-2 font-black">{getOptionLetter(result.question, optionIndex)}.</span>
                    {option}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-moss/10 bg-white/70 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-moss">Пояснення</p>
                <FormattedText text={result.question.explanation} className="mt-2 text-ink/75" />
                {result.question.explanationByOption ? (
                  <div className="mt-4 space-y-3">
                    {result.question.explanationByOption.map((explanation, optionIndex) => (
                      <div key={`${optionIndex}-${explanation}`} className="rounded-2xl bg-ink/[0.03] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">
                          Варіант {getOptionLetter(result.question, optionIndex)}
                        </p>
                        <FormattedText text={explanation} compact className="mt-1 text-ink/65" />
                      </div>
                    ))}
                  </div>
                ) : null}
                </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
