import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, "..", "..");
export const explanationsDir = path.join(projectRoot, "data", "explanations");

export const explanationInputPath = path.join(
  explanationsDir,
  "explanation-improvement-input.json"
);
export const explanationOutputPath = path.join(
  explanationsDir,
  "explanation-improvement-output.json"
);
export const batchInputPath = path.join(
  explanationsDir,
  "openai-explanation-batch-input.jsonl"
);
export const batchChunksDir = path.join(explanationsDir, "openai-batches");
export const batchIndexPath = path.join(
  explanationsDir,
  "openai-explanation-batch-index.json"
);
export const batchMetaPath = path.join(
  explanationsDir,
  "openai-explanation-batch-meta.json"
);
export const batchRawOutputPath = path.join(
  explanationsDir,
  "openai-explanation-batch-raw-output.jsonl"
);
export const batchErrorsPath = path.join(
  explanationsDir,
  "openai-explanation-batch-errors.jsonl"
);
export const batchNormalizedOutputPath = path.join(
  explanationsDir,
  "openai-explanation-batch-normalized-output.json"
);
export const batchReportPath = path.join(
  explanationsDir,
  "openai-explanation-batch-report.md"
);

export const defaultExplanationModel = "gpt-5.4-mini";
export const batchEndpoint = "/v1/chat/completions";
export const openaiApiBaseUrl = "https://api.openai.com";

export const requiredTags = [
  "explanation_improved",
  "explanation_style_v2",
  "openai_explanation_batch_1"
] as const;

export const explanationInputItemSchema = z.object({
  filePath: z.string().min(1),
  id: z.string().min(1),
  subject: z.string().min(1),
  type: z.string().min(1),
  topic: z.string().min(1),
  subtopic: z.string().optional(),
  question: z.string().min(1),
  passage: z.string().optional(),
  options: z.array(z.string().min(1)).min(4),
  correctAnswer: z.number().int().nonnegative(),
  correctLetter: z.string().min(1),
  correctOption: z.string().min(1),
  currentExplanation: z.string(),
  currentExplanationByOption: z.array(z.string()).optional(),
  sourceType: z.string().min(1),
  sourceUrl: z.string().nullable().optional(),
  reviewed: z.boolean(),
  tags: z.array(z.string()).optional(),
  weakReasons: z.array(z.string()).optional()
});

export const explanationOutputRecordSchema = z.object({
  id: z.string().min(1),
  improvedExplanation: z.string().trim().min(1),
  explanationByOption: z.array(z.string()).default([]),
  tagsToAdd: z.array(z.string()).default([]),
  uncertain: z.boolean(),
  notes: z.string().default("")
});

export const normalizedExplanationRecordSchema = explanationOutputRecordSchema.extend({
  filePath: z.string().min(1)
});

export type ExplanationInputItem = z.infer<typeof explanationInputItemSchema>;
export type ExplanationOutputRecord = z.infer<typeof explanationOutputRecordSchema>;
export type NormalizedExplanationRecord = z.infer<typeof normalizedExplanationRecordSchema>;

export interface BatchMetadata {
  chunkNumber?: number;
  batchId?: string;
  inputFileId?: string;
  outputFileId?: string | null;
  errorFileId?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  endpoint: string;
  model: string;
  inputPath: string;
  rawOutputPath?: string;
  errorsPath?: string;
  requestCounts?: unknown;
  batch?: unknown;
}

export interface BatchChunkMetadata {
  chunkNumber: number;
  requestCount: number;
  startIndex: number;
  endIndex: number;
  inputPath: string;
  metaPath: string;
  rawOutputPath: string;
  errorsPath: string;
  batchId?: string;
  inputFileId?: string;
  outputFileId?: string | null;
  errorFileId?: string | null;
  status?: string;
}

export interface BatchIndex {
  createdAt: string;
  endpoint: string;
  model: string;
  chunkSize: number;
  totalCandidates: number;
  chunks: BatchChunkMetadata[];
}

export interface RejectedBatchOutput {
  customId?: string;
  id?: string;
  subject?: string;
  chunkNumber?: number;
  reasons: string[];
  raw?: unknown;
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureExplanationsDir(): Promise<void> {
  await fs.mkdir(explanationsDir, { recursive: true });
}

export async function ensureBatchChunksDir(): Promise<void> {
  await fs.mkdir(batchChunksDir, { recursive: true });
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readExplanationInput(): Promise<ExplanationInputItem[]> {
  if (!(await pathExists(explanationInputPath))) {
    throw new Error("Missing data/explanations/explanation-improvement-input.json. Run npm run explanations:prepare first.");
  }

  const raw = await readJson<unknown>(explanationInputPath);
  return z.array(explanationInputItemSchema).parse(raw);
}

export async function readBatchMetadata(): Promise<BatchMetadata> {
  if (!(await pathExists(batchMetaPath))) {
    throw new Error("Missing data/explanations/openai-explanation-batch-meta.json. Submit a batch first.");
  }

  return readJson<BatchMetadata>(batchMetaPath);
}

export async function readBatchIndex(): Promise<BatchIndex> {
  if (!(await pathExists(batchIndexPath))) {
    throw new Error("Missing data/explanations/openai-explanation-batch-index.json. Run npm run explanations:create-openai-batch first.");
  }

  return readJson<BatchIndex>(batchIndexPath);
}

export async function writeBatchIndex(index: BatchIndex): Promise<void> {
  await writeJson(batchIndexPath, index);
}

export async function writeBatchMetadata(metadata: BatchMetadata): Promise<void> {
  await writeJson(batchMetaPath, {
    ...metadata,
    updatedAt: new Date().toISOString()
  });
}

export function getExplanationModel(): string {
  return process.env.OPENAI_EXPLANATION_MODEL?.trim() || defaultExplanationModel;
}

export function getBatchChunkSize(): number {
  const raw = process.env.OPENAI_BATCH_CHUNK_SIZE?.trim();

  if (!raw) {
    return 350;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("OPENAI_BATCH_CHUNK_SIZE must be a positive integer.");
  }

  return value;
}

export function paddedChunkNumber(chunkNumber: number): string {
  return String(chunkNumber).padStart(3, "0");
}

export function getChunkPaths(chunkNumber: number) {
  const padded = paddedChunkNumber(chunkNumber);
  return {
    inputPath: path.join(batchChunksDir, `openai-explanation-batch-${padded}.jsonl`),
    metaPath: path.join(batchChunksDir, `openai-explanation-batch-${padded}-meta.json`),
    rawOutputPath: path.join(batchChunksDir, `openai-explanation-batch-${padded}-raw-output.jsonl`),
    errorsPath: path.join(batchChunksDir, `openai-explanation-batch-${padded}-errors.jsonl`)
  };
}

export function getRequestedChunkNumber(): number | null {
  const chunkFlagIndex = process.argv.findIndex((arg) => arg === "--chunk");

  if (chunkFlagIndex !== -1) {
    const value = Number(process.argv[chunkFlagIndex + 1]);

    if (!Number.isInteger(value) || value < 1) {
      throw new Error("--chunk must be followed by a positive integer.");
    }

    return value;
  }

  const equalsArg = process.argv.find((arg) => arg.startsWith("--chunk="));
  if (equalsArg) {
    const value = Number(equalsArg.split("=")[1]);

    if (!Number.isInteger(value) || value < 1) {
      throw new Error("--chunk must be a positive integer.");
    }

    return value;
  }

  return null;
}

export function selectChunk(index: BatchIndex, requestedChunk: number | null): BatchChunkMetadata {
  if (requestedChunk) {
    const chunk = index.chunks.find((candidate) => candidate.chunkNumber === requestedChunk);

    if (!chunk) {
      throw new Error(`Chunk ${requestedChunk} not found in batch index.`);
    }

    return chunk;
  }

  const pending = index.chunks.find((chunk) => !isTerminalOrActiveBatchStatus(chunk.status));

  return pending ?? index.chunks[0];
}

export function isActiveBatchStatus(status: string | undefined): boolean {
  return ["validating", "in_progress", "finalizing", "cancelling"].includes(status ?? "");
}

export function isTerminalOrActiveBatchStatus(status: string | undefined): boolean {
  return ["completed", "validating", "in_progress", "finalizing", "cancelling"].includes(status ?? "");
}

export function requireOpenAIKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing. Export it in your shell before running this script.");
  }

  return apiKey;
}

export async function openAIRequest<T>(
  pathOrUrl: string,
  options: RequestInit,
  apiKey = requireOpenAIKey()
): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${openaiApiBaseUrl}${pathOrUrl}`;
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    const body = contentType.includes("application/json")
      ? JSON.stringify(await response.json())
      : await response.text();
    throw new Error(`OpenAI API request failed (${response.status} ${response.statusText}): ${body}`);
  }

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function openAIFileContent(fileId: string, apiKey = requireOpenAIKey()): Promise<string> {
  const response = await fetch(`${openaiApiBaseUrl}/v1/files/${fileId}/content`, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download OpenAI file ${fileId}: ${response.status} ${await response.text()}`);
  }

  return response.text();
}

export function relativeToProject(filePath: string): string {
  return path.relative(projectRoot, filePath).split("\\").join("/");
}

export function resolveProjectPath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countLetters(value: string, pattern: RegExp): number {
  return [...value].filter((char) => pattern.test(char)).length;
}

export function jsonlEscape(value: unknown): string {
  return JSON.stringify(value);
}
