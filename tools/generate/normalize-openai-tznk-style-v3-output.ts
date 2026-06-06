import { promises as fs } from "node:fs";
import { z } from "zod";
import {
  batchManualReviewPath,
  batchNormalizedOutputPath,
  batchRawOutputPath,
  extractMessageContent,
  normalizeTags,
  outputPath,
  outputRecordSchema,
  parseJsonl,
  pathExists,
  readCandidates,
  readMetadata,
  repairTznkV3Record,
  stripJsonFence,
  validateTznkV3Record,
  writeJson,
  writeMetadata,
  type TznkV3Candidate,
  type TznkV3OutputRecord
} from "./tznk-style-v3-common";

const batchOutputLineSchema = z.object({
  custom_id: z.string().optional(),
  response: z
    .object({
      status_code: z.number(),
      body: z.unknown().optional()
    })
    .nullable()
    .optional(),
  error: z.unknown().nullable().optional()
});

interface NormalizedRecord extends TznkV3OutputRecord {
  tagsToAdd: string[];
}

interface ManualReviewRecord {
  id: string;
  question: string;
  passage?: string;
  options: string[];
  correctAnswer: number;
  output: NormalizedRecord;
}

interface RejectedRecord {
  id?: string;
  reasons: string[];
}

function normalizeRecord(record: TznkV3OutputRecord): NormalizedRecord {
  return {
    id: record.id,
    improvedExplanation: record.improvedExplanation.trim(),
    explanationByOption: record.explanationByOption.map((item) => item.trim()),
    rulesSectionMode: record.rulesSectionMode,
    tagsToAdd: normalizeTags(record),
    uncertain: record.uncertain,
    notes: record.notes.trim()
  };
}

function toManualReviewRecord(
  candidate: TznkV3Candidate,
  output: NormalizedRecord
): ManualReviewRecord {
  return {
    id: candidate.id,
    question: candidate.question,
    passage: candidate.passage,
    options: candidate.options,
    correctAnswer: candidate.correctAnswer,
    output
  };
}

async function main(): Promise<void> {
  if (!(await pathExists(batchRawOutputPath)) || (await fs.stat(batchRawOutputPath)).size === 0) {
    throw new Error("Missing ТЗНК style-v3 raw output. Download the completed batch first.");
  }

  const candidates = await readCandidates();
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const metadata = await readMetadata();
  const rawLines = parseJsonl(await fs.readFile(batchRawOutputPath, "utf8"));
  const normalized: NormalizedRecord[] = [];
  const manualReview: ManualReviewRecord[] = [];
  const rejected: RejectedRecord[] = [];
  const seenIds = new Set<string>();

  for (const rawLine of rawLines) {
    const line = batchOutputLineSchema.safeParse(rawLine);

    if (!line.success) {
      rejected.push({ reasons: ["invalid_batch_output_line"] });
      continue;
    }

    const customId = line.data.custom_id;
    const response = line.data.response;

    if (!customId) {
      rejected.push({ reasons: ["missing_custom_id"] });
      continue;
    }

    if (line.data.error) {
      rejected.push({ id: customId, reasons: ["batch_line_error"] });
      continue;
    }

    if (!response || response.status_code !== 200) {
      rejected.push({ id: customId, reasons: [`bad_status_${response?.status_code ?? "missing"}`] });
      continue;
    }

    const content = extractMessageContent(response.body);
    if (!content) {
      rejected.push({ id: customId, reasons: ["missing_message_content"] });
      continue;
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(stripJsonFence(content)) as unknown;
    } catch {
      rejected.push({ id: customId, reasons: ["message_content_is_not_json"] });
      continue;
    }

    const parsedRecord = outputRecordSchema.safeParse(parsedPayload);
    if (!parsedRecord.success) {
      rejected.push({ id: customId, reasons: ["output_schema_validation_failed"] });
      continue;
    }

    const record = parsedRecord.data;
    const candidate = candidatesById.get(customId);

    if (!candidate) {
      rejected.push({ id: customId, reasons: ["unknown_question_id"] });
      continue;
    }

    if (record.id !== customId) {
      rejected.push({ id: customId, reasons: ["returned_id_does_not_match_custom_id"] });
      continue;
    }

    if (seenIds.has(record.id)) {
      rejected.push({ id: record.id, reasons: ["duplicate_output_id"] });
      continue;
    }

    seenIds.add(record.id);
    const repairedRecord = repairTznkV3Record(record, candidate);
    const reasons = validateTznkV3Record(repairedRecord, candidate);
    if (reasons.length > 0) {
      rejected.push({ id: record.id, reasons });
      continue;
    }

    const normalizedRecord = normalizeRecord(repairedRecord);
    if (repairedRecord.uncertain) {
      manualReview.push(toManualReviewRecord(candidate, normalizedRecord));
    } else {
      normalized.push(normalizedRecord);
    }
  }

  const acceptedIds = new Set([
    ...normalized.map((record) => record.id),
    ...manualReview.map((record) => record.id)
  ]);
  const skippedIds = candidates
    .map((candidate) => candidate.id)
    .filter((id) => !acceptedIds.has(id));
  const acceptedOutputs = [
    ...normalized,
    ...manualReview.map((record) => record.output)
  ];

  await writeJson(batchNormalizedOutputPath, normalized);
  await writeJson(outputPath, normalized);
  await writeJson(batchManualReviewPath, manualReview);
  await writeMetadata({
    ...metadata,
    status: "normalized",
    outputsReceived: rawLines.length,
    normalizedCount: normalized.length,
    rejectedCount: rejected.length,
    uncertainCount: manualReview.length,
    reusableRulesCount: acceptedOutputs.filter(
      (record) => record.rulesSectionMode === "reusable_rules"
    ).length,
    noGeneralRuleCount: acceptedOutputs.filter(
      (record) => record.rulesSectionMode === "no_general_rule"
    ).length,
    manualReviewIds: manualReview.map((record) => record.id),
    skippedIds,
    updatedAt: new Date().toISOString()
  });

  console.log(`Raw outputs: ${rawLines.length}`);
  console.log(`Normalized auto-apply outputs: ${normalized.length}`);
  console.log(`Rejected outputs: ${rejected.length}`);
  console.log(`Uncertain outputs for manual review: ${manualReview.length}`);
  console.log(
    `reusable_rules: ${acceptedOutputs.filter((record) => record.rulesSectionMode === "reusable_rules").length}`
  );
  console.log(
    `no_general_rule: ${acceptedOutputs.filter((record) => record.rulesSectionMode === "no_general_rule").length}`
  );

  if (rejected.length > 0) {
    const counts = new Map<string, number>();
    for (const item of rejected) {
      for (const reason of item.reasons) {
        counts.set(reason, (counts.get(reason) ?? 0) + 1);
      }
    }

    for (const [reason, count] of [...counts.entries()].sort()) {
      console.log(`${reason}: ${count}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
