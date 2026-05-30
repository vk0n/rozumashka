import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { ExamSet, Question, QuestionGroup, QuizUnit, SourceType, SubjectId } from "../../src/types";

interface QuestionRecord {
  filePath: string;
  subject: SubjectId;
  originalIndex: number;
  question: Question;
}

interface ManualOverrides {
  groups?: QuestionGroup[];
  examSets?: ExamSet[];
  excludeQuestionIds?: string[];
}

interface ExamSetDraft {
  id: string;
  subject: SubjectId;
  title: string;
  description: string | null;
  sourceType: SourceType;
  sourceSite: string;
  sourceUrl: string | null;
  year: number | string | null;
  variant: string | null;
  tags: string[];
  questionIds: Set<string>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const publicDataDir = path.join(projectRoot, "public", "data");
const questionsDir = path.join(publicDataDir, "questions");
const examSetDataDir = path.join(projectRoot, "data", "exam-sets");
const manualOverridesPath = path.join(examSetDataDir, "manual-group-overrides.json");

const subjectFiles: Record<SubjectId, string> = {
  tznk: "tznk.json",
  english: "english.json",
  management: "management.json",
  "psychology-sociology": "psychology-sociology.json"
};

const subjectTitles: Record<SubjectId, string> = {
  tznk: "ТЗНК",
  english: "Англійська мова",
  management: "Управління та адміністрування",
  "psychology-sociology": "Психологія та соціологія"
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function sourceSiteFromQuestion(question: Question): string | null {
  if (question.sourceType === "generated") {
    return "generated";
  }

  if (!question.sourceUrl) {
    return null;
  }

  try {
    return new URL(question.sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function inferYear(question: Question): number | string | null {
  if (question.sourceType === "generated") {
    return null;
  }

  const candidates = [question.id, question.sourceUrl ?? "", ...(question.tags ?? [])];

  for (const candidate of candidates) {
    const match = candidate.match(/\b(20\d{2})\b/);
    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function sourceUrlOffset(sourceUrl: string | null | undefined): number | null {
  if (!sourceUrl?.includes("zno.osvita.ua")) {
    return null;
  }

  if (sourceUrl.endsWith("/list.html")) {
    return 0;
  }

  const match = sourceUrl.match(/\/all\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

function numericSuffix(id: string): number | null {
  const match = id.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function inferQuestionOrder(question: Question, originalIndex: number): number {
  const suffix = numericSuffix(question.id);

  if (question.sourceUrl?.includes("testportal.gov.ua") && suffix !== null) {
    return suffix;
  }

  const offset = sourceUrlOffset(question.sourceUrl);
  if (offset !== null) {
    return offset * 1000 + (suffix ?? originalIndex + 1);
  }

  return suffix ?? originalIndex + 1;
}

function clearMigrationFields(question: Question): void {
  delete question.groupId;
  delete question.groupOrder;
  delete question.sourceSite;
  delete question.sourceYear;
  delete question.sourceExamSetId;
  delete question.sourceQuestionOrder;
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function loadQuestionRecords(): Promise<QuestionRecord[]> {
  const records: QuestionRecord[] = [];

  for (const [subject, fileName] of Object.entries(subjectFiles) as Array<[SubjectId, string]>) {
    const filePath = path.join(questionsDir, fileName);
    const questions = await readJson<Question[]>(filePath, []);

    questions.forEach((question, originalIndex) => {
      clearMigrationFields(question);
      question.sourceSite = sourceSiteFromQuestion(question);
      question.sourceYear = inferYear(question);
      question.sourceQuestionOrder = inferQuestionOrder(question, originalIndex);

      records.push({
        filePath,
        subject,
        originalIndex,
        question
      });
    });
  }

  return records;
}

function buildAutoGroups(records: QuestionRecord[], excludeQuestionIds: Set<string>): {
  groups: QuestionGroup[];
  ambiguous: string[];
} {
  const buckets = new Map<string, QuestionRecord[]>();

  for (const record of records) {
    const { question } = record;
    const passage = question.passage?.trim();

    if (!passage || passage.length < 80 || excludeQuestionIds.has(question.id)) {
      continue;
    }

    const sourceSite = question.sourceSite ?? "unknown";
    const key = `${question.subject}|${sourceSite}|${normalizeText(passage)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(record);
    buckets.set(key, bucket);
  }

  const groups: QuestionGroup[] = [];
  const ambiguous: string[] = [];
  const usedIds = new Set<string>();

  for (const bucket of [...buckets.values()].filter((items) => items.length > 1)) {
    const sorted = [...bucket].sort((left, right) => {
      const leftOrder = left.question.sourceQuestionOrder ?? left.originalIndex;
      const rightOrder = right.question.sourceQuestionOrder ?? right.originalIndex;
      return leftOrder - rightOrder || left.question.id.localeCompare(right.question.id);
    });
    const first = sorted[0].question;
    const normalizedPassage = normalizeText(first.passage ?? "");
    const idBase = `qg-${first.subject}-${slugify(first.sourceSite ?? "unknown")}-${stableHash(normalizedPassage)}`;
    let id = idBase;
    let suffix = 2;

    while (groups.some((group) => group.id === id)) {
      id = `${idBase}-${suffix}`;
      suffix += 1;
    }

    const sourceUrls = new Set(sorted.map((item) => item.question.sourceUrl ?? null));
    const sourceYears = new Set(sorted.map((item) => item.question.sourceYear ?? null));
    const questionIds = sorted.map((item) => item.question.id);

    if (questionIds.some((questionId) => usedIds.has(questionId))) {
      ambiguous.push(`${id}: skipped duplicate group ownership for ${questionIds.join(", ")}`);
      continue;
    }

    questionIds.forEach((questionId) => usedIds.add(questionId));

    sorted.forEach((item, index) => {
      item.question.groupId = id;
      item.question.groupOrder = index + 1;
    });

    groups.push({
      id,
      subject: first.subject,
      title: null,
      passage: first.passage ?? "",
      questionIds,
      sourceType: first.sourceType,
      sourceUrl: [...sourceUrls][0],
      sourceSite: first.sourceSite ?? null,
      sourceYear: sourceYears.size === 1 ? [...sourceYears][0] : null,
      tags: [
        "auto_grouped",
        "shared_passage",
        ...(sourceUrls.size > 1 ? ["multi_source_url_group"] : [])
      ]
    });
  }

  return { groups, ambiguous };
}

function officialExamSetId(question: Question): string | null {
  if (question.sourceSite !== "testportal.gov.ua" || !question.sourceYear) {
    return null;
  }

  if (question.subject === "management" && question.id.startsWith("management-yefvv-2024-")) {
    return "management-testportal-yefvv-2024";
  }

  if (question.subject === "psychology-sociology" && question.id.startsWith("psych-soc-yefvv-2024-")) {
    return "psych-soc-testportal-yefvv-2024";
  }

  if (question.subject === "tznk" && question.tags?.includes("tznk-demo-2024")) {
    return "tznk-testportal-demo-2024";
  }

  if (question.subject === "english" && question.tags?.includes("english-demo-2023")) {
    return "english-testportal-demo-2023";
  }

  return `${question.subject}-testportal-${question.sourceYear}-${stableHash(question.sourceUrl ?? question.id).slice(0, 6)}`;
}

function znoExamSetId(question: Question): string | null {
  if (question.sourceSite !== "zno.osvita.ua" || !question.sourceUrl) {
    return null;
  }

  const offset = sourceUrlOffset(question.sourceUrl);
  return `${question.subject}-zno-osvita-${offset ?? stableHash(question.sourceUrl).slice(0, 6)}`;
}

function examSetIdForQuestion(question: Question): string | null {
  if (question.sourceType === "generated") {
    return null;
  }

  return officialExamSetId(question) ?? znoExamSetId(question);
}

function examSetTitle(id: string, question: Question): string {
  if (id === "management-testportal-yefvv-2024") {
    return "ЄФВВ 2024: Управління та адміністрування";
  }

  if (id === "psych-soc-testportal-yefvv-2024") {
    return "ЄФВВ 2024: Психологія та соціологія";
  }

  if (id === "tznk-testportal-demo-2024") {
    return "Демонстраційний ЄВІ ТЗНК 2024";
  }

  if (id === "english-testportal-demo-2023") {
    return "Демонстраційний ЄВІ Англійська мова 2023";
  }

  if (question.sourceSite === "zno.osvita.ua") {
    const offset = sourceUrlOffset(question.sourceUrl);
    return `ZNO Освіта: ${subjectTitles[question.subject]}${offset !== null ? `, архів ${offset}` : ""}`;
  }

  return `${subjectTitles[question.subject]}: ${question.sourceSite ?? "джерело"}`;
}

function examSetVariant(id: string, question: Question): string | null {
  if (id.includes("testportal-demo")) {
    return "Демонстраційний варіант";
  }

  if (id.includes("testportal-yefvv")) {
    return "Офіційна добірка";
  }

  if (question.sourceSite === "zno.osvita.ua") {
    const offset = sourceUrlOffset(question.sourceUrl);
    return offset === null ? "Архівна сторінка" : `Архівна сторінка ${offset}`;
  }

  return null;
}

function getOrCreateExamDraft(drafts: Map<string, ExamSetDraft>, id: string, question: Question): ExamSetDraft {
  const existing = drafts.get(id);
  if (existing) {
    return existing;
  }

  const draft: ExamSetDraft = {
    id,
    subject: question.subject,
    title: examSetTitle(id, question),
    description:
      question.sourceSite === "zno.osvita.ua"
        ? "Консервативно створений набір із архівної сторінки ZNO Освіта. Рік не вказано, бо його не можна надійно визначити з поточних даних."
        : null,
    sourceType: question.sourceType,
    sourceSite: question.sourceSite ?? "unknown",
    sourceUrl: question.sourceUrl ?? null,
    year: question.sourceSite === "zno.osvita.ua" ? null : question.sourceYear ?? null,
    variant: examSetVariant(id, question),
    tags: [
      "auto_exam_set",
      ...(question.sourceSite === "zno.osvita.ua" ? ["zno_osvita_archive"] : []),
      ...(question.sourceSite === "testportal.gov.ua" ? ["testportal"] : [])
    ],
    questionIds: new Set<string>()
  };

  drafts.set(id, draft);
  return draft;
}

function buildExamSets(records: QuestionRecord[], groups: QuestionGroup[]): ExamSet[] {
  const groupByQuestionId = new Map<string, QuestionGroup>();
  const groupPrimaryExamSetId = new Map<string, string>();
  const drafts = new Map<string, ExamSetDraft>();

  for (const group of groups) {
    for (const questionId of group.questionIds) {
      groupByQuestionId.set(questionId, group);
    }
  }

  for (const group of groups) {
    const groupRecords = group.questionIds
      .map((questionId) => records.find((record) => record.question.id === questionId))
      .filter(Boolean) as QuestionRecord[];
    const firstQuestion = groupRecords[0]?.question;

    if (!firstQuestion) {
      continue;
    }

    const setId = examSetIdForQuestion(firstQuestion);
    if (setId) {
      groupPrimaryExamSetId.set(group.id, setId);
    }
  }

  for (const record of records) {
    const { question } = record;
    const group = groupByQuestionId.get(question.id);
    const examSetId = group ? groupPrimaryExamSetId.get(group.id) : examSetIdForQuestion(question);

    if (!examSetId) {
      continue;
    }

    question.sourceExamSetId = examSetId;
    const draft = getOrCreateExamDraft(drafts, examSetId, question);
    draft.questionIds.add(question.id);
  }

  return [...drafts.values()]
    .map((draft) => {
      const draftRecords = records
        .filter((record) => draft.questionIds.has(record.question.id))
        .sort((left, right) => {
          const leftOrder = left.question.sourceQuestionOrder ?? left.originalIndex;
          const rightOrder = right.question.sourceQuestionOrder ?? right.originalIndex;
          return leftOrder - rightOrder || left.question.id.localeCompare(right.question.id);
        });
      const units: QuizUnit[] = [];
      const addedGroups = new Set<string>();
      const addedQuestions = new Set<string>();

      for (const record of draftRecords) {
        const group = groupByQuestionId.get(record.question.id);

        if (group) {
          if (!addedGroups.has(group.id)) {
            units.push({ type: "group", groupId: group.id });
            addedGroups.add(group.id);
            group.questionIds.forEach((questionId) => addedQuestions.add(questionId));
          }
          continue;
        }

        if (!addedQuestions.has(record.question.id)) {
          units.push({ type: "question", questionId: record.question.id });
          addedQuestions.add(record.question.id);
        }
      }

      return {
        id: draft.id,
        subject: draft.subject,
        title: draft.title,
        description: draft.description,
        sourceType: draft.sourceType,
        sourceSite: draft.sourceSite,
        sourceUrl: draft.sourceUrl,
        year: draft.year,
        variant: draft.variant,
        tags: draft.tags,
        units
      };
    })
    .filter((examSet) => examSet.units.length > 0)
    .sort((left, right) => left.subject.localeCompare(right.subject) || left.title.localeCompare(right.title));
}

function applyManualGroups(groups: QuestionGroup[], overrides: ManualOverrides): QuestionGroup[] {
  const groupMap = new Map(groups.map((group) => [group.id, group]));

  for (const group of overrides.groups ?? []) {
    groupMap.set(group.id, group);
  }

  return [...groupMap.values()].sort(
    (left, right) => left.subject.localeCompare(right.subject) || left.id.localeCompare(right.id)
  );
}

function applyManualExamSets(examSets: ExamSet[], overrides: ManualOverrides): ExamSet[] {
  const examSetMap = new Map(examSets.map((examSet) => [examSet.id, examSet]));

  for (const examSet of overrides.examSets ?? []) {
    examSetMap.set(examSet.id, examSet);
  }

  return [...examSetMap.values()].sort(
    (left, right) => left.subject.localeCompare(right.subject) || left.title.localeCompare(right.title)
  );
}

function applyGroupFields(records: QuestionRecord[], groups: QuestionGroup[]): void {
  const questionsById = new Map(records.map((record) => [record.question.id, record.question]));

  for (const record of records) {
    delete record.question.groupId;
    delete record.question.groupOrder;
  }

  for (const group of groups) {
    group.questionIds.forEach((questionId, index) => {
      const question = questionsById.get(questionId);

      if (!question) {
        return;
      }

      question.groupId = group.id;
      question.groupOrder = index + 1;
    });
  }
}

async function writeQuestionFiles(records: QuestionRecord[]): Promise<void> {
  const byFile = new Map<string, Question[]>();

  for (const record of records) {
    const questions = byFile.get(record.filePath) ?? [];
    questions[record.originalIndex] = record.question;
    byFile.set(record.filePath, questions);
  }

  for (const [filePath, questions] of byFile.entries()) {
    await writeJson(filePath, questions);
  }
}

function buildReport(records: QuestionRecord[], groups: QuestionGroup[], examSets: ExamSet[], ambiguous: string[]): string {
  const groupedQuestionIds = new Set(groups.flatMap((group) => group.questionIds));
  const groupsBySubject = new Map<SubjectId, number>();
  const groupedBySubject = new Map<SubjectId, number>();
  const standaloneBySubject = new Map<SubjectId, number>();
  const examSetsBySite = new Map<string, number>();
  const examSetsByYear = new Map<string, number>();
  const unmappedSourceUrls = new Set<string>();

  for (const group of groups) {
    groupsBySubject.set(group.subject, (groupsBySubject.get(group.subject) ?? 0) + 1);
    groupedBySubject.set(group.subject, (groupedBySubject.get(group.subject) ?? 0) + group.questionIds.length);
  }

  for (const record of records) {
    if (!groupedQuestionIds.has(record.question.id)) {
      standaloneBySubject.set(record.subject, (standaloneBySubject.get(record.subject) ?? 0) + 1);
    }

    if (record.question.sourceUrl && !record.question.sourceExamSetId && record.question.sourceType !== "generated") {
      unmappedSourceUrls.add(record.question.sourceUrl);
    }
  }

  for (const examSet of examSets) {
    examSetsBySite.set(examSet.sourceSite, (examSetsBySite.get(examSet.sourceSite) ?? 0) + 1);
    examSetsByYear.set(String(examSet.year ?? "unknown"), (examSetsByYear.get(String(examSet.year ?? "unknown")) ?? 0) + 1);
  }

  const subjectLine = (map: Map<SubjectId, number>) =>
    (Object.keys(subjectFiles) as SubjectId[])
      .map((subject) => `- ${subjectTitles[subject]}: ${map.get(subject) ?? 0}`)
      .join("\n");

  return `# Exam Set Migration Report

Generated on 2026-05-30.

## Groups Created By Subject

${subjectLine(groupsBySubject)}

## Grouped Question Count By Subject

${subjectLine(groupedBySubject)}

## Standalone Questions Remaining

${subjectLine(standaloneBySubject)}

## Exam Sets Created By Source Site

${[...examSetsBySite.entries()].sort().map(([site, count]) => `- ${site}: ${count}`).join("\n") || "- None"}

## Exam Sets Created By Year

${[...examSetsByYear.entries()].sort().map(([year, count]) => `- ${year}: ${count}`).join("\n") || "- None"}

## Ambiguous Cases

${ambiguous.length ? ambiguous.map((item) => `- ${item}`).join("\n") : "- None skipped during automatic grouping."}

## Source URLs That Could Not Be Mapped

${unmappedSourceUrls.size ? [...unmappedSourceUrls].sort().map((url) => `- ${url}`).join("\n") : "- None for imported non-generated questions."}

## Recommended Manual Overrides

- Add year/variant mappings for ZNO Освіта archive pages if a reliable source is identified.
- Add manual groups only for near-identical passages after visual inspection.
- Use \`excludeQuestionIds\` for any question that should remain standalone despite sharing an identical passage.
`;
}

async function main(): Promise<void> {
  const overrides = await readJson<ManualOverrides>(manualOverridesPath, {
    groups: [],
    examSets: [],
    excludeQuestionIds: []
  });
  const records = await loadQuestionRecords();
  const excludeQuestionIds = new Set(overrides.excludeQuestionIds ?? []);
  const { groups: autoGroups, ambiguous } = buildAutoGroups(records, excludeQuestionIds);
  const groups = applyManualGroups(autoGroups, overrides);

  applyGroupFields(records, groups);

  const autoExamSets = buildExamSets(records, groups);
  const examSets = applyManualExamSets(autoExamSets, overrides);

  await writeQuestionFiles(records);
  await writeJson(path.join(publicDataDir, "question-groups.json"), groups);
  await writeJson(path.join(publicDataDir, "exam-sets.json"), examSets);
  await fs.writeFile(
    path.join(examSetDataDir, "exam-set-migration-report.md"),
    buildReport(records, groups, examSets, ambiguous),
    "utf8"
  );

  console.log(`Created ${groups.length} question group(s).`);
  console.log(`Created ${examSets.length} exam set(s).`);
  console.log("Wrote public/data/question-groups.json and public/data/exam-sets.json.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
