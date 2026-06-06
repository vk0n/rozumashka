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

export const englishV3Dir = path.join(
  projectRoot,
  "data",
  "explanations",
  "english-style-v3-batch-1"
);
export const englishQuestionsPath = path.join(
  projectRoot,
  "public",
  "data",
  "questions",
  "english.json"
);
export const inputPath = path.join(englishV3Dir, "explanation-improvement-input.json");
export const outputPath = path.join(englishV3Dir, "explanation-improvement-output.json");
export const promptPath = path.join(englishV3Dir, "explanation-improvement-prompt.md");
export const batchInputPath = path.join(englishV3Dir, "openai-explanation-batch-input.jsonl");
export const batchMetaPath = path.join(englishV3Dir, "openai-explanation-batch-meta.json");
export const batchRawOutputPath = path.join(englishV3Dir, "openai-explanation-batch-raw-output.jsonl");
export const batchErrorsPath = path.join(englishV3Dir, "openai-explanation-batch-errors.jsonl");
export const batchNormalizedOutputPath = path.join(
  englishV3Dir,
  "openai-explanation-batch-normalized-output.json"
);
export const reportPath = path.join(englishV3Dir, "explanation-style-v3-report.md");

export {
  batchEndpoint,
  getExplanationModel,
  openAIFileContent,
  openAIRequest,
  pathExists,
  projectRoot,
  requireOpenAIKey
};

export const requiredEnglishV3Tags = [
  "explanation_improved",
  "explanation_style_v2",
  "explanation_style_v3",
  "english_exam_rules_section",
  "openai_english_explanation_batch_1"
] as const;

export const candidateSchema = z.object({
  id: z.string().trim().min(1),
  subject: z.literal("english"),
  type: z.enum(["single_choice", "passage_single_choice"]),
  question: z.string().trim().min(1),
  passage: z.string().trim().min(1).optional(),
  options: z.array(z.string().trim().min(1)).min(4),
  correctAnswer: z.number().int().nonnegative(),
  currentExplanation: z.string(),
  sourceType: z.enum(["official_demo", "public_source", "generated", "manually_added"]),
  sourceUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string()).optional()
}).superRefine((candidate, ctx) => {
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
  tagsToAdd: z.array(z.string()).default([]),
  uncertain: z.boolean(),
  notes: z.string().default("")
});

export type EnglishV3Candidate = z.infer<typeof candidateSchema>;
export type EnglishV3OutputRecord = z.infer<typeof outputRecordSchema>;

export interface EnglishV3Metadata {
  workflow: "english_explanation_style_v3_batch_1";
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
  appliedCount?: number;
  skippedIds?: string[];
  filesUpdated?: string[];
  validationResult?: string;
  buildResult?: string;
  batch?: unknown;
}

export async function ensureEnglishV3Dir(): Promise<void> {
  await fs.mkdir(englishV3Dir, { recursive: true });
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureEnglishV3Dir();
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readCandidates(): Promise<EnglishV3Candidate[]> {
  if (!(await pathExists(inputPath))) {
    throw new Error("Missing English style-v3 input. Run npm run explanations:prepare-english-v3 first.");
  }

  return z.array(candidateSchema).parse(await readJson<unknown>(inputPath));
}

export async function readMetadata(): Promise<EnglishV3Metadata> {
  if (!(await pathExists(batchMetaPath))) {
    throw new Error("Missing English style-v3 batch metadata. Prepare and create the batch first.");
  }

  return readJson<EnglishV3Metadata>(batchMetaPath);
}

export async function writeMetadata(
  metadata: Omit<EnglishV3Metadata, "updatedAt"> & { updatedAt?: string }
): Promise<EnglishV3Metadata> {
  const next: EnglishV3Metadata = {
    ...metadata,
    updatedAt: metadata.updatedAt ?? new Date().toISOString()
  };

  await writeJson(batchMetaPath, next);
  await writeReport(next);
  return next;
}

function formatList(values: string[] | undefined): string {
  return values && values.length > 0 ? values.map((value) => `- \`${value}\``).join("\n") : "- None";
}

export async function writeReport(metadata: EnglishV3Metadata): Promise<void> {
  const report = `# English Explanation Style V3 Batch 1 Report

Generated on ${new Date().toISOString()}.

## Summary

- Total English questions scanned: ${metadata.totalScanned}
- Selected candidates: ${metadata.candidateCount}
- Outputs received: ${metadata.outputsReceived ?? 0}
- Normalized valid outputs: ${metadata.normalizedCount ?? 0}
- Rejected outputs: ${metadata.rejectedCount ?? 0}
- Uncertain outputs: ${metadata.uncertainCount ?? 0}
- Explanations applied: ${metadata.appliedCount ?? 0}
- Batch status: ${metadata.status}
- Batch id: ${metadata.batchId ?? "not submitted"}
- Model: ${metadata.model}

## Skipped IDs

${formatList(metadata.skippedIds)}

## Files Updated

${formatList(metadata.filesUpdated)}

## Checks

- Question validation: ${metadata.validationResult ?? "not run"}
- Production build: ${metadata.buildResult ?? "not run"}

## Workflow Files

- \`data/explanations/english-style-v3-batch-1/explanation-improvement-input.json\`
- \`data/explanations/english-style-v3-batch-1/explanation-improvement-output.json\`
- \`data/explanations/english-style-v3-batch-1/explanation-improvement-prompt.md\`
- \`data/explanations/english-style-v3-batch-1/openai-explanation-batch-input.jsonl\`
- \`data/explanations/english-style-v3-batch-1/openai-explanation-batch-meta.json\`
- \`data/explanations/english-style-v3-batch-1/openai-explanation-batch-raw-output.jsonl\`
- \`data/explanations/english-style-v3-batch-1/openai-explanation-batch-errors.jsonl\`
- \`data/explanations/english-style-v3-batch-1/openai-explanation-batch-normalized-output.json\`

## Next Command

${metadata.status === "prepared"
  ? "`npm run explanations:create-openai-english-v3-batch`"
  : metadata.status === "created"
    ? "`OPENAI_API_KEY=... npm run explanations:submit-openai-english-v3-batch`"
    : metadata.status === "completed"
      ? "`OPENAI_API_KEY=... npm run explanations:download-openai-english-v3-batch`"
      : metadata.status === "downloaded"
        ? "`npm run explanations:normalize-openai-english-v3-output`"
        : metadata.status === "normalized"
          ? "`npm run explanations:apply-english-v3`"
          : metadata.status === "applied"
            ? "`npm run validate:questions && npm run build`"
            : "`OPENAI_API_KEY=... npm run explanations:check-openai-english-v3-batch`"}
`;

  await fs.writeFile(reportPath, report, "utf8");
}

export function correctLetter(candidate: Pick<EnglishV3Candidate, "correctAnswer">): string {
  return ["A", "B", "C", "D", "E", "F", "G", "H"][candidate.correctAnswer] ?? String(candidate.correctAnswer + 1);
}

export function optionTextMentioned(explanation: string, option: string): boolean {
  const normalizedExplanation = normalizeText(explanation);
  const normalizedOption = normalizeText(option);

  if (!normalizedOption) {
    return false;
  }

  return normalizedExplanation.includes(
    normalizedOption.length <= 140 ? normalizedOption : normalizedOption.slice(0, 140).trim()
  );
}

export function isMostlyUkrainian(explanation: string): boolean {
  const cyrillic = countLetters(explanation, /\p{Script=Cyrillic}/u);
  const latin = countLetters(explanation, /\p{Script=Latin}/u);
  const total = cyrillic + latin;

  return total > 0 && cyrillic >= 120 && cyrillic / total >= 0.35;
}

export function validateEnglishV3Record(
  record: EnglishV3OutputRecord,
  candidate: EnglishV3Candidate
): string[] {
  const explanation = record.improvedExplanation.trim();
  const requiredSections = [
    "Тут правильна відповідь",
    "1. Ключова ідея",
    "2. Чому правильна відповідь",
    "3. Чому не інші варіанти",
    "4. Які правила треба знати, щоб не допустити тут помилок на іспиті",
    "5. Як запам’ятати",
    "Коротко:"
  ];
  const reasons = requiredSections
    .filter((section) => !explanation.includes(section))
    .map((section) => `missing_section:${section}`);
  const letter = correctLetter(candidate);
  const firstLine = explanation.split(/\r?\n/)[0] ?? "";

  if (!new RegExp(`(?:—|-|:)\\s*${letter}(?:\\b|:)`, "u").test(firstLine)) {
    reasons.push("missing_correct_option_letter");
  }

  if (!optionTextMentioned(explanation, candidate.options[candidate.correctAnswer])) {
    reasons.push("missing_correct_option_text");
  }

  if (!isMostlyUkrainian(explanation)) {
    reasons.push("explanation_not_mostly_ukrainian");
  }

  if (/(\bAI\b|штучн(?:ий|ого|ому)? інтелект|мовна модель|language model|cannot answer|can't answer|як модель)/iu.test(explanation)) {
    reasons.push("forbidden_meta_language");
  }

  if (
    record.explanationByOption.length > 0 &&
    record.explanationByOption.length !== candidate.options.length
  ) {
    reasons.push("explanation_by_option_length_mismatch");
  }

  return reasons;
}

export function normalizeTags(record: EnglishV3OutputRecord): string[] {
  const tags = new Set<string>([...record.tagsToAdd, ...requiredEnglishV3Tags]);

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
