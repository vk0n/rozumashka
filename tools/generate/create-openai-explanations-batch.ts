import { promises as fs } from "node:fs";
import {
  batchEndpoint,
  batchIndexPath,
  batchInputPath,
  batchReportPath,
  ensureBatchChunksDir,
  defaultExplanationModel,
  ensureExplanationsDir,
  getBatchChunkSize,
  getChunkPaths,
  getExplanationModel,
  jsonlEscape,
  readExplanationInput,
  relativeToProject,
  resolveProjectPath,
  requiredTags
} from "./openai-explanation-batch-common";
import type { BatchIndex, ExplanationInputItem } from "./openai-explanation-batch-common";

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

function createSystemPrompt(): string {
  return `Generate a detailed educational explanation for one Ukrainian ЄВІ/ЄФВВ exam question.

Return only structured JSON matching the provided schema. No markdown fences. No extra commentary.

Do not change:
- question
- passage
- options
- correctAnswer
- id

Use the provided correctAnswer as the source of truth.

For Ukrainian subjects, write the explanation in Ukrainian.

For English questions:
- the question, passage, and options are in English
- write the explanation in Ukrainian
- you may quote short English words or phrases when useful

Required explanation structure:

Тут правильна відповідь — [LETTER]: “[correct option text]”.

1. Ключове поняття / Ключова ідея

...

2. Чому правильна відповідь — [LETTER]

...

3. Чому не інші варіанти

...

4. Як запам’ятати

...

Коротко:

...

Option letter rules:
For Ukrainian subjects:
0 = А
1 = Б
2 = В
3 = Г
4 = Д

For English:
0 = A
1 = B
2 = C
3 = D
4 = E

Subject-specific rules:

ТЗНК:
- Explain the logic step by step.
- Do not invent missing assumptions.
- If the answer cannot be clearly justified from the question/passage, set uncertain=true and add tag needs_explanation_review.
- If it is a sequence/pattern task, explain the pattern.
- If it is a constraint task, explain the elimination process.
- If it is a text inference task, explain the relevant idea from the text.

Англійська:
- Explain grammar/vocabulary/reading logic in Ukrainian.
- For grammar, explain the rule.
- For vocabulary, explain the meaning in context.
- For reading comprehension, explain the relevant idea from the passage in Ukrainian.
- Avoid overly technical grammar terms unless needed.

Управління та адміністрування:
- Explain the management/marketing/finance/HR/strategy concept clearly.
- Distinguish similar terms.
- Explain why distractors belong to other concepts or are not appropriate.

Психологія та соціологія:
- Explain the psychological or sociological concept clearly.
- Be careful with authors, theories, schools, and definitions.
- Do not invent theoretical claims.
- Do not misattribute authors.
- If unsure, set uncertain=true and add tag needs_explanation_review.

Length guidance:
- Simple definition questions: 120-220 words.
- Medium conceptual questions: 180-320 words.
- Complex ТЗНК / passage / applied questions: 250-450 words.
- Avoid unnecessary repetition.
- Explanation should be detailed enough to teach, but not bloated.

tagsToAdd must include: ${requiredTags.join(", ")}.
If uncertain=true, tagsToAdd must include needs_explanation_review.
For uncertain ТЗНК, also add tznk_explanation_uncertain.`;
}

function createUserPayload(candidate: ExplanationInputItem): string {
  return JSON.stringify(
    {
      id: candidate.id,
      subject: candidate.subject,
      type: candidate.type,
      topic: candidate.topic,
      subtopic: candidate.subtopic,
      question: candidate.question,
      passage: candidate.passage,
      options: candidate.options,
      correctAnswer: candidate.correctAnswer,
      correctLetter: candidate.correctLetter,
      correctOption: candidate.correctOption,
      currentExplanation: candidate.currentExplanation,
      currentExplanationByOption: candidate.currentExplanationByOption,
      sourceType: candidate.sourceType,
      tags: candidate.tags,
      weakReasons: candidate.weakReasons
    },
    null,
    2
  );
}

function createRequest(candidate: ExplanationInputItem, model: string) {
  return {
    custom_id: candidate.id,
    method: "POST",
    url: batchEndpoint,
    body: {
      model,
      temperature: 0.2,
      max_completion_tokens: 2200,
      messages: [
        {
          role: "system",
          content: createSystemPrompt()
        },
        {
          role: "user",
          content: createUserPayload(candidate)
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "explanation_style_v2_output",
          strict: true,
          schema: outputJsonSchema
        }
      }
    }
  };
}

async function main() {
  await ensureExplanationsDir();
  await ensureBatchChunksDir();
  const candidates = await readExplanationInput();

  if (candidates.length === 0) {
    throw new Error("No explanation candidates found. Run npm run explanations:prepare first.");
  }

  const model = getExplanationModel();
  const chunkSize = getBatchChunkSize();
  const chunks: BatchIndex["chunks"] = [];

  for (let startIndex = 0; startIndex < candidates.length; startIndex += chunkSize) {
    const chunkCandidates = candidates.slice(startIndex, startIndex + chunkSize);
    const chunkNumber = chunks.length + 1;
    const paths = getChunkPaths(chunkNumber);
    const lines = chunkCandidates.map((candidate) => jsonlEscape(createRequest(candidate, model)));

    await fs.writeFile(paths.inputPath, `${lines.join("\n")}\n`);

    chunks.push({
      chunkNumber,
      requestCount: chunkCandidates.length,
      startIndex,
      endIndex: startIndex + chunkCandidates.length - 1,
      inputPath: relativeToProject(paths.inputPath),
      metaPath: relativeToProject(paths.metaPath),
      rawOutputPath: relativeToProject(paths.rawOutputPath),
      errorsPath: relativeToProject(paths.errorsPath),
      status: "not_submitted"
    });
  }

  const firstChunk = chunks[0];
  if (!firstChunk) {
    throw new Error("No batch chunks were created.");
  }

  await fs.copyFile(resolveProjectPath(firstChunk.inputPath), batchInputPath);

  const index: BatchIndex = {
    createdAt: new Date().toISOString(),
    endpoint: batchEndpoint,
    model,
    chunkSize,
    totalCandidates: candidates.length,
    chunks
  };

  await fs.writeFile(batchIndexPath, `${JSON.stringify(index, null, 2)}\n`);

  const bySubject = new Map<string, number>();
  for (const candidate of candidates) {
    bySubject.set(candidate.subject, (bySubject.get(candidate.subject) ?? 0) + 1);
  }

  const report = `# OpenAI Explanation Batch Report

Generated on ${new Date().toISOString()}.

## Batch Input

- Total candidates: ${candidates.length}
- Model: ${model}
- Default model if env is unset: ${defaultExplanationModel}
- Endpoint: ${batchEndpoint}
- Chunk size: ${chunkSize}
- Total chunks: ${chunks.length}
- Batch index: \`${relativeToProject(batchIndexPath)}\`
- Legacy first-chunk JSONL: \`data/explanations/openai-explanation-batch-input.jsonl\`
- Structured output: Chat Completions \`response_format: json_schema\`

## Chunk Files

${chunks
  .map(
    (chunk) =>
      `- Chunk ${chunk.chunkNumber}: ${chunk.requestCount} requests, input \`${chunk.inputPath}\``
  )
  .join("\n")}

## Counts By Subject

${[...bySubject.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([subject, count]) => `- ${subject}: ${count}`)
  .join("\n")}

## Next Command

Submit one chunk at a time. Wait until it completes before submitting the next chunk if the OpenAI organization token queue is tight.

\`\`\`bash
OPENAI_API_KEY=... npm run explanations:submit-openai-batch -- --chunk 1
\`\`\`

To make smaller chunks, regenerate with:

\`\`\`bash
OPENAI_BATCH_CHUNK_SIZE=250 npm run explanations:create-openai-batch
\`\`\`
`;

  await fs.writeFile(batchReportPath, report);

  console.log(`Created ${candidates.length} OpenAI Batch requests in ${chunks.length} chunks.`);
  console.log(`Model: ${model}`);
  console.log(`Chunk size: ${chunkSize}`);
  console.log("Wrote data/explanations/openai-explanation-batch-index.json");
  console.log("Wrote data/explanations/openai-batches/openai-explanation-batch-*.jsonl");
  console.log("Wrote data/explanations/openai-explanation-batch-input.jsonl as first-chunk compatibility copy");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
