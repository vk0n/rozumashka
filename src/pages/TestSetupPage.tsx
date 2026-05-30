import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { loadSubjectWithQuestions } from "../lib/data";
import { formatMode } from "../lib/format";
import {
  filterQuestionsBySource,
  getSourceCounts,
  getSourceFilterEmptyMessage,
  sourceFilterOptions
} from "../lib/sourceFilters";
import {
  buildQuizUnits,
  countQuestionsInUnits,
  createGroupMap
} from "../quiz/buildQuizUnits";
import { filterExamSets, getExamSetQuestionCount } from "../quiz/filterExamSets";
import { getMistakeIds } from "../storage/progress";
import type { ExamSelectionType, ExamSet, Question, QuestionGroup, QuizMode, SourceFilter, Subject } from "../types";

const modes: Array<{ mode: QuizMode; description: string }> = [
  {
    mode: "practice",
    description: "Після кожної відповіді одразу бачиш результат і пояснення."
  },
  {
    mode: "exam",
    description: "Відповідаєш без підказок, а детальний розбір бачиш у кінці."
  },
  {
    mode: "mistakes",
    description: "Повторюєш тільки питання, які раніше були неправильними."
  }
];

function getDefaultQuestionCount(subject: Subject, mode: QuizMode, availableCount: number): number {
  if (mode === "exam") {
    return Math.min(subject.examQuestionCount ?? subject.recommendedQuestionCount, Math.max(1, availableCount));
  }

  if (mode === "mistakes") {
    return Math.max(1, availableCount);
  }

  return Math.min(subject.recommendedQuestionCount, Math.max(1, availableCount));
}

function getDefaultDurationMinutes(subject: Subject, mode: QuizMode): number {
  if (mode === "exam") {
    return subject.examDurationMinutes ?? subject.defaultDurationMinutes ?? 30;
  }

  return subject.defaultDurationMinutes ?? 30;
}

export function TestSetupPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [mode, setMode] = useState<QuizMode>("practice");
  const [examSelectionType, setExamSelectionType] = useState<ExamSelectionType>("random");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [questionCount, setQuestionCount] = useState(8);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [topic, setTopic] = useState("all");
  const [sourceSite, setSourceSite] = useState("all");
  const [sourceYear, setSourceYear] = useState("all");
  const [examSetId, setExamSetId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) {
      return;
    }

    loadSubjectWithQuestions(subjectId)
      .then((result) => {
        if (!result) {
          setError("Предмет не знайдено.");
          return;
        }

        setSubject(result.subject);
        setQuestions(result.questions);
        setGroups(result.groups);
        setExamSets(result.examSets);
        setQuestionCount(Math.min(result.subject.recommendedQuestionCount, result.questions.length));
        setDurationMinutes(result.subject.defaultDurationMinutes ?? 30);
        setError(null);
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : "Невідома помилка");
      })
      .finally(() => setIsLoading(false));
  }, [subjectId]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !subject) {
    return (
      <EmptyState
        title="Не можемо відкрити налаштування"
        description={error ?? "Спробуйте повернутися до списку предметів."}
        action={
          <Link className="soft-ring rounded-full bg-ink px-5 py-3 font-black text-paper" to="/subjects">
            До предметів
          </Link>
        }
      />
    );
  }

  const groupsById = createGroupMap(groups);
  const sourceCounts = getSourceCounts(questions);
  const sourceFilteredQuestions = filterQuestionsBySource(questions, sourceFilter);
  const sourceSiteValue = sourceSite === "all" ? undefined : sourceSite;
  const sourceYearValue = sourceYear === "all" ? undefined : sourceYear;
  const sourceFilteredByMetadataQuestions = sourceFilteredQuestions.filter((question) => {
    if (sourceSiteValue && question.sourceSite !== sourceSiteValue) {
      return false;
    }

    if (sourceYearValue && String(question.sourceYear ?? "") !== sourceYearValue) {
      return false;
    }

    return true;
  });
  const topics = [...new Set(sourceFilteredByMetadataQuestions.map((question) => question.topic))];
  const topicQuestions =
    topic === "all"
      ? sourceFilteredByMetadataQuestions
      : sourceFilteredByMetadataQuestions.filter((question) => question.topic === topic);
  const mistakeIds = new Set(getMistakeIds(subject.id));
  const mistakeQuestions = sourceFilteredByMetadataQuestions.filter((question) => mistakeIds.has(question.id));
  const mistakesCount = mistakeQuestions.length;
  const availableUnits = buildQuizUnits(mode === "mistakes" ? mistakeQuestions : topicQuestions, groups, {
    groupMatchMode: mode === "mistakes" ? "any" : "all"
  });
  const availableCount = countQuestionsInUnits(availableUnits, groupsById);
  const groupedUnitCount = availableUnits.filter((unit) => unit.type === "group").length;
  const sourceFilterIsEmpty = sourceFilteredQuestions.length === 0;
  const sourceSites = [
    ...new Set(
      sourceFilteredQuestions
        .map((question) => question.sourceSite)
        .filter((site): site is string => Boolean(site))
    )
  ].sort();
  const sourceYears = [
    ...new Set(
      sourceFilteredQuestions
        .map((question) => question.sourceYear)
        .filter((year): year is number | string => year !== null && year !== undefined)
        .map(String)
    )
  ].sort((left, right) => Number(left) - Number(right) || left.localeCompare(right));
  const matchingExamSets = filterExamSets(examSets, {
    sourceFilter,
    sourceSite: sourceSiteValue,
    sourceYear: sourceYearValue
  });
  const selectedExamSet = matchingExamSets.find((examSet) => examSet.id === examSetId) ?? matchingExamSets[0] ?? null;
  const selectedExamSetQuestionCount = selectedExamSet
    ? getExamSetQuestionCount(
        selectedExamSet,
        new Map(groups.map((group) => [group.id, group.questionIds.length]))
      )
    : 0;
  const selectedExamSetGroupedTaskCount = selectedExamSet?.units.filter((unit) => unit.type === "group").length ?? 0;
  const examSetSourceSites = [
    ...new Set(
      filterExamSets(examSets, { sourceFilter })
        .map((examSet) => examSet.sourceSite)
        .filter(Boolean)
    )
  ].sort();
  const examSetYears = [
    ...new Set(
      filterExamSets(examSets, { sourceFilter, sourceSite: sourceSiteValue })
        .map((examSet) => examSet.year)
        .filter((year): year is number | string => year !== null && year !== undefined)
        .map(String)
    )
  ].sort((left, right) => Number(left) - Number(right) || left.localeCompare(right));
  const isSpecificExamSet = mode === "exam" && examSelectionType === "exam_set";
  const canStart = isSpecificExamSet
    ? Boolean(selectedExamSet)
    : !sourceFilterIsEmpty && availableCount > 0 && questionCount > 0;

  function getAvailableQuestionCountFor(next: {
    mode: QuizMode;
    sourceFilter: SourceFilter;
    topic: string;
    sourceSite: string;
    sourceYear: string;
  }): number {
    const nextSourceSiteValue = next.sourceSite === "all" ? undefined : next.sourceSite;
    const nextSourceYearValue = next.sourceYear === "all" ? undefined : next.sourceYear;
    const nextSourceQuestions = filterQuestionsBySource(questions, next.sourceFilter).filter((question) => {
      if (nextSourceSiteValue && question.sourceSite !== nextSourceSiteValue) {
        return false;
      }

      if (nextSourceYearValue && String(question.sourceYear ?? "") !== nextSourceYearValue) {
        return false;
      }

      return true;
    });
    const nextMistakeIds = new Set(subject ? getMistakeIds(subject.id) : []);
    const nextTopicQuestions =
      next.topic === "all" || next.mode === "mistakes"
        ? nextSourceQuestions
        : nextSourceQuestions.filter((question) => question.topic === next.topic);
    const nextPool =
      next.mode === "mistakes"
        ? nextSourceQuestions.filter((question) => nextMistakeIds.has(question.id))
        : nextTopicQuestions;
    const nextUnits = buildQuizUnits(nextPool, groups, {
      groupMatchMode: next.mode === "mistakes" ? "any" : "all"
    });

    return countQuestionsInUnits(nextUnits, groupsById);
  }

  function changeMode(nextMode: QuizMode) {
    if (!subject) {
      setMode(nextMode);
      return;
    }

    const nextTopic = nextMode === "exam" ? "all" : topic;
    const nextAvailableCount = getAvailableQuestionCountFor({
      mode: nextMode,
      sourceFilter,
      topic: nextTopic,
      sourceSite,
      sourceYear
    });

    setMode(nextMode);
    setTopic(nextTopic);
    setQuestionCount(getDefaultQuestionCount(subject, nextMode, nextAvailableCount));
    setDurationMinutes(getDefaultDurationMinutes(subject, nextMode));
  }

  function changeSourceFilter(nextSourceFilter: SourceFilter) {
    if (!subject) {
      setSourceFilter(nextSourceFilter);
      return;
    }

    const nextAvailableCount = getAvailableQuestionCountFor({
      mode,
      sourceFilter: nextSourceFilter,
      topic: "all",
      sourceSite: "all",
      sourceYear: "all"
    });

    setSourceFilter(nextSourceFilter);
    setTopic("all");
    setSourceSite("all");
    setSourceYear("all");
    setExamSetId("");
    setQuestionCount(getDefaultQuestionCount(subject, mode, nextAvailableCount));
  }

  function changeTopic(nextTopic: string) {
    if (!subject) {
      setTopic(nextTopic);
      return;
    }

    const nextAvailableCount = getAvailableQuestionCountFor({
      mode,
      sourceFilter,
      topic: nextTopic,
      sourceSite,
      sourceYear
    });

    setTopic(nextTopic);
    setQuestionCount(getDefaultQuestionCount(subject, mode, nextAvailableCount));
  }

  function changeSourceSite(nextSourceSite: string) {
    if (!subject) {
      setSourceSite(nextSourceSite);
      return;
    }

    const nextAvailableCount = getAvailableQuestionCountFor({
      mode,
      sourceFilter,
      topic,
      sourceSite: nextSourceSite,
      sourceYear: "all"
    });

    setSourceSite(nextSourceSite);
    setSourceYear("all");
    setExamSetId("");
    setQuestionCount(getDefaultQuestionCount(subject, mode, nextAvailableCount));
  }

  function changeSourceYear(nextSourceYear: string) {
    if (!subject) {
      setSourceYear(nextSourceYear);
      return;
    }

    const nextAvailableCount = getAvailableQuestionCountFor({
      mode,
      sourceFilter,
      topic,
      sourceSite,
      sourceYear: nextSourceYear
    });

    setSourceYear(nextSourceYear);
    setExamSetId("");
    setQuestionCount(getDefaultQuestionCount(subject, mode, nextAvailableCount));
  }

  function startQuiz() {
    if (!subject || !canStart) {
      return;
    }

    const params = new URLSearchParams({
      mode,
      count: String(isSpecificExamSet ? selectedExamSetQuestionCount : Math.min(questionCount, availableCount)),
      topic,
      sourceFilter
    });

    if (mode === "exam") {
      params.set("duration", String(durationMinutes));
      params.set("examSelectionType", examSelectionType);

      if (isSpecificExamSet && selectedExamSet) {
        params.set("examSetId", selectedExamSet.id);
        params.set("sourceSite", selectedExamSet.sourceSite);

        if (selectedExamSet.year !== null) {
          params.set("sourceYear", String(selectedExamSet.year));
        }
      }
    }

    if (!isSpecificExamSet) {
      if (sourceSiteValue) {
        params.set("sourceSite", sourceSiteValue);
      }

      if (sourceYearValue) {
        params.set("sourceYear", sourceYearValue);
      }
    }

    navigate(`/quiz/${subject.id}?${params.toString()}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-6">
        <div>
          <Link to="/subjects" className="text-sm font-black text-moss hover:underline">
            ← усі предмети
          </Link>
          <h1 className="mt-3 font-display text-5xl font-black">{subject.title}</h1>
          <p className="mt-2 max-w-2xl leading-7 text-ink/70">{subject.description}</p>
        </div>

        <div className="study-card p-6">
          <h2 className="font-display text-3xl font-black">Режим</h2>
          <div className="mt-4 grid gap-3">
            {modes.map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => changeMode(item.mode)}
                className={[
                  "soft-ring rounded-2xl border p-4 text-left transition",
                  mode === item.mode
                    ? "border-moss bg-moss text-white"
                    : "border-white/70 bg-white/70 hover:bg-white"
                ].join(" ")}
              >
                <span className="block font-black">{formatMode(item.mode)}</span>
                <span className={mode === item.mode ? "text-white/80" : "text-ink/65"}>
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {mode === "exam" ? (
          <div className="study-card p-6">
            <h2 className="font-display text-3xl font-black">Тип тесту</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  value: "random" as const,
                  label: "Випадковий тест",
                  description: "Зібрати тест із банку питань з урахуванням фільтрів."
                },
                {
                  value: "exam_set" as const,
                  label: "Конкретний варіант іспиту",
                  description: "Пройти збережений варіант у початковому порядку."
                }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExamSelectionType(option.value)}
                  className={[
                    "soft-ring rounded-2xl border p-4 text-left transition",
                    examSelectionType === option.value
                      ? "border-moss bg-moss text-white"
                      : "border-white/70 bg-white/70 hover:bg-white"
                  ].join(" ")}
                >
                  <span className="block font-black">{option.label}</span>
                  <span className={examSelectionType === option.value ? "text-white/80" : "text-ink/65"}>
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="study-card grid gap-5 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="font-black">Джерело питань</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {sourceFilterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changeSourceFilter(option.value)}
                  className={[
                    "soft-ring rounded-2xl border p-3 text-left transition",
                    sourceFilter === option.value
                      ? "border-moss bg-moss text-white"
                      : "border-white/80 bg-white/75 hover:bg-white"
                  ].join(" ")}
                >
                  <span className="block font-black">{option.label}</span>
                  <span className={sourceFilter === option.value ? "text-xs text-white/80" : "text-xs text-ink/60"}>
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="font-black">Джерело</span>
            <select
              value={sourceSite}
              onChange={(event) => changeSourceSite(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3 font-semibold outline-none focus:border-moss"
            >
              <option value="all">Усі джерела</option>
              {(isSpecificExamSet ? examSetSourceSites : sourceSites).map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-black">Рік</span>
            <select
              value={sourceYear}
              onChange={(event) => changeSourceYear(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3 font-semibold outline-none focus:border-moss"
            >
              <option value="all">Усі роки</option>
              {(isSpecificExamSet ? examSetYears : sourceYears).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          {isSpecificExamSet ? (
            <label className="block sm:col-span-2">
              <span className="font-black">Варіант</span>
              <select
                value={selectedExamSet?.id ?? ""}
                onChange={(event) => setExamSetId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3 font-semibold outline-none focus:border-moss"
              >
                {matchingExamSets.length === 0 ? <option value="">Немає доступних варіантів</option> : null}
                {matchingExamSets.map((examSet) => (
                  <option key={examSet.id} value={examSet.id}>
                    {examSet.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {!isSpecificExamSet ? (
            <label className="block">
            <span className="font-black">Тема</span>
            <select
              value={topic}
              onChange={(event) => changeTopic(event.target.value)}
              disabled={mode === "mistakes"}
              className="mt-2 w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3 font-semibold outline-none focus:border-moss"
            >
              <option value="all">Усі теми</option>
              {topics.map((topicName) => (
                <option key={topicName} value={topicName}>
                  {topicName}
                </option>
              ))}
            </select>
          </label>
          ) : null}

          {!isSpecificExamSet ? (
            <label className="block">
            <span className="font-black">Кількість питань</span>
            <input
              type="number"
              min={availableCount > 0 ? 1 : 0}
              max={Math.max(1, availableCount)}
              value={availableCount === 0 ? 0 : Math.min(questionCount, Math.max(1, availableCount))}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              className="mt-2 w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3 font-semibold outline-none focus:border-moss"
            />
          </label>
          ) : null}

          {mode === "exam" ? (
            <label className="block sm:col-span-2">
              <span className="font-black">Тривалість, хвилин</span>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3 font-semibold outline-none focus:border-moss"
              />
            </label>
          ) : null}

          {isSpecificExamSet && selectedExamSet ? (
            <div className="rounded-2xl bg-white/65 p-4 text-sm leading-6 text-ink/70 sm:col-span-2">
              <p className="font-black text-ink">{selectedExamSet.title}</p>
              <p>
                Джерело: {selectedExamSet.sourceSite}
                {selectedExamSet.year ? ` · Рік: ${selectedExamSet.year}` : ""}
                {selectedExamSet.variant ? ` · Варіант: ${selectedExamSet.variant}` : ""}
              </p>
              <p>
                Питань: <strong>{selectedExamSetQuestionCount}</strong> · Завдань зі спільною умовою:{" "}
                <strong>{selectedExamSetGroupedTaskCount}</strong> · Тип:{" "}
                {selectedExamSet.sourceType === "generated" ? "згенероване" : "імпортоване"}
              </p>
            </div>
          ) : null}

          {!isSpecificExamSet && groupedUnitCount > 0 ? (
            <p className="rounded-2xl bg-honey/20 p-4 text-sm font-semibold leading-6 text-ink/70 sm:col-span-2">
              Деякі завдання мають спільну умову та будуть додані разом.
            </p>
          ) : null}

          {mode === "exam" && !isSpecificExamSet ? (
            <p className="rounded-2xl bg-moss/10 p-4 text-sm font-semibold leading-6 text-moss sm:col-span-2">
              Дефолт іспиту: {subject.examQuestionCount ?? subject.recommendedQuestionCount} питань,
              {` ${subject.examDurationMinutes ?? subject.defaultDurationMinutes ?? 30} хв.`}
              {availableCount < (subject.examQuestionCount ?? subject.recommendedQuestionCount)
                ? " У цьому банку поки менше питань, тому тест буде сформовано з доступної кількості."
                : ""}
            </p>
          ) : null}
        </div>
      </section>

      <aside className="study-card h-fit p-6">
        <h2 className="font-display text-3xl font-black">Старт</h2>
        <div className="mt-5 rounded-2xl bg-white/60 p-4">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-moss">Банк предмета</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">Усього питань</dt>
              <dd className="font-black">{sourceCounts.all}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">Імпортовані</dt>
              <dd className="font-black">{sourceCounts.imported}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">Згенеровані</dt>
              <dd className="font-black">{sourceCounts.generated}</dd>
            </div>
          </dl>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">Доступно</dt>
            <dd className="font-black">{isSpecificExamSet ? selectedExamSetQuestionCount : availableCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">У помилках</dt>
            <dd className="font-black">{mistakesCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">Режим</dt>
            <dd className="font-black">{formatMode(mode)}</dd>
          </div>
          {mode === "exam" ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">Тип тесту</dt>
              <dd className="font-black">{isSpecificExamSet ? "Конкретний варіант" : "Випадковий"}</dd>
            </div>
          ) : null}
        </dl>

        {sourceFilterIsEmpty ? (
          <p className="mt-5 rounded-2xl bg-honey/20 p-4 text-sm leading-6 text-ink/70">
            {getSourceFilterEmptyMessage(sourceFilter)}
          </p>
        ) : null}

        {mode === "mistakes" && mistakesCount === 0 && !sourceFilterIsEmpty ? (
          <p className="mt-5 rounded-2xl bg-honey/20 p-4 text-sm leading-6 text-ink/70">
            Тут поки чисто. Спершу пройдіть практику або іспит, і складні питання з’являться
            в цьому режимі.
          </p>
        ) : null}

        {!isSpecificExamSet && !sourceFilterIsEmpty && mode !== "mistakes" && availableCount === 0 ? (
          <p className="mt-5 rounded-2xl bg-honey/20 p-4 text-sm leading-6 text-ink/70">
            Для цієї комбінації теми й джерела питань поки немає.
          </p>
        ) : null}

        {isSpecificExamSet && !selectedExamSet ? (
          <p className="mt-5 rounded-2xl bg-honey/20 p-4 text-sm leading-6 text-ink/70">
            Для обраних фільтрів немає збережених варіантів іспиту.
          </p>
        ) : null}

        <button
          type="button"
          disabled={!canStart}
          onClick={startQuiz}
          className="soft-ring mt-6 w-full rounded-full bg-ink px-6 py-4 font-black text-paper transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-ink/30"
        >
          Почати
        </button>
      </aside>
    </div>
  );
}
