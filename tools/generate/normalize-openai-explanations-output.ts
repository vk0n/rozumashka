import { promises as fs } from "node:fs";
import { z } from "zod";
import {
  batchErrorsPath,
  batchIndexPath,
  batchNormalizedOutputPath,
  batchRawOutputPath,
  batchReportPath,
  countLetters,
  explanationOutputPath,
  explanationOutputRecordSchema,
  normalizeText,
  pathExists,
  readBatchIndex,
  readBatchMetadata,
  readExplanationInput,
  relativeToProject,
  resolveProjectPath,
  requiredTags,
  type BatchIndex,
  type ExplanationInputItem,
  type ExplanationOutputRecord,
  type NormalizedExplanationRecord,
  type RejectedBatchOutput,
  writeJson
} from "./openai-explanation-batch-common";

const batchOutputLineSchema = z.object({
  id: z.string().optional(),
  custom_id: z.string().optional(),
  response: z
    .object({
      status_code: z.number(),
      request_id: z.string().optional(),
      body: z.unknown().optional()
    })
    .nullable()
    .optional(),
  error: z.unknown().nullable().optional()
});

interface RawBatchOutputEntry {
  rawLine: unknown;
  chunkNumber?: number;
  sourcePath: string;
}

interface RawBatchOutputSources {
  entries: RawBatchOutputEntry[];
  sourcePaths: string[];
  errorLineCount: number;
  missingChunks: number[];
  index: BatchIndex | null;
}

function parseJsonl(raw: string): unknown[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

function extractMessageContent(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const message = (choices[0] as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    return null;
  }

  const content = (message as { content?: unknown }).content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
          return (part as { text: string }).text;
        }

        return "";
      })
      .join("");
  }

  return null;
}

function stripJsonFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function optionTextMentioned(explanation: string, option: string): boolean {
  const normalizedExplanation = normalizeText(explanation);
  const normalizedOption = normalizeText(option);

  if (!normalizedOption) {
    return false;
  }

  if (normalizedOption.length <= 140) {
    return normalizedExplanation.includes(normalizedOption);
  }

  return normalizedExplanation.includes(normalizedOption.slice(0, 140).trim());
}

function firstLineMentionsCorrectLetter(explanation: string, letter: string): boolean {
  const firstLine = explanation.trim().split(/\r?\n/)[0] ?? "";
  const escaped = letter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:—|-|:)\\s*${escaped}(?:\\b|:)`, "u").test(firstLine);
}

function isMostlyUkrainian(explanation: string): boolean {
  const cyrillic = countLetters(explanation, /\p{Script=Cyrillic}/u);
  const latin = countLetters(explanation, /\p{Script=Latin}/u);
  const total = cyrillic + latin;

  if (total === 0) {
    return false;
  }

  return cyrillic >= 120 && cyrillic / total >= 0.35;
}

function hasRequiredSections(explanation: string): boolean {
  return (
    explanation.includes("Тут правильна відповідь") &&
    explanation.includes("Ключ") &&
    explanation.includes("Чому правильна відповідь") &&
    explanation.includes("Чому не інші варіанти") &&
    explanation.includes("Як запам’ятати") &&
    explanation.includes("Коротко")
  );
}

function containsForbiddenMetaLanguage(explanation: string): boolean {
  return /(\bAI\b|штучн(?:ий|ого|ому)? інтелект|мовна модель|language model|не можу відповісти|cannot answer|can't answer|як модель)/iu.test(
    explanation
  );
}

function validateRecordForCandidate(
  record: ExplanationOutputRecord,
  candidate: ExplanationInputItem
): string[] {
  const reasons: string[] = [];
  const explanation = record.improvedExplanation.trim();

  if (!hasRequiredSections(explanation)) {
    reasons.push("missing_required_sections");
  }

  if (!firstLineMentionsCorrectLetter(explanation, candidate.correctLetter)) {
    reasons.push("missing_correct_option_letter");
  }

  if (!optionTextMentioned(explanation, candidate.correctOption)) {
    reasons.push("missing_correct_option_text");
  }

  if (candidate.subject === "english" && !isMostlyUkrainian(explanation)) {
    reasons.push("english_explanation_not_mostly_ukrainian");
  }

  if (containsForbiddenMetaLanguage(explanation)) {
    reasons.push("forbidden_meta_language");
  }

  if (/Офіційне джерело позначає цей варіант як правильний|пояснення в джерелі не наведено/iu.test(explanation)) {
    reasons.push("old_placeholder_text");
  }

  if (
    record.explanationByOption.length > 0 &&
    record.explanationByOption.length !== candidate.options.length
  ) {
    reasons.push("explanation_by_option_length_mismatch");
  }

  return reasons;
}

const softValidationReasons = new Set([
  "explanation_by_option_length_mismatch",
  "forbidden_meta_language",
  "missing_correct_option_text",
  "missing_required_sections"
]);

function hasOnlySoftValidationReasons(reasons: string[]): boolean {
  return reasons.length > 0 && reasons.every((reason) => softValidationReasons.has(reason));
}

function normalizeTags(
  record: ExplanationOutputRecord,
  candidate: ExplanationInputItem,
  softAcceptedReasons: string[] = []
): string[] {
  const tags = new Set([...(record.tagsToAdd ?? []), ...requiredTags]);

  if (record.uncertain) {
    tags.add("needs_explanation_review");

    if (candidate.subject === "tznk") {
      tags.add("tznk_explanation_uncertain");
    }
  }

  if (softAcceptedReasons.length > 0) {
    tags.add("openai_explanation_soft_accepted");
    tags.add("explanation_validation_warning");

    for (const reason of softAcceptedReasons) {
      tags.add(`explanation_warning_${reason}`);
    }
  }

  return [...tags].sort();
}

async function maybeReadMetadata() {
  try {
    return await readBatchMetadata();
  } catch {
    return null;
  }
}

async function readRawBatchOutputSources(): Promise<RawBatchOutputSources> {
  if (await pathExists(batchIndexPath)) {
    const index = await readBatchIndex();
    const entries: RawBatchOutputEntry[] = [];
    const sourcePaths: string[] = [];
    const missingChunks: number[] = [];
    let errorLineCount = 0;

    for (const chunk of index.chunks) {
      const rawOutputPath = resolveProjectPath(chunk.rawOutputPath);

      if (!(await pathExists(rawOutputPath))) {
        missingChunks.push(chunk.chunkNumber);
        continue;
      }

      const rawLines = parseJsonl(await fs.readFile(rawOutputPath, "utf8"));
      sourcePaths.push(relativeToProject(rawOutputPath));
      entries.push(
        ...rawLines.map((rawLine) => ({
          rawLine,
          chunkNumber: chunk.chunkNumber,
          sourcePath: relativeToProject(rawOutputPath)
        }))
      );

      const errorsPath = resolveProjectPath(chunk.errorsPath);
      if (await pathExists(errorsPath)) {
        errorLineCount += parseJsonl(await fs.readFile(errorsPath, "utf8")).length;
      }
    }

    if (entries.length === 0) {
      throw new Error("No downloaded chunk output files found in data/explanations/openai-batches/. Download completed chunks first.");
    }

    return {
      entries,
      sourcePaths,
      errorLineCount,
      missingChunks,
      index
    };
  }

  if (!(await pathExists(batchRawOutputPath))) {
    throw new Error("Missing data/explanations/openai-explanation-batch-raw-output.jsonl. Download batch results first.");
  }

  const rawLines = parseJsonl(await fs.readFile(batchRawOutputPath, "utf8"));
  const errorLineCount = (await pathExists(batchErrorsPath))
    ? parseJsonl(await fs.readFile(batchErrorsPath, "utf8")).length
    : 0;

  return {
    entries: rawLines.map((rawLine) => ({
      rawLine,
      sourcePath: relativeToProject(batchRawOutputPath)
    })),
    sourcePaths: [relativeToProject(batchRawOutputPath)],
    errorLineCount,
    missingChunks: [],
    index: null
  };
}

async function main() {
  const candidates = await readExplanationInput();
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const rawSources = await readRawBatchOutputSources();
  const metadata = await maybeReadMetadata();

  const normalized: NormalizedExplanationRecord[] = [];
  const rejected: RejectedBatchOutput[] = [];
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();

  const softAcceptedReasons = new Map<string, string[]>();

  for (const { rawLine, chunkNumber } of [...rawSources.entries].reverse()) {
    const line = batchOutputLineSchema.safeParse(rawLine);

    if (!line.success) {
      rejected.push({
        chunkNumber,
        reasons: ["invalid_batch_output_line"],
        raw: rawLine
      });
      continue;
    }

    const customId = line.data.custom_id;
    const response = line.data.response;

    if (line.data.error) {
      rejected.push({
        customId,
        chunkNumber,
        reasons: ["batch_line_error"],
        raw: line.data.error
      });
      continue;
    }

    if (!response || response.status_code !== 200) {
      rejected.push({
        customId,
        chunkNumber,
        reasons: [`bad_status_${response?.status_code ?? "missing"}`],
        raw: line.data
      });
      continue;
    }

    const content = extractMessageContent(response.body);
    if (!content) {
      rejected.push({
        customId,
        chunkNumber,
        reasons: ["missing_message_content"],
        raw: line.data
      });
      continue;
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(stripJsonFence(content)) as unknown;
    } catch {
      rejected.push({
        customId,
        chunkNumber,
        reasons: ["message_content_is_not_json"],
        raw: content
      });
      continue;
    }

    const outputRecord = explanationOutputRecordSchema.safeParse(parsedPayload);
    if (!outputRecord.success) {
      rejected.push({
        customId,
        chunkNumber,
        reasons: ["output_schema_validation_failed"],
        raw: parsedPayload
      });
      continue;
    }

    const record = outputRecord.data;

    if (!customId) {
      rejected.push({
        id: record.id,
        chunkNumber,
        reasons: ["missing_custom_id"],
        raw: parsedPayload
      });
      continue;
    }

    if (record.id !== customId) {
      rejected.push({
        customId,
        id: record.id,
        chunkNumber,
        reasons: ["returned_id_does_not_match_custom_id"],
        raw: parsedPayload
      });
      continue;
    }

    const candidate = candidatesById.get(record.id);
    if (!candidate) {
      rejected.push({
        customId,
        id: record.id,
        chunkNumber,
        reasons: ["unknown_question_id"],
        raw: parsedPayload
      });
      continue;
    }

    if (seenIds.has(record.id)) {
      duplicateIds.add(record.id);
      rejected.push({
        customId,
        id: record.id,
        subject: candidate.subject,
        chunkNumber,
        reasons: ["duplicate_output_id"],
        raw: parsedPayload
      });
      continue;
    }

    const reasons = validateRecordForCandidate(record, candidate);

    if (reasons.length > 0) {
      if (!hasOnlySoftValidationReasons(reasons)) {
        rejected.push({
          customId,
          id: record.id,
          subject: candidate.subject,
          chunkNumber,
          reasons,
          raw: parsedPayload
        });
        continue;
      }

      softAcceptedReasons.set(record.id, reasons);
    }

    seenIds.add(record.id);
    const acceptedReasons = softAcceptedReasons.get(record.id) ?? [];
    normalized.push({
      filePath: candidate.filePath,
      id: record.id,
      improvedExplanation: record.improvedExplanation.trim(),
      explanationByOption: acceptedReasons.includes("explanation_by_option_length_mismatch")
        ? []
        : record.explanationByOption.map((item) => item.trim()),
      tagsToAdd: normalizeTags(record, candidate, acceptedReasons),
      uncertain: record.uncertain,
      notes: [
        record.notes.trim(),
        acceptedReasons.length > 0 ? `Soft-accepted validation warnings: ${acceptedReasons.join(", ")}` : ""
      ]
        .filter(Boolean)
        .join(" ")
    });
  }

  const missingIds = candidates
    .map((candidate) => candidate.id)
    .filter((id) => !seenIds.has(id) && !rejected.some((item) => item.id === id || item.customId === id));

  const activeRejected = rejected.filter((item) => {
    const id = item.id ?? item.customId;
    return !id || !seenIds.has(id);
  });
  const supersededRejectedCount = rejected.length - activeRejected.length;

  await writeJson(batchNormalizedOutputPath, normalized);
  await writeJson(explanationOutputPath, normalized);

  const bySubject = new Map<string, number>();
  const uncertainBySubject = new Map<string, number>();
  const softAcceptedByReason = new Map<string, number>();

  for (const record of normalized) {
    const candidate = candidatesById.get(record.id);
    if (!candidate) {
      continue;
    }

    bySubject.set(candidate.subject, (bySubject.get(candidate.subject) ?? 0) + 1);

    if (record.uncertain) {
      uncertainBySubject.set(candidate.subject, (uncertainBySubject.get(candidate.subject) ?? 0) + 1);
    }

    for (const tag of record.tagsToAdd) {
      const prefix = "explanation_warning_";
      if (tag.startsWith(prefix)) {
        const reason = tag.slice(prefix.length);
        softAcceptedByReason.set(reason, (softAcceptedByReason.get(reason) ?? 0) + 1);
      }
    }
  }

  const rejectedReasons = new Map<string, number>();
  for (const item of activeRejected) {
    for (const reason of item.reasons) {
      rejectedReasons.set(reason, (rejectedReasons.get(reason) ?? 0) + 1);
    }
  }

  const report = `# OpenAI Explanation Batch Report

Generated on ${new Date().toISOString()}.

## Summary

- Total candidates: ${candidates.length}
- Batch id: ${metadata?.batchId ?? "unknown"}
- Model used: ${metadata?.model ?? "unknown"}
- Endpoint: ${metadata?.endpoint ?? "unknown"}
- Total raw outputs: ${rawSources.entries.length}
- Normalized outputs: ${normalized.length}
- Active rejected outputs: ${activeRejected.length}
- Superseded rejected outputs: ${supersededRejectedCount}
- OpenAI error output lines: ${rawSources.errorLineCount}
- Uncertain outputs: ${normalized.filter((record) => record.uncertain).length}
- Soft-accepted outputs: ${softAcceptedReasons.size}
- Missing ids: ${missingIds.length}
- Duplicate ids: ${duplicateIds.size}
- Batch chunks: ${rawSources.index?.chunks.length ?? "legacy single file"}
- Missing downloaded chunks: ${rawSources.missingChunks.length > 0 ? rawSources.missingChunks.join(", ") : "none"}

## Normalized Counts By Subject

${[...bySubject.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([subject, count]) => `- ${subject}: ${count}`)
  .join("\n") || "- None"}

## Uncertain Counts By Subject

${[...uncertainBySubject.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([subject, count]) => `- ${subject}: ${count}`)
  .join("\n") || "- None"}

## Rejected Reasons

${[...rejectedReasons.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([reason, count]) => `- ${reason}: ${count}`)
  .join("\n") || "- None"}

## Soft-Accepted Warning Reasons

${[...softAcceptedByReason.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([reason, count]) => `- ${reason}: ${count}`)
  .join("\n") || "- None"}

## Output Files

- Raw output files: ${rawSources.sourcePaths.map((item) => `\`${item}\``).join(", ")}
- Raw errors: ${rawSources.index ? "`data/explanations/openai-batches/*-errors.jsonl` when present" : `\`${relativeToProject(batchErrorsPath)}\``}
- Normalized output: \`${relativeToProject(batchNormalizedOutputPath)}\`
- Apply-compatible output: \`${relativeToProject(explanationOutputPath)}\`

## Safety Notes

The normalize step does not modify question files. The apply step is responsible for preserving question count, ids, correctAnswer, options, sourceType/sourceUrl, and reviewed values.

## Next Command

\`\`\`bash
npm run explanations:apply
\`\`\`
`;

  await fs.writeFile(batchReportPath, report);

  console.log(`Raw outputs: ${rawSources.entries.length}`);
  console.log(`Normalized outputs: ${normalized.length}`);
  console.log(`Active rejected outputs: ${activeRejected.length}`);
  console.log(`Superseded rejected outputs: ${supersededRejectedCount}`);
  console.log(`Uncertain outputs: ${normalized.filter((record) => record.uncertain).length}`);
  console.log(`Soft-accepted outputs: ${softAcceptedReasons.size}`);
  if (rawSources.missingChunks.length > 0) {
    console.log(`Missing downloaded chunks: ${rawSources.missingChunks.join(", ")}`);
  }
  console.log(`Wrote ${relativeToProject(batchNormalizedOutputPath)}`);
  console.log(`Updated ${relativeToProject(explanationOutputPath)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
