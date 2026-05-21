import {
  batchIndexPath,
  batchMetaPath,
  getRequestedChunkNumber,
  readBatchMetadata,
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
import { promises as fs } from "node:fs";
import type { BatchIndex, BatchMetadata } from "./openai-explanation-batch-common";

interface OpenAIBatch {
  id: string;
  status: string;
  endpoint: string;
  input_file_id: string;
  output_file_id?: string | null;
  error_file_id?: string | null;
  request_counts?: {
    total?: number;
    completed?: number;
    failed?: number;
  };
}

async function readMetadataForCheck(): Promise<{
  metadata: BatchMetadata;
  metaPath: string;
  index: BatchIndex | null;
  chunkNumber: number | null;
}> {
  const requestedChunk = getRequestedChunkNumber();

  if (await pathExists(batchIndexPath)) {
    const index = await readBatchIndex();
    const latestMetadata = (await pathExists(batchMetaPath))
      ? (JSON.parse(await fs.readFile(batchMetaPath, "utf8")) as BatchMetadata)
      : null;
    const chunk =
      requestedChunk !== null
        ? selectChunk(index, requestedChunk)
        : index.chunks.find((candidate) => candidate.chunkNumber === latestMetadata?.chunkNumber) ??
          [...index.chunks].reverse().find((candidate) => Boolean(candidate.batchId)) ??
          selectChunk(index, null);
    const metaPath = resolveProjectPath(chunk.metaPath);

    if (!(await pathExists(metaPath))) {
      throw new Error(`Missing ${chunk.metaPath}. Submit chunk ${chunk.chunkNumber} first.`);
    }

    const metadata = JSON.parse(await fs.readFile(metaPath, "utf8")) as BatchMetadata;
    return {
      metadata,
      metaPath,
      index,
      chunkNumber: chunk.chunkNumber
    };
  }

  if (requestedChunk) {
    throw new Error("Cannot use --chunk before running npm run explanations:create-openai-batch.");
  }

  return {
    metadata: await readBatchMetadata(),
    metaPath: batchMetaPath,
    index: null,
    chunkNumber: null
  };
}

function updateIndexAfterCheck(index: BatchIndex, chunkNumber: number, batch: OpenAIBatch): BatchIndex {
  return {
    ...index,
    chunks: index.chunks.map((chunk) =>
      chunk.chunkNumber === chunkNumber
        ? {
            ...chunk,
            batchId: batch.id,
            inputFileId: batch.input_file_id,
            outputFileId: batch.output_file_id ?? null,
            errorFileId: batch.error_file_id ?? null,
            status: batch.status
          }
        : chunk
    )
  };
}

async function main() {
  const apiKey = requireOpenAIKey();
  const { metadata, metaPath, index, chunkNumber } = await readMetadataForCheck();

  if (!metadata.batchId) {
    throw new Error("Batch metadata does not contain batchId.");
  }

  const batch = await openAIRequest<OpenAIBatch>(
    `/v1/batches/${metadata.batchId}`,
    { method: "GET" },
    apiKey
  );

  const updatedMetadata: BatchMetadata = {
    ...metadata,
    status: batch.status,
    outputFileId: batch.output_file_id ?? null,
    errorFileId: batch.error_file_id ?? null,
    requestCounts: batch.request_counts,
    batch
  };

  await fs.writeFile(metaPath, `${JSON.stringify({ ...updatedMetadata, updatedAt: new Date().toISOString() }, null, 2)}\n`);
  await writeBatchMetadata(updatedMetadata);

  if (index && chunkNumber) {
    await writeBatchIndex(updateIndexAfterCheck(index, chunkNumber, batch));
  }

  console.log(`Batch: ${batch.id}`);
  if (chunkNumber) {
    console.log(`Chunk: ${chunkNumber}`);
  }
  console.log(`Status: ${batch.status}`);
  console.log(`Endpoint: ${batch.endpoint}`);
  console.log(`Metadata: ${relativeToProject(metaPath)}`);

  if (batch.request_counts) {
    console.log(
      `Requests: total=${batch.request_counts.total ?? 0}, completed=${batch.request_counts.completed ?? 0}, failed=${batch.request_counts.failed ?? 0}`
    );
  }

  if (batch.output_file_id) {
    console.log(`Output file: ${batch.output_file_id}`);
  }

  if (batch.error_file_id) {
    console.log(`Error file: ${batch.error_file_id}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
