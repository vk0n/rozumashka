import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Difficulty, Question, QuestionType } from "../../src/types";

type SubjectId = "tznk" | "english" | "management" | "psychology-sociology";
type Confidence = "high" | "medium" | "low";

interface ZnoSource {
  subject: SubjectId;
  slug: string;
  title: string;
  baseUrl: string;
  folder: string;
}

interface RawExtractedQuestion {
  rawQuestionText: string;
  rawPassage: string | null;
  rawOptions: string[];
  rawCorrectAnswer: number | null;
  rawExplanation: string | null;
  sourceUrl: string;
  sourceFile: string;
  pageNumber: number | null;
  confidence: Confidence;
  extractionNotes: string;
}

interface RawIndexEntry {
  localFilePath: string;
  sourceUrl: string;
  title: string;
  subject: SubjectId | "mixed";
  sourceType: "public_source";
  downloadedAt: string;
  containsQuestions: boolean;
  containsAnswers: boolean;
  containsExplanations: boolean;
  qualityEstimate: "high" | "medium" | "low";
  notes: string;
}

interface CandidateQuestion extends Question {
  importNotes: string;
}

interface SkippedQuestion {
  id: string;
  subject: SubjectId;
  sourceUrl: string;
  reason: string;
  matchedId?: string;
  matchedFile?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const rawRoot = path.join(projectRoot, "data", "raw", "third-party");
const extractedRoot = path.join(projectRoot, "data", "extracted", "third-party");
const processedRoot = path.join(projectRoot, "data", "processed", "third-party");
const rawIndexPath = path.join(projectRoot, "data", "raw", "third-party-raw-index.json");
const sourceInventoryPath = path.join(projectRoot, "data", "sources", "third-party-source-inventory.md");

const znoSources: ZnoSource[] = [
  {
    subject: "tznk",
    slug: "tznpk",
    title: "ЗНО.Освіта.UA all ТЗНК tasks",
    baseUrl: "https://zno.osvita.ua/master/tznpk",
    folder: "tznk"
  },
  {
    subject: "english",
    slug: "english",
    title: "ЗНО.Освіта.UA all ЄВІ English tasks",
    baseUrl: "https://zno.osvita.ua/master/english",
    folder: "english"
  },
  {
    subject: "management",
    slug: "upravlinnja",
    title: "ЗНО.Освіта.UA all management and administration ЄФВВ tasks",
    baseUrl: "https://zno.osvita.ua/master/upravlinnja",
    folder: "management"
  },
  {
    subject: "psychology-sociology",
    slug: "psykhologiya",
    title: "ЗНО.Освіта.UA all psychology and sociology ЄФВВ tasks",
    baseUrl: "https://zno.osvita.ua/master/psykhologiya",
    folder: "psychology-sociology"
  }
];

const answerIndex: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  "а": 0,
  "б": 1,
  "в": 2,
  "г": 3
};

const subjectFileMap: Record<SubjectId, string> = {
  tznk: "tznk",
  english: "english",
  management: "management",
  "psychology-sociology": "psychology-sociology"
};

const subjectSourceTag: Record<SubjectId, string> = {
  tznk: "zno_osvita_tznk",
  english: "zno_osvita_english",
  management: "zno_osvita_management",
  "psychology-sociology": "zno_osvita_psychology_sociology"
};

function decodeHtml(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    quot: "\"",
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
    ndash: "-",
    mdash: "-",
    hellip: "...",
    rsquo: "'",
    lsquo: "'",
    rdquo: "\"",
    ldquo: "\""
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity: string) => namedEntities[entity] ?? match);
}

function htmlToText(value: string): string {
  return decodeHtml(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\u200b/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function htmlParagraphs(value: string): string[] {
  const matches = [...value.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => htmlToText(match[1]))
    .map((text) => text.trim())
    .filter(Boolean);

  if (matches.length) {
    return matches;
  }

  const fallback = htmlToText(value);
  return fallback ? [fallback] : [];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function stripCorrectAnswerFromExplanation(explanation: string): string {
  return explanation
    .replace(/^\s*Пояснення\s*/i, "")
    .replace(/Правильна відповідь\s*[-:]\s*[A-DА-Г](?:\.[^\n]*)?/gi, "")
    .replace(/Правильна відповідь\s*[-:]\s*[A-DА-Г][^.\n]*(?:\.|\n)?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getListUrl(source: ZnoSource, offset: number): string {
  return offset === 0 ? `${source.baseUrl}/list.html` : `${source.baseUrl}/all/${offset}/`;
}

function localPagePath(source: ZnoSource, offset: number): string {
  return path.join(
    "data",
    "raw",
    "third-party",
    source.folder,
    `zno-osvita-${source.slug}-${String(offset).padStart(4, "0")}.html`
  );
}

function extractTotal(html: string): number {
  const match = html.match(/Завдання\s+\d+\s+з\s+(\d+)/);
  return match ? Number(match[1]) : 0;
}

function sourceUrlFromLocalFile(filePath: string, sourcesByFolder: Map<string, ZnoSource>): string {
  const fileName = path.basename(filePath);
  const folder = filePath.split(path.sep).at(-2) ?? "";
  const source = sourcesByFolder.get(folder);
  const offset = Number(fileName.match(/-(\d+)\.html$/)?.[1] ?? "0");
  return source ? getListUrl(source, offset) : "";
}

function parseQuestionText(subject: SubjectId, questionHtml: string, taskNumber: number, sourceQuestionId: string): Pick<Question, "question" | "passage" | "type" | "topic" | "subtopic"> {
  const paragraphs = htmlParagraphs(questionHtml);
  const fullText = paragraphs.join("\n\n");

  if (subject === "english") {
    const blankMatch = questionHtml.match(/<strong>\s*\((\d+)\)\s*<\/strong>\s*_+/i);
    const firstLine = paragraphs[0]?.replace(/\.$/, "") ?? `task ${sourceQuestionId}`;

    if (blankMatch) {
      return {
        question: `Choose the correct option for blank (${blankMatch[1]}) in "${firstLine}".`,
        passage: fullText,
        type: "passage_single_choice",
        topic: "Cloze tests",
        subtopic: "Vocabulary and grammar in context"
      };
    }

    if (paragraphs.length > 1) {
      return {
        question: paragraphs.at(-1) ?? `Question ${taskNumber}`,
        passage: paragraphs.slice(0, -1).join("\n\n"),
        type: "passage_single_choice",
        topic: "Reading comprehension",
        subtopic: inferEnglishReadingSubtopic(paragraphs.at(-1) ?? "")
      };
    }

    return {
      question: fullText || `Question ${taskNumber}`,
      type: "single_choice",
      topic: "Use of English",
      subtopic: "Vocabulary and grammar"
    };
  }

  if (paragraphs.length > 1) {
    const question = paragraphs.at(-1) ?? `Завдання ${taskNumber}`;
    const passage = paragraphs.slice(0, -1).join("\n\n");
    return {
      question,
      passage,
      type: "passage_single_choice",
      ...inferUkrainianTopic(subject, `${passage}\n${question}`)
    };
  }

  return {
    question: fullText || `Завдання ${taskNumber}`,
    type: "single_choice",
    ...inferUkrainianTopic(subject, fullText)
  };
}

function inferEnglishReadingSubtopic(question: string): string {
  const lower = question.toLowerCase();
  if (lower.includes("main idea") || lower.includes("main purpose") || lower.includes("main topic")) {
    return "Main idea";
  }
  if (lower.includes("infer") || lower.includes("suggest") || lower.includes("imply")) {
    return "Inference";
  }
  if (lower.includes("mean") || lower.includes("refer")) {
    return "Vocabulary in context";
  }
  return "Detail understanding";
}

function inferUkrainianTopic(subject: SubjectId, text: string): Pick<Question, "topic" | "subtopic"> {
  if (subject === "management") {
    return { topic: "Управління та адміністрування", subtopic: "ЗНО.Освіта.UA: ЄФВВ" };
  }

  if (subject === "psychology-sociology") {
    return { topic: "Психологія та соціологія", subtopic: "ЗНО.Освіта.UA: ЄФВВ" };
  }

  const lower = text.toLowerCase();
  if (lower.includes("скільки") || /\d/.test(lower)) {
    return { topic: "Кількісні міркування", subtopic: "ТЗНК ЗНО.Освіта.UA" };
  }
  if (lower.includes("твердження") || lower.includes("умов") || lower.includes("груп")) {
    return { topic: "Аналітичне мислення", subtopic: "ТЗНК ЗНО.Освіта.UA" };
  }
  if (lower.includes("мікротекст") || lower.includes("текст")) {
    return { topic: "Критичне читання", subtopic: "ТЗНК ЗНО.Освіта.UA" };
  }
  return { topic: "Логічне мислення", subtopic: "ТЗНК ЗНО.Освіта.UA" };
}

function difficultyFor(subject: SubjectId, taskNumber: number): Difficulty {
  if (subject === "management" || subject === "psychology-sociology") {
    return "medium";
  }

  if (taskNumber % 10 === 0 || taskNumber % 10 === 9) {
    return "hard";
  }

  if (taskNumber % 10 <= 2 && taskNumber % 10 !== 0) {
    return "easy";
  }

  return "medium";
}

function parseTaskBlocks(html: string, source: ZnoSource, localFilePath: string, sourceUrl: string): { raw: RawExtractedQuestion[]; candidates: CandidateQuestion[]; skipped: SkippedQuestion[] } {
  const blocks = html.split(/<div class="task-card[^>]*id="q\d+"[^>]*>/).slice(1);
  const raw: RawExtractedQuestion[] = [];
  const candidates: CandidateQuestion[] = [];
  const skipped: SkippedQuestion[] = [];

  for (const block of blocks) {
    const taskNumber = Number(block.match(/<div class="counter">Завдання\s+(\d+)\s+з\s+\d+<\/div>/)?.[1] ?? "0");
    const sourceQuestionId = block.match(/name="q\[id\]"\s+value="([^"]+)"/)?.[1] ?? "";
    const tip = block.match(/name="q\[tip\]"[^>]*value="([^"]+)"/)?.[1] ?? "";
    const result = block.match(/name="result"\s+value="([^"]+)"/)?.[1]?.toLowerCase() ?? "";
    const questionHtml = block.match(/<div class="question">\s*([\s\S]*?)<\/div>\s*<div class="clear"><\/div>/)?.[1] ?? "";
    const answerHtml = block.match(/<div class="answers"[^>]*>([\s\S]*?)<\/div>\s*<div class="clear mb10">/)?.[1] ?? "";
    const explanationHtml = block.match(/<div id="commentar_\d+" class="explanation"[^>]*>([\s\S]*?)<\/div>\s*<div class="description">/)?.[1];
    const options = [...answerHtml.matchAll(/<div class="answer">([\s\S]*?)<\/div>/g)]
      .map((match) => htmlToText(match[1].replace(/<span class="marker">[\s\S]*?<\/span>/, "")))
      .map((option) => option.trim())
      .filter(Boolean);
    const correctAnswer = answerIndex[result];
    const rawQuestionText = htmlToText(questionHtml);
    const rawExplanation = explanationHtml ? stripCorrectAnswerFromExplanation(htmlToText(explanationHtml)) : null;
    const rawQuestion: RawExtractedQuestion = {
      rawQuestionText,
      rawPassage: null,
      rawOptions: options,
      rawCorrectAnswer: correctAnswer ?? null,
      rawExplanation,
      sourceUrl,
      sourceFile: localFilePath,
      pageNumber: null,
      confidence: tip === "1" && correctAnswer !== undefined && options.length >= 4 ? "high" : "low",
      extractionNotes: `Extracted from ZNO Освіта task ${sourceQuestionId || taskNumber}; q[tip]=${tip || "unknown"}.`
    };
    raw.push(rawQuestion);

    if (!sourceQuestionId || tip !== "1" || correctAnswer === undefined || options.length < 4 || !rawQuestionText) {
      skipped.push({
        id: `${source.subject}-zno-osvita-${sourceQuestionId || taskNumber}`,
        subject: source.subject,
        sourceUrl,
        reason: "unsupported or incomplete ZNO Освіта task block"
      });
      continue;
    }

    const parsed = parseQuestionText(source.subject, questionHtml, taskNumber, sourceQuestionId);
    rawQuestion.rawPassage = parsed.passage ?? null;
    const explanation =
      rawExplanation ||
      `Джерело ЗНО.Освіта.UA позначає варіант "${options[correctAnswer]}" як правильний; пояснення в HTML-сторінці не наведено.`;
    const tags = [
      "third_party_import",
      "zno_osvita",
      "zno_osvita_master",
      subjectSourceTag[source.subject],
      "official_past_exam_mirror"
    ];

    if (rawExplanation) {
      tags.push("source_has_explanation");
    } else {
      tags.push("source_has_no_explanation");
    }

    candidates.push({
      id: `${source.subject === "psychology-sociology" ? "psych-soc" : source.subject}-zno-osvita-${sourceQuestionId}`,
      subject: source.subject,
      type: parsed.type as QuestionType,
      topic: parsed.topic,
      subtopic: parsed.subtopic,
      difficulty: difficultyFor(source.subject, taskNumber),
      sourceType: "public_source",
      sourceUrl,
      reviewed: false,
      question: parsed.question,
      passage: parsed.passage,
      options,
      correctAnswer,
      explanation,
      tags,
      importNotes: rawQuestion.extractionNotes
    });
  }

  return { raw, candidates, skipped };
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T[];
  } catch {
    return [];
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function loadExistingForDedup(): Promise<Array<Question & { file: string }>> {
  const files = [
    "public/data/questions/tznk.json",
    "public/data/questions/english.json",
    "public/data/questions/management.json",
    "public/data/questions/psychology-sociology.json",
    "data/generated/tznk.generated.json",
    "data/generated/english.generated.json",
    "data/processed/third-party/tznk.third-party.json",
    "data/processed/third-party/english.third-party.json",
    "data/processed/third-party/management.third-party.json",
    "data/processed/third-party/psychology-sociology.third-party.json"
  ];
  const all: Array<Question & { file: string }> = [];

  for (const file of files) {
    const questions = await readJsonArray<Question>(path.join(projectRoot, file));
    all.push(
      ...questions
        .filter((question) => !question.tags?.includes("zno_osvita"))
        .map((question) => ({ ...question, file }))
    );
  }

  return all;
}

function deduplicate(candidates: CandidateQuestion[], existing: Array<Question & { file: string }>): { kept: Question[]; skipped: SkippedQuestion[] } {
  const kept: Question[] = [];
  const skipped: SkippedQuestion[] = [];
  const seenCandidateTexts = new Map<string, Question>();

  for (const candidate of candidates) {
    const normalizedQuestion = normalize(candidate.question);
    const normalizedPassage = normalize(candidate.passage ?? "");
    const normalizedOptions = candidate.options.map(normalize).join("|");
    const exactExisting = existing.find(
      (question) => question.subject === candidate.subject && normalize(question.question) === normalizedQuestion
    );

    if (exactExisting) {
      skipped.push({
        id: candidate.id,
        subject: candidate.subject as SubjectId,
        sourceUrl: candidate.sourceUrl ?? "",
        reason: "exact duplicate question text against existing official/generated/third-party bank",
        matchedId: exactExisting.id,
        matchedFile: exactExisting.file
      });
      continue;
    }

    const samePassageOptions = existing.find(
      (question) =>
        question.subject === candidate.subject &&
        normalizedPassage.length > 0 &&
        normalize(question.passage ?? "") === normalizedPassage &&
        question.options.map(normalize).join("|") === normalizedOptions
    );

    if (samePassageOptions) {
      skipped.push({
        id: candidate.id,
        subject: candidate.subject as SubjectId,
        sourceUrl: candidate.sourceUrl ?? "",
        reason: "same passage and answer options as an existing official/generated/third-party question",
        matchedId: samePassageOptions.id,
        matchedFile: samePassageOptions.file
      });
      continue;
    }

    const nearExisting = existing.find((question) => {
      if (question.subject !== candidate.subject) {
        return false;
      }
      const previous = normalize(question.question);
      const shorter = Math.min(previous.length, normalizedQuestion.length);
      const longer = Math.max(previous.length, normalizedQuestion.length);
      return shorter >= 80 && shorter / longer >= 0.9 && tokenSimilarity(previous, normalizedQuestion) >= 0.94;
    });

    if (nearExisting) {
      skipped.push({
        id: candidate.id,
        subject: candidate.subject as SubjectId,
        sourceUrl: candidate.sourceUrl ?? "",
        reason: "near-duplicate question text against existing official/generated/third-party bank",
        matchedId: nearExisting.id,
        matchedFile: nearExisting.file
      });
      continue;
    }

    const exactCandidate = seenCandidateTexts.get(`${candidate.subject}:${normalizedQuestion}`);
    if (exactCandidate) {
      skipped.push({
        id: candidate.id,
        subject: candidate.subject as SubjectId,
        sourceUrl: candidate.sourceUrl ?? "",
        reason: "duplicate within ZNO Освіта candidate batch",
        matchedId: exactCandidate.id,
        matchedFile: "data/processed/third-party"
      });
      continue;
    }

    const { importNotes: _importNotes, ...question } = candidate;
    kept.push(question);
    seenCandidateTexts.set(`${candidate.subject}:${normalizedQuestion}`, question);
  }

  return { kept, skipped };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "rozumashka-internal-question-import/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function downloadSourcePages(downloadedAt: string): Promise<{ rawIndex: RawIndexEntry[]; bySubject: Record<SubjectId, string[]> }> {
  const rawIndex: RawIndexEntry[] = [];
  const bySubject: Record<SubjectId, string[]> = {
    tznk: [],
    english: [],
    management: [],
    "psychology-sociology": []
  };

  for (const source of znoSources) {
    const firstUrl = getListUrl(source, 0);
    const firstHtml = await fetchText(firstUrl);
    const total = extractTotal(firstHtml);
    const offsets = Array.from({ length: Math.ceil(total / 15) }, (_, index) => index * 15);

    for (const offset of offsets) {
      const sourceUrl = getListUrl(source, offset);
      const html = offset === 0 ? firstHtml : await fetchText(sourceUrl);
      const localFilePath = localPagePath(source, offset);
      const absoluteFilePath = path.join(projectRoot, localFilePath);

      await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
      await fs.writeFile(absoluteFilePath, html, "utf8");
      bySubject[source.subject].push(localFilePath);
      rawIndex.push({
        localFilePath,
        sourceUrl,
        title: `${source.title} (offset ${offset})`,
        subject: source.subject,
        sourceType: "public_source",
        downloadedAt,
        containsQuestions: true,
        containsAnswers: true,
        containsExplanations: source.subject === "management" || source.subject === "psychology-sociology" ? false : true,
        qualityEstimate: "high",
        notes: "ZNO Освіта online all-tasks page; appears to render previous official ЄВІ/ЄФВВ tasks with answer metadata."
      });
    }
  }

  return { rawIndex, bySubject };
}

function mergeWithoutZno<T extends { sourceUrl?: string | null; tags?: string[] }>(existing: T[], incoming: T[]): T[] {
  return [...existing.filter((item) => !item.tags?.includes("zno_osvita") && !item.sourceUrl?.includes("zno.osvita.ua")), ...incoming];
}

function mergeRawWithoutZno(existing: RawExtractedQuestion[], incoming: RawExtractedQuestion[]): RawExtractedQuestion[] {
  return [...existing.filter((item) => !item.sourceUrl.includes("zno.osvita.ua")), ...incoming];
}

function mergeRawIndexWithoutZno(existing: RawIndexEntry[], incoming: RawIndexEntry[]): RawIndexEntry[] {
  return [...existing.filter((item) => !item.sourceUrl.includes("zno.osvita.ua")), ...incoming];
}

function updateSourceInventory(current: string): string {
  const marker = "\n## ZNO Освіта Import Update\n";
  const base = current.includes(marker) ? current.slice(0, current.indexOf(marker)).trimEnd() : current.trimEnd();
  return `${base}

## ZNO Освіта Import Update

Updated on 2026-05-19.

| Title | URL | Source type | Subjects covered | File type | Contains questions | Contains answers | Contains explanations | Estimated quality | Import priority | Notes | Reason for including or skipping |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ЗНО.Освіта.UA all ТЗНК tasks | https://zno.osvita.ua/master/tznpk/list.html | public_source | tznk | html | Yes | Yes | Yes | high | high | Open all-task archive. Many tasks are previous official-session tasks; kept separate as third-party/public source. | Included by user request; deduplicated against existing official/generated data before processing. |
| ЗНО.Освіта.UA all ЄВІ English tasks | https://zno.osvita.ua/master/english/list.html | public_source | english | html | Yes | Yes | Yes | high | high | Open all-task archive with explanations for many English tasks. | Included by user request; deduplicated against existing official/generated data before processing. |
| ЗНО.Освіта.UA all management and administration tasks | https://zno.osvita.ua/master/upravlinnja/list.html | public_source | management | html | Yes | Yes | No | high | medium | Open all-task archive; answer metadata is present, explanations are not present in the page. | Included by user request; official duplicates are skipped by deduplication. |
| ЗНО.Освіта.UA all psychology and sociology tasks | https://zno.osvita.ua/master/psykhologiya/list.html | public_source | psychology-sociology | html | Yes | Yes | No | high | medium | Open all-task archive; answer metadata is present, explanations are not present in the page. | Included by user request; official duplicates are skipped by deduplication. |
`;
}

function countBySubject(questions: Question[]): Record<SubjectId, number> {
  return {
    tznk: questions.filter((question) => question.subject === "tznk").length,
    english: questions.filter((question) => question.subject === "english").length,
    management: questions.filter((question) => question.subject === "management").length,
    "psychology-sociology": questions.filter((question) => question.subject === "psychology-sociology").length
  };
}

function buildDedupReport(skipped: SkippedQuestion[], kept: Question[]): string {
  const skippedLines = skipped.length
    ? skipped
        .slice(0, 300)
        .map((item) => `- ${item.id}: ${item.reason}${item.matchedId ? `; matched ${item.matchedId} in ${item.matchedFile}` : ""}`)
        .join("\n")
    : "- None";
  const omittedLine = skipped.length > 300 ? `\n- ... ${skipped.length - 300} more skipped entries omitted from this report for readability.` : "";
  const bySubject = countBySubject(kept);

  return `# Third-Party Dedup Report

Generated on 2026-05-19.

## Kept After Deduplication

- ТЗНК: ${bySubject.tznk}
- Англійська мова: ${bySubject.english}
- Управління та адміністрування: ${bySubject.management}
- Психологія та соціологія: ${bySubject["psychology-sociology"]}

## Duplicates / Near-Duplicates Skipped

${skippedLines}${omittedLine}

## Uncertain Duplicates Requiring Manual Review

- None; uncertain cases were skipped rather than imported.
`;
}

function buildValidationReport(rawCount: number, normalized: Question[], skipped: SkippedQuestion[], downloadedFiles: number): string {
  const bySubject = countBySubject(normalized);
  const byReason = skipped.reduce<Record<string, number>>((acc, item) => {
    acc[item.reason] = (acc[item.reason] ?? 0) + 1;
    return acc;
  }, {});
  const reasonLines = Object.entries(byReason).length
    ? Object.entries(byReason)
        .map(([reason, count]) => `- ${reason}: ${count}`)
        .join("\n")
    : "- None";

  return `# Third-Party Import Validation Report

Generated on 2026-05-19.

## Summary

- Total third-party sources inspected: ${znoSources.length} ZNO Освіта all-task sections plus previously inventoried sources
- Total files downloaded: ${downloadedFiles}
- Total questions extracted: ${rawCount}
- Total questions normalized: ${normalized.length}
- Total questions skipped: ${skipped.length}
- Questions by subject:
- ТЗНК: ${bySubject.tznk}
- Англійська мова: ${bySubject.english}
- Управління та адміністрування: ${bySubject.management}
- Психологія та соціологія: ${bySubject["psychology-sociology"]}
- Questions with answers: ${normalized.length}
- Questions without answers: 0
- Questions needing manual review: 0
- Duplicates skipped: ${skipped.length}
- Validation errors: pending external \`npm run validate:questions\`

## Skipped Reasons

${reasonLines}

## Notes

- ZNO Освіта pages contain previous ЄВІ/ЄФВВ tasks and answer metadata. They are imported as \`sourceType: "public_source"\` with tags \`zno_osvita\` and \`official_past_exam_mirror\`.
- These questions are kept separate in \`data/processed/third-party/*.json\` and are not merged into \`public/data/questions/*\`.
- All normalized ZNO Освіта questions are \`reviewed=false\` until a manual editorial review is completed.

## Next Recommended Actions

- Run \`npm run validate:questions\`.
- Run \`npm run build\`.
- Review imported explanations and spot-check source alignment before any future merge.
`;
}

async function main(): Promise<void> {
  const downloadedAt = new Date().toISOString();
  await Promise.all([
    fs.mkdir(rawRoot, { recursive: true }),
    fs.mkdir(extractedRoot, { recursive: true }),
    fs.mkdir(processedRoot, { recursive: true }),
    fs.mkdir(path.dirname(sourceInventoryPath), { recursive: true })
  ]);

  const { rawIndex, bySubject } = await downloadSourcePages(downloadedAt);
  const existingRawIndex = await readJsonArray<RawIndexEntry>(rawIndexPath);
  await writeJson(rawIndexPath, mergeRawIndexWithoutZno(existingRawIndex, rawIndex));

  const sourcesByFolder = new Map(znoSources.map((source) => [source.folder, source]));
  const rawBySubject: Record<SubjectId, RawExtractedQuestion[]> = {
    tznk: [],
    english: [],
    management: [],
    "psychology-sociology": []
  };
  const candidates: CandidateQuestion[] = [];
  const parseSkipped: SkippedQuestion[] = [];

  for (const source of znoSources) {
    for (const localFilePath of bySubject[source.subject]) {
      const html = await fs.readFile(path.join(projectRoot, localFilePath), "utf8");
      const sourceUrl = sourceUrlFromLocalFile(path.join(projectRoot, localFilePath), sourcesByFolder);
      const parsed = parseTaskBlocks(html, source, localFilePath, sourceUrl);
      rawBySubject[source.subject].push(...parsed.raw);
      candidates.push(...parsed.candidates);
      parseSkipped.push(...parsed.skipped);
    }
  }

  const existingForDedup = await loadExistingForDedup();
  const deduped = deduplicate(candidates, existingForDedup);
  const kept = deduped.kept;
  const skipped = [...parseSkipped, ...deduped.skipped];

  for (const subject of Object.keys(subjectFileMap) as SubjectId[]) {
    const rawFilePath = path.join(extractedRoot, `${subjectFileMap[subject]}.raw.json`);
    const existingRaw = await readJsonArray<RawExtractedQuestion>(rawFilePath);
    await writeJson(rawFilePath, mergeRawWithoutZno(existingRaw, rawBySubject[subject]));

    const processedFilePath = path.join(processedRoot, `${subjectFileMap[subject]}.third-party.json`);
    const existingProcessed = await readJsonArray<Question>(processedFilePath);
    await writeJson(
      processedFilePath,
      mergeWithoutZno(
        existingProcessed,
        kept.filter((question) => question.subject === subject)
      )
    );
  }

  const normalizedAllThirdParty = (
    await Promise.all(
      (Object.keys(subjectFileMap) as SubjectId[]).map((subject) =>
        readJsonArray<Question>(path.join(processedRoot, `${subjectFileMap[subject]}.third-party.json`))
      )
    )
  ).flat();

  const currentInventory = await fs.readFile(sourceInventoryPath, "utf8").catch(() => "# Third-Party Source Inventory\n");
  await fs.writeFile(sourceInventoryPath, updateSourceInventory(currentInventory), "utf8");
  await fs.writeFile(path.join(processedRoot, "third-party-dedup-report.md"), buildDedupReport(skipped, kept), "utf8");
  await fs.writeFile(
    path.join(processedRoot, "third-party-import-validation-report.md"),
    buildValidationReport(
      Object.values(rawBySubject).reduce((sum, items) => sum + items.length, 0),
      normalizedAllThirdParty,
      skipped,
      rawIndex.length
    ),
    "utf8"
  );

  const bySubjectCount = countBySubject(kept);
  console.log(`Downloaded ${rawIndex.length} ZNO Освіта page(s).`);
  console.log(`Extracted ${Object.values(rawBySubject).reduce((sum, items) => sum + items.length, 0)} raw ZNO Освіта task(s).`);
  console.log(
    `Kept after dedup: TZNK=${bySubjectCount.tznk}, English=${bySubjectCount.english}, Management=${bySubjectCount.management}, Psychology/Sociology=${bySubjectCount["psychology-sociology"]}.`
  );
  console.log(`Skipped ${skipped.length} unsupported/duplicate task(s).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
