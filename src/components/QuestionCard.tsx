import type { Question } from "../types";
import type { QuestionGroupContext } from "../quiz/buildQuizUnits";
import { formatDifficulty, getQuestionSourceBadge } from "../lib/format";
import { getOptionLetter } from "../lib/options";
import { FormattedText } from "./FormattedText";
import { PassageBlock } from "./PassageBlock";
import { QuestionImage } from "./QuestionImage";

interface QuestionCardProps {
  question: Question;
  selectedAnswer: number | null;
  revealed: boolean;
  locked?: boolean;
  groupContext?: QuestionGroupContext;
  onSelect: (optionIndex: number) => void;
}

export function QuestionCard({
  question,
  selectedAnswer,
  revealed,
  locked = false,
  groupContext,
  onSelect
}: QuestionCardProps) {
  const sourceBadge = getQuestionSourceBadge(question);
  const isLongQuestion =
    question.question.length > (question.subject === "tznk" ? 180 : 260) || question.question.includes("\n");
  const questionTextClass = isLongQuestion
    ? "text-base font-semibold leading-8 text-ink sm:text-lg"
    : "font-display text-2xl font-black leading-tight text-ink sm:text-3xl";

  return (
    <article className="study-card overflow-hidden">
      <div className="border-b border-white/70 bg-white/50 p-5">
        <div className="flex flex-wrap gap-2">
          <span className="pill bg-moss/10 text-moss">{question.topic}</span>
          {question.subtopic ? (
            <span className="pill bg-clay/10 text-clay">{question.subtopic}</span>
          ) : null}
          <span className="pill bg-ink/10 text-ink/70">{formatDifficulty(question.difficulty)}</span>
          <span className={`pill ${sourceBadge.className}`} title={sourceBadge.title}>
            {sourceBadge.label}
          </span>
          {!question.reviewed ? (
            <span className="pill bg-white text-ink/55" title="Це питання ще варто перевірити редактору">
              Потребує перевірки
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-6 p-5 sm:p-7">
        {groupContext ? (
          <div className="space-y-3">
            <PassageBlock passage={groupContext.group.passage} label="Спільна умова до завдань" />
            <p className="rounded-2xl bg-moss/10 px-4 py-3 text-sm font-black text-moss">
              Завдання {groupContext.order} із {groupContext.total} до цього тексту
            </p>
          </div>
        ) : question.passage ? (
          <PassageBlock passage={question.passage} />
        ) : null}
        {question.imageUrl ? <QuestionImage imageUrl={question.imageUrl} alt={question.question} /> : null}

        <div className="question-text">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-ink/45">Питання</p>
          <FormattedText
            text={question.question}
            className={questionTextClass}
            paragraphClassName={isLongQuestion ? "mb-3 last:mb-0" : "mb-0"}
          />
        </div>

        <div className="grid gap-3 pt-1">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = question.correctAnswer === index;
            const showCorrect = revealed && isCorrect;
            const showWrong = revealed && isSelected && !isCorrect;

            return (
              <button
                key={option}
                type="button"
                disabled={locked}
                onClick={() => onSelect(index)}
                className={[
                  "soft-ring rounded-2xl border p-4 text-left font-semibold transition",
                  locked ? "cursor-default" : "hover:-translate-y-0.5 hover:shadow-md",
                  showCorrect
                    ? "border-moss bg-moss text-white"
                    : showWrong
                      ? "border-clay bg-clay text-white"
                      : isSelected
                        ? "border-honey bg-honey/25"
                        : "border-white/70 bg-white/70 hover:bg-white"
                ].join(" ")}
              >
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-sm">
                  {getOptionLetter(question, index)}
                </span>
                <span className="align-middle leading-6">{option}</span>
              </button>
            );
          })}
        </div>

        {revealed ? (
          <div className="rounded-3xl border border-moss/10 bg-white/70 p-5">
            <p className="text-lg font-black">
              {selectedAnswer === question.correctAnswer ? "Правильно." : "Тут є що розібрати."}
            </p>
            <FormattedText text={question.explanation} className="mt-2 text-ink/75" />
            {question.explanationByOption ? (
              <div className="mt-4 space-y-3">
                {question.explanationByOption.map((explanation, index) => (
                  <div key={`${index}-${explanation}`} className="rounded-2xl bg-ink/[0.03] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">
                      Варіант {getOptionLetter(question, index)}
                    </p>
                    <FormattedText text={explanation} compact className="mt-1 text-ink/65" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
