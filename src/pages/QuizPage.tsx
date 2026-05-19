import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { QuestionCard } from "../components/QuestionCard";
import { loadSubjectWithQuestions } from "../lib/data";
import { formatMode, formatTimer } from "../lib/format";
import {
  filterQuestionsBySource,
  getSourceFilterEmptyMessage,
  parseSourceFilter
} from "../lib/sourceFilters";
import { buildAttempt, createResults, shuffleQuestions } from "../quiz/scoring";
import { getMistakeIds, saveAttempt, updateMistakesFromResults } from "../storage/progress";
import type { Question, QuizMode, Subject } from "../types";

function parseMode(value: string | null): QuizMode {
  if (value === "exam" || value === "mistakes" || value === "practice") {
    return value;
  }

  return "practice";
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function QuizPage() {
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [sourceFilterEmpty, setSourceFilterEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const finishedRef = useRef(false);

  const mode = parseMode(searchParams.get("mode"));
  const requestedCount = parsePositiveInt(searchParams.get("count"), 8);
  const topic = searchParams.get("topic") ?? "all";
  const sourceFilter = parseSourceFilter(searchParams.get("sourceFilter"));
  const durationMinutes = parsePositiveInt(searchParams.get("duration"), 0);

  useEffect(() => {
    if (!subjectId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    loadSubjectWithQuestions(subjectId)
      .then((result) => {
        if (!result) {
          setError("Предмет не знайдено.");
          return;
        }

        const mistakeIds = new Set(getMistakeIds(result.subject.id));
        const bySource = filterQuestionsBySource(result.questions, sourceFilter);
        setSourceFilterEmpty(bySource.length === 0);
        const byTopic =
          topic === "all" || mode === "mistakes"
            ? bySource
            : bySource.filter((question) => question.topic === topic);
        const pool =
          mode === "mistakes"
            ? bySource.filter((question) => mistakeIds.has(question.id))
            : byTopic;

        setSubject(result.subject);
        setQuestions(shuffleQuestions(pool).slice(0, Math.min(requestedCount, pool.length)));
        setCurrentIndex(0);
        setAnswers({});
        setRevealed({});
        setRemainingSeconds(mode === "exam" && durationMinutes > 0 ? durationMinutes * 60 : null);
        finishedRef.current = false;
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : "Невідома помилка");
      })
      .finally(() => setIsLoading(false));
  }, [durationMinutes, mode, requestedCount, sourceFilter, subjectId, topic]);

  function finishQuiz() {
    if (!subject || questions.length === 0 || finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    const results = createResults(questions, answers);
    const attempt = buildAttempt(subject, mode, results, sourceFilter);
    saveAttempt(attempt);
    updateMistakesFromResults(subject.id, results);
    navigate(`/results/${attempt.id}`, { replace: true });
  }

  useEffect(() => {
    if (mode !== "exam" || remainingSeconds === null || finishedRef.current) {
      return;
    }

    if (remainingSeconds <= 0) {
      finishQuiz();
      return;
    }

    const timeout = window.setTimeout(() => {
      setRemainingSeconds((seconds) => (seconds === null ? null : Math.max(0, seconds - 1)));
    }, 1000);

    return () => window.clearTimeout(timeout);
  });

  if (isLoading) {
    return <LoadingState label="Готуємо тест..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Не вдалося відкрити тест"
        description={error}
        action={
          <Link className="soft-ring rounded-full bg-ink px-5 py-3 font-black text-paper" to="/subjects">
            До предметів
          </Link>
        }
      />
    );
  }

  if (!subject || questions.length === 0) {
    return (
      <EmptyState
        title={mode === "mistakes" && !sourceFilterEmpty ? "Помилок поки немає" : "Питання не знайдено"}
        description={
          sourceFilterEmpty
            ? getSourceFilterEmptyMessage(sourceFilter)
            : mode === "mistakes"
            ? "Класна ситуація: для цього предмета немає збережених помилок. Пройдіть практику або іспит, щоб режим мав що повторювати."
            : "Спробуйте іншу тему або поверніться до налаштувань."
        }
        action={
          <Link
            className="soft-ring rounded-full bg-ink px-5 py-3 font-black text-paper"
            to={subjectId ? `/setup/${subjectId}` : "/subjects"}
          >
            До налаштувань
          </Link>
        }
      />
    );
  }

  const question = questions[currentIndex];
  const selectedAnswer = answers[question.id] ?? null;
  const isRevealed = Boolean(revealed[question.id]);
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  function selectAnswer(optionIndex: number) {
    if (mode !== "exam" && revealed[question.id]) {
      return;
    }

    setAnswers((previous) => ({ ...previous, [question.id]: optionIndex }));

    if (mode !== "exam") {
      setRevealed((previous) => ({ ...previous, [question.id]: true }));
    }
  }

  function nextQuestion() {
    if (isLastQuestion) {
      finishQuiz();
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
  }

  return (
    <div className="space-y-5">
      <section className="study-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-moss">
              {subject.title} · {formatMode(mode)}
            </p>
            <h1 className="mt-1 font-display text-3xl font-black">
              Питання {currentIndex + 1} з {questions.length}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="pill bg-white text-ink/70">відповідей: {answeredCount}</span>
            {remainingSeconds !== null ? (
              <span className="pill bg-clay/10 text-clay">таймер: {formatTimer(remainingSeconds)}</span>
            ) : null}
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/70">
          <div className="h-full rounded-full bg-moss" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <QuestionCard
        question={question}
        selectedAnswer={selectedAnswer}
        revealed={isRevealed}
        locked={mode !== "exam" && isRevealed}
        onSelect={selectAnswer}
      />

      <div className="study-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {mode === "exam" ? (
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              className="soft-ring rounded-full bg-white/70 px-5 py-3 font-black disabled:opacity-40"
            >
              Назад
            </button>
          ) : null}
          <button
            type="button"
            disabled={mode !== "exam" && !isRevealed}
            onClick={nextQuestion}
            className="soft-ring rounded-full bg-ink px-6 py-3 font-black text-paper disabled:cursor-not-allowed disabled:bg-ink/30"
          >
            {isLastQuestion ? "Завершити" : "Далі"}
          </button>
        </div>

        {mode === "exam" ? (
          <button
            type="button"
            onClick={finishQuiz}
            className="soft-ring rounded-full bg-clay px-6 py-3 font-black text-white"
          >
            Завершити тест
          </button>
        ) : (
          <p className="text-sm font-semibold text-ink/60">
            Оберіть варіант, щоб одразу побачити пояснення.
          </p>
        )}
      </div>
    </div>
  );
}
