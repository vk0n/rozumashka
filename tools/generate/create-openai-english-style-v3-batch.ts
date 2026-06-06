import { promises as fs } from "node:fs";
import {
  batchEndpoint,
  batchInputPath,
  getExplanationModel,
  inputPath,
  outputRecordSchema,
  pathExists,
  promptPath,
  readCandidates,
  readMetadata,
  writeMetadata
} from "./english-style-v3-common";

const outputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "improvedExplanation",
    "explanationByOption",
    "tagsToAdd",
    "uncertain",
    "notes"
  ],
  properties: {
    id: { type: "string" },
    improvedExplanation: { type: "string" },
    explanationByOption: {
      type: "array",
      items: { type: "string" }
    },
    tagsToAdd: {
      type: "array",
      items: { type: "string" }
    },
    uncertain: { type: "boolean" },
    notes: { type: "string" }
  }
};

async function main(): Promise<void> {
  const candidates = await readCandidates();
  const metadata = await readMetadata();

  if (candidates.length === 0) {
    throw new Error("No English style-v3 candidates were found.");
  }

  if (metadata.batchId) {
    throw new Error(`Batch ${metadata.batchId} already exists with status ${metadata.status}.`);
  }

  if (!(await pathExists(promptPath))) {
    throw new Error("Missing English style-v3 prompt. Run npm run explanations:prepare-english-v3 first.");
  }

  const prompt = await fs.readFile(promptPath, "utf8");
  const model = getExplanationModel();
  const lines = candidates.map((candidate) =>
    JSON.stringify({
      custom_id: candidate.id,
      method: "POST",
      url: batchEndpoint,
      body: {
        model,
        temperature: 0.2,
        max_completion_tokens: 3500,
        messages: [
          {
            role: "system",
            content: prompt
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                id: candidate.id,
                subject: candidate.subject,
                type: candidate.type,
                question: candidate.question,
                passage: candidate.passage,
                options: candidate.options,
                correctAnswer: candidate.correctAnswer,
                currentExplanation: candidate.currentExplanation,
                sourceType: candidate.sourceType,
                sourceUrl: candidate.sourceUrl,
                tags: candidate.tags
              },
              null,
              2
            )
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "english_explanation_style_v3_output",
            strict: true,
            schema: outputJsonSchema
          }
        }
      }
    })
  );

  outputRecordSchema.parse({
    id: "schema-check",
    improvedExplanation: "schema-check",
    explanationByOption: [],
    tagsToAdd: [],
    uncertain: false,
    notes: ""
  });

  await fs.writeFile(batchInputPath, `${lines.join("\n")}\n`, "utf8");
  await writeMetadata({
    ...metadata,
    status: "created",
    model,
    endpoint: batchEndpoint,
    inputPath: "data/explanations/english-style-v3-batch-1/openai-explanation-batch-input.jsonl",
    candidateCount: candidates.length,
    updatedAt: new Date().toISOString()
  });

  console.log(`Created ${candidates.length} English style-v3 Batch requests.`);
  console.log(`Model: ${model}`);
  console.log(`Input: ${inputPath}`);
  console.log("OpenAI batch was not submitted.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
