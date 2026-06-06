import { promises as fs } from "node:fs";
import { z } from "zod";
import {
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
  stripJsonFence,
  validateEnglishV3Record,
  writeJson,
  writeMetadata,
  type EnglishV3OutputRecord
} from "./english-style-v3-common";

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

interface NormalizedRecord extends EnglishV3OutputRecord {
  tagsToAdd: string[];
}

interface RejectedRecord {
  id?: string;
  reasons: string[];
}

async function main(): Promise<void> {
  if (!(await pathExists(batchRawOutputPath)) || (await fs.stat(batchRawOutputPath)).size === 0) {
    throw new Error("Missing English style-v3 raw output. Download the completed batch first.");
  }

  const candidates = await readCandidates();
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const metadata = await readMetadata();
  const rawLines = parseJsonl(await fs.readFile(batchRawOutputPath, "utf8"));
  const normalized: NormalizedRecord[] = [];
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

    const reasons = validateEnglishV3Record(record, candidate);
    if (reasons.length > 0) {
      rejected.push({ id: record.id, reasons });
      continue;
    }

    seenIds.add(record.id);
    normalized.push({
      id: record.id,
      improvedExplanation: record.improvedExplanation.trim(),
      explanationByOption: record.explanationByOption.map((item) => item.trim()),
      tagsToAdd: normalizeTags(record),
      uncertain: record.uncertain,
      notes: record.notes.trim()
    });
  }

  const skippedIds = candidates
    .map((candidate) => candidate.id)
    .filter((id) => !seenIds.has(id));

  await writeJson(batchNormalizedOutputPath, normalized);
  await writeJson(outputPath, normalized);
  await writeMetadata({
    ...metadata,
    status: "normalized",
    outputsReceived: rawLines.length,
    normalizedCount: normalized.length,
    rejectedCount: rejected.length,
    uncertainCount: normalized.filter((record) => record.uncertain).length,
    skippedIds,
    updatedAt: new Date().toISOString()
  });

  console.log(`Raw outputs: ${rawLines.length}`);
  console.log(`Normalized valid outputs: ${normalized.length}`);
  console.log(`Rejected outputs: ${rejected.length}`);
  console.log(`Uncertain outputs: ${normalized.filter((record) => record.uncertain).length}`);

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
