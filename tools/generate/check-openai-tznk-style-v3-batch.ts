import {
  openAIRequest,
  readMetadata,
  requireOpenAIKey,
  writeMetadata
} from "./tznk-style-v3-common";

interface OpenAIBatch {
  id: string;
  status: string;
  endpoint: string;
  output_file_id?: string | null;
  error_file_id?: string | null;
  request_counts?: {
    total?: number;
    completed?: number;
    failed?: number;
  };
}

async function main(): Promise<void> {
  const apiKey = requireOpenAIKey();
  const metadata = await readMetadata();

  if (!metadata.batchId) {
    throw new Error("ТЗНК style-v3 metadata does not contain batchId. Submit first.");
  }

  const batch = await openAIRequest<OpenAIBatch>(
    `/v1/batches/${metadata.batchId}`,
    { method: "GET" },
    apiKey
  );

  await writeMetadata({
    ...metadata,
    status: batch.status,
    outputFileId: batch.output_file_id ?? null,
    errorFileId: batch.error_file_id ?? null,
    requestCounts: batch.request_counts,
    batch,
    updatedAt: new Date().toISOString()
  });

  console.log(`Batch: ${batch.id}`);
  console.log(`Status: ${batch.status}`);
  console.log(`Endpoint: ${batch.endpoint}`);
  console.log(
    `Requests: total=${batch.request_counts?.total ?? 0}, completed=${batch.request_counts?.completed ?? 0}, failed=${batch.request_counts?.failed ?? 0}`
  );

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
