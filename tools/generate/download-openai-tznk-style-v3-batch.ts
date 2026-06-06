import { promises as fs } from "node:fs";
import {
  batchErrorsPath,
  batchRawOutputPath,
  openAIFileContent,
  pathExists,
  readMetadata,
  requireOpenAIKey,
  writeMetadata
} from "./tznk-style-v3-common";

function hasForceFlag(): boolean {
  return process.argv.includes("--force");
}

async function hasContent(filePath: string): Promise<boolean> {
  return (await pathExists(filePath)) && (await fs.stat(filePath)).size > 0;
}

async function main(): Promise<void> {
  const apiKey = requireOpenAIKey();
  const metadata = await readMetadata();
  const force = hasForceFlag();

  if (metadata.status !== "completed") {
    throw new Error(`ТЗНК style-v3 batch is not completed. Current status: ${metadata.status}.`);
  }

  if (!metadata.outputFileId) {
    throw new Error("ТЗНК style-v3 metadata does not contain outputFileId.");
  }

  if (!force && (await hasContent(batchRawOutputPath))) {
    throw new Error("Raw output already exists. Re-run with --force to overwrite.");
  }

  const output = await openAIFileContent(metadata.outputFileId, apiKey);
  await fs.writeFile(batchRawOutputPath, output.endsWith("\n") ? output : `${output}\n`, "utf8");

  if (metadata.errorFileId) {
    if (!force && (await hasContent(batchErrorsPath))) {
      throw new Error("Error output already exists. Re-run with --force to overwrite.");
    }

    const errors = await openAIFileContent(metadata.errorFileId, apiKey);
    await fs.writeFile(batchErrorsPath, errors.endsWith("\n") ? errors : `${errors}\n`, "utf8");
  }

  await writeMetadata({
    ...metadata,
    status: "downloaded",
    updatedAt: new Date().toISOString()
  });

  console.log("Downloaded ТЗНК style-v3 batch output.");
  console.log(
    "Raw output: data/explanations/tznk-style-v3-batch-1/openai-explanation-batch-raw-output.jsonl"
  );
  console.log(metadata.errorFileId ? "Downloaded the error file." : "No error file was present.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
