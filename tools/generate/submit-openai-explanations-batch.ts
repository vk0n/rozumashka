import { promises as fs } from "node:fs";
import path from "node:path";
import {
  batchEndpoint,
  batchIndexPath,
  batchInputPath,
  batchMetaPath,
  ensureExplanationsDir,
  getExplanationModel,
  getRequestedChunkNumber,
  isActiveBatchStatus,
  openAIRequest,
  pathExists,
  readBatchIndex,
  relativeToProject,
  resolveProjectPath,
  requireOpenAIKey,
  selectChunk,
  writeBatchIndex,
  writeBatchMetadata
} from "./openai-explanation-batch-common";
import type { BatchIndex, BatchMetadata } from "./openai-explanation-batch-common";

interface OpenAIFile {
  id: string;
  status?: string;
}

interface OpenAIBatch {
  id: string;
  status: string;
  endpoint: string;
  input_file_id: string;
  output_file_id?: string | null;
  error_file_id?: string | null;
  created_at?: number;
  request_counts?: unknown;
}

async function uploadBatchFile(filePath: string, apiKey: string): Promise<OpenAIFile> {
  const contents = await fs.readFile(filePath);
  const form = new FormData();
  form.append("purpose", "batch");
  form.append(
    "file",
    new globalThis.Blob([new Uint8Array(contents)], { type: "application/jsonl" }),
    path.basename(filePath)
  );

  return openAIRequest<OpenAIFile>(
    "/v1/files",
    {
      method: "POST",
      body: form
    },
    apiKey
  );
}

async function createBatch(inputFileId: string, apiKey: string, chunkNumber: number | null): Promise<OpenAIBatch> {
  return openAIRequest<OpenAIBatch>(
    "/v1/batches",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input_file_id: inputFileId,
        endpoint: batchEndpoint,
        completion_window: "24h",
        metadata: {
          project: "rozumashka",
          workflow: "explanation_style_v2",
          model: getExplanationModel(),
          ...(chunkNumber ? { chunk: String(chunkNumber) } : {})
        }
      })
    },
    apiKey
  );
}

async function readExistingMetadata(filePath: string): Promise<BatchMetadata | null> {
  if (!(await pathExists(filePath))) {
    return null;
  }

  return JSON.parse(await fs.readFile(filePath, "utf8")) as BatchMetadata;
}

function assertCanSubmit(existing: BatchMetadata | null, metaPath: string): void {
  if (!existing?.batchId) {
    return;
  }

  if (existing.status === "completed" || isActiveBatchStatus(existing.status)) {
    throw new Error(
      `Batch metadata already exists for ${existing.batchId} with status ${existing.status}. Use another chunk or wait/check before resubmitting ${relativeToProject(metaPath)}.`
    );
  }
}

function updateIndexAfterSubmit(
  index: BatchIndex,
  chunkNumber: number,
  uploadedFile: OpenAIFile,
  batch: OpenAIBatch
): BatchIndex {
  return {
    ...index,
    chunks: index.chunks.map((chunk) =>
      chunk.chunkNumber === chunkNumber
        ? {
            ...chunk,
            batchId: batch.id,
            inputFileId: uploadedFile.id,
            outputFileId: batch.output_file_id ?? null,
            errorFileId: batch.error_file_id ?? null,
            status: batch.status
          }
        : chunk
    )
  };
}

async function main() {
  await ensureExplanationsDir();
  const apiKey = requireOpenAIKey();
  const requestedChunk = getRequestedChunkNumber();
  const hasChunkIndex = await pathExists(batchIndexPath);
  let index: BatchIndex | null = null;
  let chunkNumber: number | null = null;
  let inputPath = batchInputPath;
  let metaPath = batchMetaPath;
  let rawOutputPath: string | undefined;
  let errorsPath: string | undefined;

  if (hasChunkIndex) {
    index = await readBatchIndex();
    const chunk = selectChunk(index, requestedChunk);
    chunkNumber = chunk.chunkNumber;
    inputPath = resolveProjectPath(chunk.inputPath);
    metaPath = resolveProjectPath(chunk.metaPath);
    rawOutputPath = chunk.rawOutputPath;
    errorsPath = chunk.errorsPath;
  } else if (requestedChunk) {
    throw new Error("Cannot use --chunk before running npm run explanations:create-openai-batch.");
  }

  if (!(await pathExists(inputPath))) {
    throw new Error("Missing data/explanations/openai-explanation-batch-input.jsonl. Run npm run explanations:create-openai-batch first.");
  }

  const stats = await fs.stat(inputPath);
  if (stats.size === 0) {
    throw new Error("Batch input file is empty. Run npm run explanations:create-openai-batch first.");
  }

  const existing = await readExistingMetadata(metaPath);
  assertCanSubmit(existing, metaPath);

  const uploadedFile = await uploadBatchFile(inputPath, apiKey);
  const batch = await createBatch(uploadedFile.id, apiKey, chunkNumber);

  const metadata: BatchMetadata = {
    chunkNumber: chunkNumber ?? undefined,
    batchId: batch.id,
    inputFileId: uploadedFile.id,
    outputFileId: batch.output_file_id ?? null,
    errorFileId: batch.error_file_id ?? null,
    status: batch.status,
    createdAt: new Date().toISOString(),
    endpoint: batch.endpoint,
    model: getExplanationModel(),
    inputPath: relativeToProject(inputPath),
    rawOutputPath,
    errorsPath,
    requestCounts: batch.request_counts,
    batch
  };

  await fs.writeFile(metaPath, `${JSON.stringify({ ...metadata, updatedAt: new Date().toISOString() }, null, 2)}\n`);
  await writeBatchMetadata(metadata);

  if (index && chunkNumber) {
    await writeBatchIndex(updateIndexAfterSubmit(index, chunkNumber, uploadedFile, batch));
  }

  console.log(`Uploaded input file: ${uploadedFile.id}`);
  console.log(`Created batch: ${batch.id}`);
  if (chunkNumber) {
    console.log(`Chunk: ${chunkNumber}`);
  }
  console.log(`Status: ${batch.status}`);
  console.log(`Wrote ${relativeToProject(metaPath)}`);
  console.log("Updated data/explanations/openai-explanation-batch-meta.json as latest-submitted metadata");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
