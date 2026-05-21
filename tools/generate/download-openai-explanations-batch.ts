import { promises as fs } from "node:fs";
import {
  batchIndexPath,
  batchErrorsPath,
  batchMetaPath,
  batchRawOutputPath,
  getRequestedChunkNumber,
  openAIFileContent,
  pathExists,
  readBatchIndex,
  readBatchMetadata,
  requireOpenAIKey,
  relativeToProject,
  resolveProjectPath,
  selectChunk,
  writeBatchIndex,
  writeBatchMetadata
} from "./openai-explanation-batch-common";
import type { BatchIndex, BatchMetadata } from "./openai-explanation-batch-common";

function hasForceFlag(): boolean {
  return process.argv.includes("--force");
}

async function assertCanWrite(filePath: string, force: boolean): Promise<void> {
  if (!force && (await pathExists(filePath))) {
    throw new Error(`${relativeToProject(filePath)} already exists. Re-run with --force to overwrite.`);
  }
}

async function readMetadataForDownload(): Promise<{
  metadata: BatchMetadata;
  metaPath: string;
  rawOutputPath: string;
  errorsPath: string;
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
      throw new Error(`Missing ${chunk.metaPath}. Submit and check chunk ${chunk.chunkNumber} first.`);
    }

    const metadata = JSON.parse(await fs.readFile(metaPath, "utf8")) as BatchMetadata;
    return {
      metadata,
      metaPath,
      rawOutputPath: resolveProjectPath(chunk.rawOutputPath),
      errorsPath: resolveProjectPath(chunk.errorsPath),
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
    rawOutputPath: batchRawOutputPath,
    errorsPath: batchErrorsPath,
    index: null,
    chunkNumber: null
  };
}

function updateIndexAfterDownload(index: BatchIndex, chunkNumber: number, metadata: BatchMetadata): BatchIndex {
  return {
    ...index,
    chunks: index.chunks.map((chunk) =>
      chunk.chunkNumber === chunkNumber
        ? {
            ...chunk,
            outputFileId: metadata.outputFileId,
            errorFileId: metadata.errorFileId,
            status: metadata.status
          }
        : chunk
    )
  };
}

async function main() {
  const apiKey = requireOpenAIKey();
  const force = hasForceFlag();
  const { metadata, metaPath, rawOutputPath, errorsPath, index, chunkNumber } = await readMetadataForDownload();

  if (metadata.status !== "completed") {
    throw new Error(`Batch is not completed yet. Current status: ${metadata.status ?? "unknown"}. Run npm run explanations:check-openai-batch first.`);
  }

  if (!metadata.outputFileId) {
    throw new Error("Batch metadata does not contain outputFileId.");
  }

  await assertCanWrite(rawOutputPath, force);

  const output = await openAIFileContent(metadata.outputFileId, apiKey);
  await fs.writeFile(rawOutputPath, output.endsWith("\n") ? output : `${output}\n`);

  let downloadedErrorFile = false;
  if (metadata.errorFileId) {
    await assertCanWrite(errorsPath, force);
    const errors = await openAIFileContent(metadata.errorFileId, apiKey);
    await fs.writeFile(errorsPath, errors.endsWith("\n") ? errors : `${errors}\n`);
    downloadedErrorFile = true;
  }

  const updatedMetadata: BatchMetadata = {
    ...metadata,
    rawOutputPath: relativeToProject(rawOutputPath),
    errorsPath: downloadedErrorFile ? relativeToProject(errorsPath) : metadata.errorsPath
  };

  await fs.writeFile(metaPath, `${JSON.stringify({ ...updatedMetadata, updatedAt: new Date().toISOString() }, null, 2)}\n`);
  await writeBatchMetadata(updatedMetadata);

  if (index && chunkNumber) {
    await writeBatchIndex(updateIndexAfterDownload(index, chunkNumber, updatedMetadata));
  }

  if (chunkNumber) {
    console.log(`Chunk: ${chunkNumber}`);
  }
  console.log(`Downloaded output to ${relativeToProject(rawOutputPath)}`);
  if (downloadedErrorFile) {
    console.log(`Downloaded errors to ${relativeToProject(errorsPath)}`);
  } else {
    console.log("No error file was present in the batch metadata.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
