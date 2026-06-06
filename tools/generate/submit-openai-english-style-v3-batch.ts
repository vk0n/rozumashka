import { promises as fs } from "node:fs";
import path from "node:path";
import {
  batchEndpoint,
  batchInputPath,
  getExplanationModel,
  openAIRequest,
  pathExists,
  readMetadata,
  requireOpenAIKey,
  writeMetadata
} from "./english-style-v3-common";

interface OpenAIFile {
  id: string;
}

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

async function uploadBatchFile(apiKey: string): Promise<OpenAIFile> {
  const contents = await fs.readFile(batchInputPath);
  const form = new FormData();
  form.append("purpose", "batch");
  form.append(
    "file",
    new globalThis.Blob([new Uint8Array(contents)], { type: "application/jsonl" }),
    path.basename(batchInputPath)
  );

  return openAIRequest<OpenAIFile>("/v1/files", { method: "POST", body: form }, apiKey);
}

async function main(): Promise<void> {
  const apiKey = requireOpenAIKey();
  const metadata = await readMetadata();

  if (!(await pathExists(batchInputPath))) {
    throw new Error("Missing English style-v3 batch input. Create it first.");
  }

  const stats = await fs.stat(batchInputPath);
  if (stats.size === 0) {
    throw new Error("English style-v3 batch input is empty.");
  }

  if (metadata.batchId) {
    throw new Error(`Batch ${metadata.batchId} already exists with status ${metadata.status}.`);
  }

  const uploadedFile = await uploadBatchFile(apiKey);
  const batch = await openAIRequest<OpenAIBatch>(
    "/v1/batches",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input_file_id: uploadedFile.id,
        endpoint: batchEndpoint,
        completion_window: "24h",
        metadata: {
          project: "rozumashka",
          workflow: "english_explanation_style_v3_batch_1",
          model: getExplanationModel()
        }
      })
    },
    apiKey
  );

  await writeMetadata({
    ...metadata,
    batchId: batch.id,
    inputFileId: uploadedFile.id,
    outputFileId: batch.output_file_id ?? null,
    errorFileId: batch.error_file_id ?? null,
    status: batch.status,
    endpoint: batch.endpoint,
    model: getExplanationModel(),
    requestCounts: batch.request_counts,
    batch,
    updatedAt: new Date().toISOString()
  });

  console.log(`Uploaded input file: ${uploadedFile.id}`);
  console.log(`Created batch: ${batch.id}`);
  console.log(`Status: ${batch.status}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
