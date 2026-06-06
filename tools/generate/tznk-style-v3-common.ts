import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  batchEndpoint,
  countLetters,
  getExplanationModel,
  normalizeText,
  openAIFileContent,
  openAIRequest,
  pathExists,
  projectRoot,
  requireOpenAIKey
} from "./openai-explanation-batch-common";

export const noGeneralRulePlaceholder =
  "Для цього завдання немає окремого універсального правила. На іспиті потрібно послідовно застосувати всі умови задачі та перевірити, який варіант їм відповідає.";

export const tznkV3Dir = path.join(
  projectRoot,
  "data",
  "explanations",
  "tznk-style-v3-batch-1"
);
export const tznkQuestionsPath = path.join(
  projectRoot,
  "public",
  "data",
  "questions",
  "tznk.json"
);
export const inputPath = path.join(tznkV3Dir, "explanation-improvement-input.json");
export const outputPath = path.join(tznkV3Dir, "explanation-improvement-output.json");
export const promptPath = path.join(tznkV3Dir, "explanation-improvement-prompt.md");
export const batchInputPath = path.join(tznkV3Dir, "openai-explanation-batch-input.jsonl");
export const batchMetaPath = path.join(tznkV3Dir, "openai-explanation-batch-meta.json");
export const batchRawOutputPath = path.join(tznkV3Dir, "openai-explanation-batch-raw-output.jsonl");
export const batchErrorsPath = path.join(tznkV3Dir, "openai-explanation-batch-errors.jsonl");
export const batchNormalizedOutputPath = path.join(
  tznkV3Dir,
  "openai-explanation-batch-normalized-output.json"
);
export const batchManualReviewPath = path.join(
  tznkV3Dir,
  "openai-explanation-batch-manual-review.json"
);
export const reportPath = path.join(tznkV3Dir, "explanation-style-v3-report.md");

export {
  batchEndpoint,
  getExplanationModel,
  openAIFileContent,
  openAIRequest,
  pathExists,
  projectRoot,
  requireOpenAIKey
};

export const requiredTznkV3Tags = [
  "explanation_improved",
  "explanation_style_v2",
  "explanation_style_v3",
  "tznk_exam_rules_section",
  "openai_tznk_explanation_batch_1"
] as const;

export const candidateSchema = z
  .object({
    id: z.string().trim().min(1),
    subject: z.literal("tznk"),
    type: z.enum(["single_choice", "passage_single_choice"]),
    question: z.string().trim().min(1),
    passage: z.string().trim().min(1).optional(),
    options: z.array(z.string().trim().min(1)).min(4),
    correctAnswer: z.number().int().nonnegative(),
    currentExplanation: z.string(),
    sourceType: z.enum(["official_demo", "public_source", "generated", "manually_added"]),
    sourceUrl: z.string().url().nullable().optional(),
    tags: z.array(z.string()).optional()
  })
  .superRefine((candidate, ctx) => {
    if (candidate.correctAnswer >= candidate.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswer"],
        message: "correctAnswer must reference an option"
      });
    }

    if (candidate.type === "passage_single_choice" && !candidate.passage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passage"],
        message: "passage is required for passage_single_choice"
      });
    }
  });

export const outputRecordSchema = z.object({
  id: z.string().trim().min(1),
  improvedExplanation: z.string().trim().min(1),
  explanationByOption: z.array(z.string()).default([]),
  rulesSectionMode: z.enum(["reusable_rules", "no_general_rule"]),
  tagsToAdd: z.array(z.string()).default([]),
  uncertain: z.boolean(),
  notes: z.string().default("")
});

export type TznkV3Candidate = z.infer<typeof candidateSchema>;
export type TznkV3OutputRecord = z.infer<typeof outputRecordSchema>;

export interface TznkV3Metadata {
  workflow: "tznk_explanation_style_v3_batch_1";
  status: string;
  createdAt: string;
  updatedAt: string;
  endpoint: string;
  model: string;
  inputPath: string;
  totalScanned: number;
  candidateCount: number;
  batchId?: string;
  inputFileId?: string;
  outputFileId?: string | null;
  errorFileId?: string | null;
  requestCounts?: {
    total?: number;
    completed?: number;
    failed?: number;
  };
  outputsReceived?: number;
  normalizedCount?: number;
  rejectedCount?: number;
  uncertainCount?: number;
  reusableRulesCount?: number;
  noGeneralRuleCount?: number;
  appliedCount?: number;
  manualReviewIds?: string[];
  skippedIds?: string[];
  filesUpdated?: string[];
  validationResult?: string;
  buildResult?: string;
  batch?: unknown;
}

export async function ensureTznkV3Dir(): Promise<void> {
  await fs.mkdir(tznkV3Dir, { recursive: true });
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureTznkV3Dir();
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readCandidates(): Promise<TznkV3Candidate[]> {
  if (!(await pathExists(inputPath))) {
    throw new Error("Missing ТЗНК style-v3 input. Run npm run explanations:prepare-tznk-v3 first.");
  }

  return z.array(candidateSchema).parse(await readJson<unknown>(inputPath));
}

export async function readMetadata(): Promise<TznkV3Metadata> {
  if (!(await pathExists(batchMetaPath))) {
    throw new Error("Missing ТЗНК style-v3 metadata. Prepare the batch first.");
  }

  return readJson<TznkV3Metadata>(batchMetaPath);
}

export async function writeMetadata(
  metadata: Omit<TznkV3Metadata, "updatedAt"> & { updatedAt?: string }
): Promise<TznkV3Metadata> {
  const next: TznkV3Metadata = {
    ...metadata,
    updatedAt: metadata.updatedAt ?? new Date().toISOString()
  };

  await writeJson(batchMetaPath, next);
  await writeReport(next);
  return next;
}

function formatList(values: string[] | undefined): string {
  return values && values.length > 0
    ? values.map((value) => `- \`${value}\``).join("\n")
    : "- None";
}

export async function writeReport(metadata: TznkV3Metadata): Promise<void> {
  const report = `# ТЗНК Explanation Style V3 Batch 1 Report

Generated on ${new Date().toISOString()}.

## Summary

- Total ТЗНК questions scanned: ${metadata.totalScanned}
- Selected candidates: ${metadata.candidateCount}
- Outputs received: ${metadata.outputsReceived ?? 0}
- Normalized valid outputs: ${metadata.normalizedCount ?? 0}
- Rejected outputs: ${metadata.rejectedCount ?? 0}
- Uncertain outputs: ${metadata.uncertainCount ?? 0}
- Explanations applied: ${metadata.appliedCount ?? 0}
- rulesSectionMode = reusable_rules: ${metadata.reusableRulesCount ?? 0}
- rulesSectionMode = no_general_rule: ${metadata.noGeneralRuleCount ?? 0}
- Questions requiring manual review: ${metadata.manualReviewIds?.length ?? 0}
- Batch status: ${metadata.status}
- Batch id: ${metadata.batchId ?? "not submitted"}
- Model: ${metadata.model}

## Manual Review IDs

${formatList(metadata.manualReviewIds)}

## Skipped IDs

${formatList(metadata.skippedIds)}

## Files Updated

${formatList(metadata.filesUpdated)}

## Checks

- Question validation: ${metadata.validationResult ?? "not run"}
- Production build: ${metadata.buildResult ?? "not run"}

## Next Command

${metadata.status === "prepared"
  ? "`npm run explanations:create-openai-tznk-v3-batch`"
  : metadata.status === "created"
    ? "`OPENAI_API_KEY=... npm run explanations:submit-openai-tznk-v3-batch`"
    : metadata.status === "completed"
      ? "`OPENAI_API_KEY=... npm run explanations:download-openai-tznk-v3-batch`"
      : metadata.status === "downloaded"
        ? "`npm run explanations:normalize-openai-tznk-v3-output`"
        : metadata.status === "normalized"
          ? "`npm run explanations:apply-tznk-v3`"
          : metadata.status === "applied"
            ? "`npm run validate:questions && npm run build`"
            : "`OPENAI_API_KEY=... npm run explanations:check-openai-tznk-v3-batch`"}
`;

  await fs.writeFile(reportPath, report, "utf8");
}

export function correctLetter(candidate: Pick<TznkV3Candidate, "correctAnswer">): string {
  return ["А", "Б", "В", "Г", "Д", "Е", "Є", "Ж"][candidate.correctAnswer] ??
    String(candidate.correctAnswer + 1);
}

function optionTextMentioned(explanation: string, option: string): boolean {
  const normalizedExplanation = normalizeText(explanation);
  const normalizedOption = normalizeText(option);

  if (!normalizedOption) {
    return false;
  }

  return normalizedExplanation.includes(
    normalizedOption.length <= 140 ? normalizedOption : normalizedOption.slice(0, 140).trim()
  );
}

function isMostlyUkrainian(explanation: string): boolean {
  const cyrillic = countLetters(explanation, /\p{Script=Cyrillic}/u);
  const latin = countLetters(explanation, /\p{Script=Latin}/u);
  const total = cyrillic + latin;

  return total > 0 && cyrillic >= 120 && cyrillic / total >= 0.7;
}

function extractSection(explanation: string, section: number, nextSection: number): string | null {
  const pattern = new RegExp(
    `^\\s*${section}\\.\\s+[^\\n]+[\\t ]*\\n([\\s\\S]*?)(?=^\\s*${nextSection}\\.\\s+)`,
    "mu"
  );
  return explanation.match(pattern)?.[1]?.trim() ?? null;
}

const canonicalSectionHeadings = new Map<number, string>([
  [1, "1. Ключове поняття / ключові слова в умові"],
  [2, "2. Чому правильна відповідь"],
  [3, "3. Чому не інші варіанти"],
  [4, "4. Які правила треба знати, щоб не допустити тут помилок на іспиті"],
  [5, "5. Як запам’ятати"]
]);

function canonicalizeNumberedHeadings(explanation: string): string {
  let normalized = explanation;

  for (const [section, heading] of canonicalSectionHeadings) {
    const pattern = new RegExp(
      `^([\\t ]*)(?:\\*\\*|__)?${section}\\.\\s*[^\\n]+?(?:\\*\\*|__)?[\\t ]*$`,
      "gmu"
    );
    normalized = normalized.replace(pattern, `$1${heading}`);
  }

  return normalized.replace(
    /^([\t ]*)(?:\*\*|__)?Коротко\s*:?(?:\*\*|__)?[\t ]*$/gimu,
    "$1Коротко:"
  );
}

function replaceSectionBody(
  explanation: string,
  section: number,
  nextSection: number,
  body: string
): string {
  const pattern = new RegExp(
    `(^\\s*${section}\\.\\s+[^\\n]+[\\t ]*\\n)[\\s\\S]*?(?=^\\s*${nextSection}\\.\\s+)`,
    "mu"
  );
  return explanation.replace(pattern, `$1\n${body}\n`);
}

function hasNumberedSection(explanation: string, section: number): boolean {
  return new RegExp(`^\\s*${section}\\.\\s+`, "mu").test(explanation);
}

function extractSectionBeforeSummary(explanation: string, section: number): string | null {
  const pattern = new RegExp(
    `^\\s*${section}\\.\\s+[^\\n]+[\\t ]*\\n([\\s\\S]*?)(?=^\\s*(?:\\*\\*|__)?Коротко\\s*:?)`,
    "mu"
  );
  return explanation.match(pattern)?.[1]?.trim() ?? null;
}

function splitMissingMemorySection(
  explanation: string,
  mode: TznkV3OutputRecord["rulesSectionMode"]
): string {
  if (!hasNumberedSection(explanation, 4) || hasNumberedSection(explanation, 5)) {
    return explanation;
  }

  const existingBody = extractSectionBeforeSummary(explanation, 4);
  if (!existingBody) {
    return explanation;
  }

  const rulesBody = mode === "no_general_rule"
    ? noGeneralRulePlaceholder
    : existingBody;
  const memoryBody = mode === "no_general_rule"
    ? existingBody
    : "Запам’ятайте послідовність дій із попереднього розділу й перед вибором відповіді перевірте її на всіх умовах завдання.";
  const pattern =
    /^(\s*)4\.\s+[^\n]+[\t ]*\n[\s\S]*?(?=^\s*(?:\*\*|__)?Коротко\s*:?)/mu;

  return explanation.replace(
    pattern,
    `$14. Які правила треба знати, щоб не допустити тут помилок на іспиті\n\n${rulesBody}\n\n5. Як запам’ятати\n\n${memoryBody}\n\n`
  );
}

function appendMissingSummary(
  explanation: string,
  candidate: TznkV3Candidate
): string {
  if (/^\s*(?:\*\*|__)?Коротко\s*:?(?:\*\*|__)?[\t ]*$/imu.test(explanation)) {
    return explanation;
  }

  const letter = correctLetter(candidate);
  const option = candidate.options[candidate.correctAnswer];
  return `${explanation.trim()}\n\nКоротко:\n\nПравильна відповідь — ${letter}: «${option}».`;
}

export function repairTznkV3Record(
  record: TznkV3OutputRecord,
  candidate: TznkV3Candidate
): TznkV3OutputRecord {
  let improvedExplanation = splitMissingMemorySection(
    record.improvedExplanation.trim(),
    record.rulesSectionMode
  );
  improvedExplanation = canonicalizeNumberedHeadings(improvedExplanation);

  if (record.rulesSectionMode === "no_general_rule") {
    improvedExplanation = replaceSectionBody(
      improvedExplanation,
      4,
      5,
      noGeneralRulePlaceholder
    );
  }
  improvedExplanation = appendMissingSummary(improvedExplanation, candidate);

  const explanationByOption =
    record.explanationByOption.length === 0 ||
    record.explanationByOption.length === candidate.options.length
      ? record.explanationByOption
      : [];

  return {
    ...record,
    improvedExplanation,
    explanationByOption,
    tagsToAdd: normalizeTags(record)
  };
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(normalizeText(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeText(right).split(" ").filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

export function validateTznkV3Record(
  record: TznkV3OutputRecord,
  candidate: TznkV3Candidate
): string[] {
  const explanation = record.improvedExplanation.trim();
  const reasons: string[] = [];
  const requiredSections = [
    "Тут правильна відповідь",
    "2. Чому правильна відповідь",
    "3. Чому не інші варіанти",
    "4. Які правила треба знати, щоб не допустити тут помилок на іспиті",
    "5. Як запам’ятати",
    "Коротко:"
  ];

  if (!explanation.includes("1. Ключове поняття") && !explanation.includes("1. Ключові слова")) {
    reasons.push("missing_section:1_key_concept");
  }

  for (const section of requiredSections) {
    if (!explanation.includes(section)) {
      reasons.push(`missing_section:${section}`);
    }
  }

  const letter = correctLetter(candidate);
  const firstLine = explanation.split(/\r?\n/)[0] ?? "";

  if (!new RegExp(`(?:—|-|:)\\s*${letter}(?:\\s|:|\\.|$)`, "u").test(firstLine)) {
    reasons.push("missing_correct_option_letter");
  }

  if (!optionTextMentioned(explanation, candidate.options[candidate.correctAnswer])) {
    reasons.push("missing_correct_option_text");
  }

  if (!isMostlyUkrainian(explanation)) {
    reasons.push("explanation_not_mostly_ukrainian");
  }

  if (/(мовна модель|language model|cannot answer|can't answer|як (?:мовна|AI) модель|не можу (?:дати )?відповід)/iu.test(explanation)) {
    reasons.push("forbidden_meta_language");
  }

  if (
    record.explanationByOption.length > 0 &&
    record.explanationByOption.length !== candidate.options.length
  ) {
    reasons.push("explanation_by_option_length_mismatch");
  }

  const section2 = extractSection(explanation, 2, 3);
  const section4 = extractSection(explanation, 4, 5);

  if (!section4) {
    reasons.push("missing_rules_section_body");
  } else if (record.rulesSectionMode === "no_general_rule") {
    if (section4 !== noGeneralRulePlaceholder) {
      reasons.push("no_general_rule_placeholder_mismatch");
    }

  } else {
    if (section4 === noGeneralRulePlaceholder) {
      reasons.push("reusable_rules_uses_placeholder");
    }

    if (normalizeText(section4).split(" ").filter(Boolean).length < 12) {
      reasons.push("reusable_rules_too_short");
    }

    if (section2 && tokenSimilarity(section2, section4) >= 0.8) {
      reasons.push("rules_section_duplicates_reasoning");
    }
  }

  if (record.uncertain) {
    if (!record.notes.trim()) {
      reasons.push("uncertain_missing_notes");
    }
  }

  return reasons;
}

export function normalizeTags(record: TznkV3OutputRecord): string[] {
  const tags = new Set<string>([...record.tagsToAdd, ...requiredTznkV3Tags]);

  if (record.rulesSectionMode === "no_general_rule") {
    tags.add("tznk_no_general_rule");
  }

  if (record.uncertain) {
    tags.add("needs_explanation_review");
    tags.add("needs_explanation_style_v3");
  }

  return [...tags].sort();
}

export function parseJsonl(raw: string): unknown[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

export function extractMessageContent(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const message = (choices[0] as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    return null;
  }

  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}

export function stripJsonFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
