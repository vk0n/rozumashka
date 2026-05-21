import { promises as fs } from "node:fs";
import path from "node:path";
import {
  batchEndpoint,
  ensureBatchChunksDir,
  ensureExplanationsDir,
  explanationOutputPath,
  getChunkPaths,
  getExplanationModel,
  jsonlEscape,
  pathExists,
  projectRoot,
  readBatchIndex,
  readExplanationInput,
  readJson,
  relativeToProject,
  requiredTags,
  writeBatchIndex
} from "./openai-explanation-batch-common";
import type { BatchIndex, ExplanationInputItem } from "./openai-explanation-batch-common";

const retryReportPath = path.join(
  projectRoot,
  "data",
  "explanations",
  "openai-explanation-retry-report.md"
);

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

This is a retry for an output that failed automated normalization. Be extra careful:
- Include every required section exactly once.
- Mention the exact correct option letter and correct option text in the first sentence.
- Do not mention AI, language models, or inability to answer.
- Return explanationByOption as [] unless you provide exactly one explanation for every option in the input options array.
- If you provide explanationByOption, its length must exactly match options.length.

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

function findReusableRetryChunk(index: BatchIndex): BatchIndex["chunks"][number] | null {
  return index.chunks.find((chunk) => chunk.status === "retry_not_submitted") ?? null;
}

async function main() {
  await ensureExplanationsDir();
  await ensureBatchChunksDir();

  if (!(await pathExists(explanationOutputPath))) {
    throw new Error("Missing data/explanations/explanation-improvement-output.json. Run npm run explanations:normalize-openai-output first.");
  }

  const candidates = await readExplanationInput();
  const acceptedRecords = await readJson<Array<{ id: string }>>(explanationOutputPath);
  const acceptedIds = new Set(acceptedRecords.map((record) => record.id));
  const retryCandidates = candidates.filter((candidate) => !acceptedIds.has(candidate.id));

  if (retryCandidates.length === 0) {
    console.log("No rejected explanation candidates found. Nothing to retry.");
    return;
  }

  const index = await readBatchIndex();
  const reusableChunk = findReusableRetryChunk(index);
  const chunkNumber =
    reusableChunk?.chunkNumber ?? Math.max(...index.chunks.map((chunk) => chunk.chunkNumber)) + 1;
  const paths = getChunkPaths(chunkNumber);
  const model = getExplanationModel();
  const lines = retryCandidates.map((candidate) => jsonlEscape(createRequest(candidate, model)));

  await fs.writeFile(paths.inputPath, `${lines.join("\n")}\n`);

  const updatedChunk: BatchIndex["chunks"][number] = {
    chunkNumber,
    requestCount: retryCandidates.length,
    startIndex: 0,
    endIndex: retryCandidates.length - 1,
    inputPath: relativeToProject(paths.inputPath),
    metaPath: relativeToProject(paths.metaPath),
    rawOutputPath: relativeToProject(paths.rawOutputPath),
    errorsPath: relativeToProject(paths.errorsPath),
    status: "retry_not_submitted"
  };

  const updatedIndex: BatchIndex = {
    ...index,
    chunks: reusableChunk
      ? index.chunks.map((chunk) => (chunk.chunkNumber === reusableChunk.chunkNumber ? updatedChunk : chunk))
      : [...index.chunks, updatedChunk]
  };

  await writeBatchIndex(updatedIndex);

  const bySubject = new Map<string, number>();
  for (const candidate of retryCandidates) {
    bySubject.set(candidate.subject, (bySubject.get(candidate.subject) ?? 0) + 1);
  }

  const report = `# OpenAI Explanation Retry Report

Generated on ${new Date().toISOString()}.

## Summary

- Retry candidates: ${retryCandidates.length}
- Retry chunk: ${chunkNumber}
- Model: ${model}
- Endpoint: ${batchEndpoint}
- Input JSONL: \`${relativeToProject(paths.inputPath)}\`

## Counts By Subject

${[...bySubject.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([subject, count]) => `- ${subject}: ${count}`)
  .join("\n")}

## Retried IDs

${retryCandidates.map((candidate) => `- ${candidate.id}`).join("\n")}

## Next Commands

\`\`\`bash
OPENAI_API_KEY=... npm run explanations:submit-openai-batch -- --chunk ${chunkNumber}
OPENAI_API_KEY=... npm run explanations:check-openai-batch -- --chunk ${chunkNumber}
OPENAI_API_KEY=... npm run explanations:download-openai-batch -- --chunk ${chunkNumber}
npm run explanations:normalize-openai-output
\`\`\`
`;

  await fs.writeFile(retryReportPath, report);

  console.log(`Created retry chunk ${chunkNumber} with ${retryCandidates.length} requests.`);
  console.log(`Model: ${model}`);
  console.log(`Wrote ${relativeToProject(paths.inputPath)}`);
  console.log(`Updated data/explanations/openai-explanation-batch-index.json`);
  console.log(`Wrote ${relativeToProject(retryReportPath)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
