import { promises as fs } from "node:fs";
import {
  batchEndpoint,
  batchInputPath,
  getExplanationModel,
  pathExists,
  promptPath,
  readCandidates,
  readMetadata,
  writeMetadata
} from "./tznk-style-v3-common";

const outputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "improvedExplanation",
    "explanationByOption",
    "rulesSectionMode",
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
    rulesSectionMode: {
      type: "string",
      enum: ["reusable_rules", "no_general_rule"]
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
    throw new Error("No ТЗНК style-v3 candidates were found.");
  }

  if (metadata.batchId) {
    throw new Error(`Batch ${metadata.batchId} already exists with status ${metadata.status}.`);
  }

  if (!(await pathExists(promptPath))) {
    throw new Error("Missing ТЗНК style-v3 prompt. Prepare the batch first.");
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
        temperature: 0.1,
        max_completion_tokens: 4200,
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
            name: "tznk_explanation_style_v3_output",
            strict: true,
            schema: outputJsonSchema
          }
        }
      }
    })
  );

  await fs.writeFile(batchInputPath, `${lines.join("\n")}\n`, "utf8");
  await writeMetadata({
    ...metadata,
    status: "created",
    model,
    endpoint: batchEndpoint,
    candidateCount: candidates.length,
    updatedAt: new Date().toISOString()
  });

  console.log(`Created ${candidates.length} ТЗНК style-v3 Batch requests.`);
  console.log(`Model: ${model}`);
  console.log("OpenAI batch was not submitted.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
