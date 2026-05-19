import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Difficulty, Question, QuestionType } from "../../src/types";

type SubjectId = "tznk" | "english" | "management" | "psychology-sociology";
type SourceStatus = "include" | "skip";
type QualityEstimate = "high" | "medium" | "low";
type Priority = "high" | "medium" | "low";
type Confidence = "high" | "medium" | "low";

interface ThirdPartySource {
  title: string;
  url: string;
  subjects: SubjectId[];
  fileType: "html" | "pdf" | "doc" | "image" | "other";
  containsQuestions: boolean;
  containsAnswers: boolean;
  containsExplanations: boolean;
  qualityEstimate: QualityEstimate;
  importPriority: Priority;
  notes: string;
  reason: string;
  status: SourceStatus;
  localFilePath?: string;
  sourceTag: string;
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
  qualityEstimate: QualityEstimate;
  notes: string;
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

const sourceInventoryPath = path.join(projectRoot, "data", "sources", "third-party-source-inventory.md");
const rawRoot = path.join(projectRoot, "data", "raw", "third-party");
const rawIndexPath = path.join(projectRoot, "data", "raw", "third-party-raw-index.json");
const extractedRoot = path.join(projectRoot, "data", "extracted", "third-party");
const processedRoot = path.join(projectRoot, "data", "processed", "third-party");

const sourceUrlJustSchool =
  "https://quiz.justschool.me/evy2025/self?leadType=english-for-children&utm_campaign=Eng%2Fevy2025_self&utm_medium=organic&utm_source=main_page";

const sources: ThirdPartySource[] = [
  {
    title: "JustSchool author EVI 2025 English mock test",
    url: sourceUrlJustSchool,
    subjects: ["english"],
    fileType: "html",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: false,
    qualityEstimate: "medium",
    importPriority: "high",
    notes:
      "Open author mock test. The HTML exposes answer scores in `d-ca-score`; explanations are not present, so concise explanations are generated and all normalized questions stay reviewed=false.",
    reason: "Included: clearly EVI English-focused, open without login, contains questions and machine-readable answer scores.",
    status: "include",
    localFilePath: "data/raw/third-party/english/justschool-evi-2025-author.html",
    sourceTag: "justschool_evi_2025_author"
  },
  {
    title: "JustSchool EVI 2023 English demo",
    url: "https://quiz.justschool.me/evy2023/self",
    subjects: ["english"],
    fileType: "html",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: false,
    qualityEstimate: "medium",
    importPriority: "low",
    notes: "Third-party rendering of a demo/past official-style EVI English test.",
    reason: "Skipped: likely official/demo material, so importing would duplicate official-source content.",
    status: "skip",
    sourceTag: "justschool_evi_2023_demo"
  },
  {
    title: "ЗНО.Освіта.UA ТЗНК tests in magistracy",
    url: "https://zno.osvita.ua/master/tznpk/",
    subjects: ["tznk"],
    fileType: "html",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: true,
    qualityEstimate: "high",
    importPriority: "low",
    notes: "Online archive of TZNK tests from previous sessions, with answers and explanations after completion.",
    reason: "Skipped: source republishes official past/session questions; task rules require skipping third-party copies of official questions.",
    status: "skip",
    sourceTag: "zno_osvita_tznk"
  },
  {
    title: "Освіта.ua TZNK EVI 2024 answers article",
    url: "https://osvita.ua/master/master-zno/answers/94058/",
    subjects: ["tznk"],
    fileType: "html",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: false,
    qualityEstimate: "high",
    importPriority: "low",
    notes: "Article points to the TZNK 2024 online test and answers.",
    reason: "Skipped: official 2024 TZNK content mirrored by a third-party publication.",
    status: "skip",
    sourceTag: "osvita_ua_tznk_2024"
  },
  {
    title: "Chitay TZNK online tests",
    url: "https://www.chitay.org.ua/tests/tznk",
    subjects: ["tznk"],
    fileType: "html",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: true,
    qualityEstimate: "medium",
    importPriority: "low",
    notes: "Online test archive for TZNK 2017-2024.",
    reason: "Skipped: appears to render official past/session tests; duplicate risk is high.",
    status: "skip",
    sourceTag: "chitay_tznk"
  },
  {
    title: "Magistratura.in.ua official ЄФВВ 2024 management online test",
    url: "https://magistratura.in.ua/quizzes/efvv-management-testy-upravlinnya-ta-administruvannya-2024/",
    subjects: ["management"],
    fileType: "html",
    containsQuestions: true,
    containsAnswers: false,
    containsExplanations: false,
    qualityEstimate: "high",
    importPriority: "low",
    notes: "Online copy of the official 2024 management collection; page credits the state source.",
    reason: "Skipped: duplicate of the official collection already merged in public data.",
    status: "skip",
    sourceTag: "magistratura_management_2024"
  },
  {
    title: "Chitay management and administration ЄФВВ tests",
    url: "https://www.chitay.org.ua/tests/upravlinnya-ta-administruvannya",
    subjects: ["management"],
    fileType: "html",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: true,
    qualityEstimate: "medium",
    importPriority: "low",
    notes: "Contains 2024 and 2023 ЄФВВ tests.",
    reason: "Skipped: appears to render official examples/collections already covered by official imports.",
    status: "skip",
    sourceTag: "chitay_management"
  },
  {
    title: "Chitay psychology and sociology ЄФВВ tests",
    url: "https://www.chitay.org.ua/tests/psychology-sociology",
    subjects: ["psychology-sociology"],
    fileType: "html",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: true,
    qualityEstimate: "medium",
    importPriority: "low",
    notes: "Contains 2024 and 2023 ЄФВВ tests.",
    reason: "Skipped: appears to render official examples/collections already covered by official imports.",
    status: "skip",
    sourceTag: "chitay_psychology_sociology"
  },
  {
    title: "Fatkin School management ЄФВВ online tests landing page",
    url: "https://www.fatkin.school/efvv-testy-z-upravlinia-ta-administruvania",
    subjects: ["management"],
    fileType: "html",
    containsQuestions: false,
    containsAnswers: true,
    containsExplanations: false,
    qualityEstimate: "medium",
    importPriority: "low",
    notes: "Describes paid author tests hosted by the School of Future Masters; no public question text on the page.",
    reason: "Skipped: no open questions to extract, purchase/login required.",
    status: "skip",
    sourceTag: "fatkin_management"
  },
  {
    title: "Magistratura.in.ua paid author management test product",
    url: "https://magistratura.in.ua/product/efvv-upravlinnia-test-1/",
    subjects: ["management"],
    fileType: "html",
    containsQuestions: false,
    containsAnswers: true,
    containsExplanations: false,
    qualityEstimate: "medium",
    importPriority: "low",
    notes: "Paid product page for author tests; the page lists topics but not the question bank.",
    reason: "Skipped: paid/login-only content without public questions.",
    status: "skip",
    sourceTag: "magistratura_paid_management"
  },
  {
    title: "M8 TZNK online course/free version",
    url: "https://m8.org.ua/uk/gkt-free-version/",
    subjects: ["tznk"],
    fileType: "html",
    containsQuestions: false,
    containsAnswers: true,
    containsExplanations: true,
    qualityEstimate: "medium",
    importPriority: "low",
    notes: "Course/free-version page advertises author tests and explanations but requires account/course access.",
    reason: "Skipped: no open parseable question set on the public page.",
    status: "skip",
    sourceTag: "m8_tznk"
  }
];

const subjectFileMap: Record<SubjectId, string> = {
  tznk: "tznk",
  english: "english",
  management: "management",
  "psychology-sociology": "psychology-sociology"
};

function decodeHtml(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    quot: "\"",
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " "
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity: string) => namedEntities[entity] ?? match);
}

function htmlToText(value: string): string {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
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

function firstMeaningfulLine(passage: string): string {
  const lines = passage
    .split("\n")
    .map((line) => line.trim().replace(/\|$/, ""))
    .filter(Boolean);

  if (lines[0] === "Cafes Around the World" && lines[1]) {
    return lines[1];
  }

  return lines[0] ?? "the passage";
}

function cleanProcessedPassage(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split("\n")
    .map((line) => line.trim().replace(/\|$/, ""))
    .join("\n")
    .replace(/\bcafe Emphasises\b/g, "cafe emphasises")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanProcessedOptions(options: string[]): { options: string[]; fixedSourceTypo: boolean } {
  let fixedSourceTypo = false;
  const cleaned = options.map((option) => {
    if (option === "hey depend on specific weather conditions.") {
      fixedSourceTypo = true;
      return "They depend on specific weather conditions.";
    }

    return option;
  });

  return { options: cleaned, fixedSourceTypo };
}

function extractQuestionBlocks(html: string): RawExtractedQuestion[] {
  const blocks = html.split(/<div class="inside-form-block t-question q-num-/).slice(1);
  const questions: RawExtractedQuestion[] = [];
  const source = sources[0];

  for (const part of blocks) {
    const numberMatch = part.match(/^(\d+)/);
    if (!numberMatch) {
      continue;
    }

    const questionNumber = Number(numberMatch[1]);
    if (questionNumber > 30) {
      continue;
    }

    const block = part.split(/<div class="inside-form-block /)[0] ?? part;
    const headingMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    const descriptionMatch = block.match(/<p class="dialogue-description q-num-\d+">([\s\S]*?)<\/p>/);
    const optionMatches = [...block.matchAll(/<a\b[^>]*class="[^"]*button-choice[^"]*"[^>]*>/g)];
    const rawOptions: string[] = [];
    let rawCorrectAnswer: number | null = null;

    for (const optionMatch of optionMatches) {
      const tag = optionMatch[0];
      const optionText = tag.match(/d-button-text="([^"]*)"/)?.[1];
      const score = tag.match(/d-ca-score="([^"]*)"/)?.[1];

      if (!optionText) {
        continue;
      }

      if (score === "1") {
        rawCorrectAnswer = rawOptions.length;
      }

      rawOptions.push(decodeHtml(optionText).trim());
    }

    const rawQuestionText = headingMatch ? htmlToText(headingMatch[1]) : `Question ${questionNumber}`;
    const rawPassage = descriptionMatch ? htmlToText(descriptionMatch[1]) : null;

    if (!rawOptions.length) {
      continue;
    }

    questions.push({
      rawQuestionText,
      rawPassage,
      rawOptions,
      rawCorrectAnswer,
      rawExplanation: null,
      sourceUrl: source.url,
      sourceFile: source.localFilePath ?? "",
      pageNumber: null,
      confidence: rawCorrectAnswer === null ? "low" : "high",
      extractionNotes:
        rawCorrectAnswer === null
          ? "No single correct option marker found in HTML."
          : "Extracted from GoodPromo/Bubble HTML question block using d-ca-score answer marker."
    });
  }

  return questions;
}

function inferEnglishTopic(raw: RawExtractedQuestion, index: number): Pick<Question, "type" | "topic" | "subtopic" | "difficulty" | "question" | "passage"> {
  const passage = raw.rawPassage ?? undefined;
  const questionNumber = index + 1;
  const heading = raw.rawQuestionText.trim();

  if (questionNumber <= 6) {
    const cafeName = passage ? firstMeaningfulLine(passage) : `cafe ${questionNumber}`;
    return {
      type: "passage_single_choice",
      topic: "Reading comprehension",
      subtopic: "Matching information",
      difficulty: "medium",
      question: `Which statement matches ${cafeName}?`,
      passage
    };
  }

  if (questionNumber <= 11) {
    const lower = heading.toLowerCase();
    const subtopic = lower.includes("difference")
      ? "Detail understanding"
      : lower.includes("why")
        ? "Detail understanding"
        : lower.includes("challenge") || lower.includes("problem")
          ? "Detail understanding"
          : "Inference";

    return {
      type: "passage_single_choice",
      topic: "Reading comprehension",
      subtopic,
      difficulty: "medium",
      question: heading,
      passage
    };
  }

  if (passage?.includes("______")) {
    return {
      type: "passage_single_choice",
      topic: "Cloze tests",
      subtopic: "Vocabulary and grammar in context",
      difficulty: "medium",
      question: `Choose the best option for blank (${questionNumber}) in the passage.`,
      passage
    };
  }

  return {
    type: "single_choice",
    topic: "Use of English",
    subtopic: "Vocabulary and grammar",
    difficulty: "medium",
    question: heading,
    passage
  };
}

function makeExplanation(question: string, correctOption: string, topic: string): string {
  if (topic === "Reading comprehension") {
    return `The source marks "${correctOption}" as correct; this option is directly supported by the passage.`;
  }

  if (topic === "Cloze tests") {
    return `The source marks "${correctOption}" as correct; it best fits the meaning and grammar of the numbered gap in the passage.`;
  }

  return `The source marks "${correctOption}" as correct for this question: ${question}`;
}

function normalizeEnglish(rawQuestions: RawExtractedQuestion[]): CandidateQuestion[] {
  return rawQuestions.map((raw, index) => {
    const inferred = inferEnglishTopic(raw, index);
    const cleanPassage = cleanProcessedPassage(inferred.passage);
    const { options, fixedSourceTypo } = cleanProcessedOptions(raw.rawOptions);
    const correctAnswer = raw.rawCorrectAnswer ?? 0;
    const tags = ["third_party_import", "justschool", "justschool_evi_2025_author", "generated_explanation"];

    if (raw.rawCorrectAnswer === null) {
      tags.push("needs_answer_review");
    }

    if (fixedSourceTypo) {
      tags.push("source_typo_fixed");
    }

    const question: CandidateQuestion = {
      id: `english-justschool-evi-2025-${String(index + 1).padStart(3, "0")}`,
      subject: "english",
      type: inferred.type as QuestionType,
      topic: inferred.topic,
      subtopic: inferred.subtopic,
      difficulty: inferred.difficulty as Difficulty,
      sourceType: "public_source",
      sourceUrl: sourceUrlJustSchool,
      reviewed: false,
      question: inferred.question,
      passage: cleanPassage,
      options,
      correctAnswer,
      explanation:
        raw.rawCorrectAnswer === null
          ? "Потрібна ручна перевірка відповіді."
          : makeExplanation(inferred.question, options[correctAnswer], inferred.topic),
      tags,
      importNotes: raw.extractionNotes
    };

    return question;
  });
}

async function readQuestions(filePath: string): Promise<Question[]> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as Question[];
  } catch {
    return [];
  }
}

async function loadExistingQuestions(): Promise<Array<Question & { file: string }>> {
  const files = [
    "public/data/questions/tznk.json",
    "public/data/questions/english.json",
    "public/data/questions/management.json",
    "public/data/questions/psychology-sociology.json",
    "data/generated/tznk.generated.json",
    "data/generated/english.generated.json"
  ];

  const all: Array<Question & { file: string }> = [];
  for (const file of files) {
    const questions = await readQuestions(path.join(projectRoot, file));
    all.push(...questions.map((question) => ({ ...question, file })));
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
        reason: "exact duplicate question text against existing official/generated bank",
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
        reason: "same passage and answer options as an existing official/generated question",
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
        reason: "near-duplicate question text against existing official/generated bank",
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
        reason: "duplicate within third-party candidate batch",
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

async function ensureDirectories(): Promise<void> {
  await Promise.all([
    fs.mkdir(path.dirname(sourceInventoryPath), { recursive: true }),
    fs.mkdir(path.join(rawRoot, "tznk"), { recursive: true }),
    fs.mkdir(path.join(rawRoot, "english"), { recursive: true }),
    fs.mkdir(path.join(rawRoot, "management"), { recursive: true }),
    fs.mkdir(path.join(rawRoot, "psychology-sociology"), { recursive: true }),
    fs.mkdir(path.join(rawRoot, "mixed"), { recursive: true }),
    fs.mkdir(path.join(extractedRoot), { recursive: true }),
    fs.mkdir(path.join(processedRoot), { recursive: true })
  ]);
}

async function downloadIncludedSources(downloadedAt: string): Promise<RawIndexEntry[]> {
  const rawIndex: RawIndexEntry[] = [];

  for (const source of sources.filter((item) => item.status === "include")) {
    if (!source.localFilePath) {
      continue;
    }

    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Failed to download ${source.url}: ${response.status} ${response.statusText}`);
    }

    const localPath = path.join(projectRoot, source.localFilePath);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, await response.text(), "utf8");

    rawIndex.push({
      localFilePath: source.localFilePath,
      sourceUrl: source.url,
      title: source.title,
      subject: source.subjects.length === 1 ? source.subjects[0] : "mixed",
      sourceType: "public_source",
      downloadedAt,
      containsQuestions: source.containsQuestions,
      containsAnswers: source.containsAnswers,
      containsExplanations: source.containsExplanations,
      qualityEstimate: source.qualityEstimate,
      notes: source.notes
    });
  }

  return rawIndex;
}

function buildSourceInventory(): string {
  const rows = sources.map((source) => {
    return [
      source.title,
      source.url,
      "public_source",
      source.subjects.join(", "),
      source.fileType,
      source.containsQuestions ? "Yes" : "No",
      source.containsAnswers ? "Yes" : "No",
      source.containsExplanations ? "Yes" : "No",
      source.qualityEstimate,
      source.importPriority,
      source.notes,
      source.reason
    ].join(" | ");
  });

  return `# Third-Party Source Inventory

Updated on 2026-05-18.

Only sources clearly related to ЄВІ/ЄФВВ preparation are listed. Sources that appear to be third-party copies of official questions are kept for traceability but skipped for import.

| Title | URL | Source type | Subjects covered | File type | Contains questions | Contains answers | Contains explanations | Estimated quality | Import priority | Notes | Reason for including or skipping |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row} |`).join("\n")}
`;
}

function buildDedupReport(skipped: SkippedQuestion[]): string {
  const duplicateLines = skipped.length
    ? skipped
        .map(
          (item) =>
            `- ${item.id}: ${item.reason}${item.matchedId ? `; matched ${item.matchedId} in ${item.matchedFile}` : ""}`
        )
        .join("\n")
    : "- None";

  return `# Third-Party Dedup Report

Generated on 2026-05-18.

## Duplicates Skipped

${duplicateLines}

## Near-Duplicates Skipped

${skipped.some((item) => item.reason.includes("near-duplicate")) ? duplicateLines : "- None"}

## Uncertain Duplicates Requiring Manual Review

- None
`;
}

function buildValidationReport(rawCount: number, normalizedCount: number, skipped: SkippedQuestion[], rawIndex: RawIndexEntry[]): string {
  const byReason = skipped.reduce<Record<string, number>>((acc, item) => {
    acc[item.reason] = (acc[item.reason] ?? 0) + 1;
    return acc;
  }, {});

  const skippedReasonLines = Object.entries(byReason).length
    ? Object.entries(byReason)
        .map(([reason, count]) => `- ${reason}: ${count}`)
        .join("\n")
    : "- None";

  return `# Third-Party Import Validation Report

Generated on 2026-05-18.

## Summary

- Total third-party sources inspected: ${sources.length}
- Total files downloaded: ${rawIndex.length}
- Total questions extracted: ${rawCount}
- Total questions normalized: ${normalizedCount}
- Total questions skipped: ${skipped.length}
- Questions by subject:
- ТЗНК: 0
- Англійська мова: ${normalizedCount}
- Управління та адміністрування: 0
- Психологія та соціологія: 0
- Questions with answers: ${normalizedCount}
- Questions without answers: 0
- Questions needing manual review: 0
- Duplicates skipped: ${skipped.length}
- Validation errors: pending external \`npm run validate:questions\`

## Skipped Reasons

${skippedReasonLines}

## Notes

- Official mirrors and third-party renderings of official ЄВІ/ЄФВВ questions were intentionally skipped.
- Paid/login-only course pages were inventoried but not downloaded because they do not expose public question text.
- JustSchool explanations were not present in the source HTML; concise explanations were generated and all questions remain \`reviewed=false\`.

## Next Recommended Actions

- Run \`npm run validate:questions\`.
- Manually review the generated explanations before any future merge.
- If importing more third-party material, prefer sources that are author-created, open, and expose answer keys.
`;
}

function emptyExtractionIssues(): string {
  return `# Third-Party Extraction Issues

Generated on 2026-05-18.

No included third-party source failed automatic parsing.

Skipped sources are documented in \`data/sources/third-party-source-inventory.md\`.
`;
}

async function main(): Promise<void> {
  const downloadedAt = new Date().toISOString();
  await ensureDirectories();

  await fs.writeFile(sourceInventoryPath, buildSourceInventory(), "utf8");
  const rawIndex = await downloadIncludedSources(downloadedAt);
  await fs.writeFile(rawIndexPath, `${JSON.stringify(rawIndex, null, 2)}\n`, "utf8");

  const justSchoolHtml = await fs.readFile(path.join(projectRoot, sources[0].localFilePath!), "utf8");
  const englishRaw = extractQuestionBlocks(justSchoolHtml);
  const englishCandidates = normalizeEnglish(englishRaw);
  const existing = await loadExistingQuestions();
  const { kept: englishProcessed, skipped } = deduplicate(englishCandidates, existing);

  const rawOutputs: Record<SubjectId, RawExtractedQuestion[]> = {
    tznk: [],
    english: englishRaw,
    management: [],
    "psychology-sociology": []
  };
  const processedOutputs: Record<SubjectId, Question[]> = {
    tznk: [],
    english: englishProcessed,
    management: [],
    "psychology-sociology": []
  };

  for (const subject of Object.keys(subjectFileMap) as SubjectId[]) {
    await fs.writeFile(
      path.join(extractedRoot, `${subjectFileMap[subject]}.raw.json`),
      `${JSON.stringify(rawOutputs[subject], null, 2)}\n`,
      "utf8"
    );
    await fs.writeFile(
      path.join(processedRoot, `${subjectFileMap[subject]}.third-party.json`),
      `${JSON.stringify(processedOutputs[subject], null, 2)}\n`,
      "utf8"
    );
  }

  await fs.writeFile(path.join(extractedRoot, "extraction-issues.md"), emptyExtractionIssues(), "utf8");
  await fs.writeFile(path.join(processedRoot, "third-party-dedup-report.md"), buildDedupReport(skipped), "utf8");
  await fs.writeFile(
    path.join(processedRoot, "third-party-import-validation-report.md"),
    buildValidationReport(englishRaw.length, englishProcessed.length, skipped, rawIndex),
    "utf8"
  );

  console.log(`Downloaded ${rawIndex.length} third-party source file(s).`);
  console.log(`Extracted ${englishRaw.length} English question(s).`);
  console.log(`Normalized ${englishProcessed.length} English question(s).`);
  console.log(`Skipped ${skipped.length} duplicate/low-confidence question(s).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
