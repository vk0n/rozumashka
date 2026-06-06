import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { questionsSchema } from "../../src/lib/schemas";
import type { Question } from "../../src/types";
import {
  batchNormalizedOutputPath,
  outputRecordSchema,
  pathExists,
  projectRoot,
  readCandidates,
  readJson,
  readMetadata,
  requiredTznkV3Tags,
  tznkQuestionsPath,
  validateTznkV3Record,
  writeMetadata
} from "./tznk-style-v3-common";

const outputRecordsSchema = z.array(outputRecordSchema);

function immutableSnapshot(question: Question): string {
  const {
    explanation: _explanation,
    explanationByOption: _explanationByOption,
    tags: _tags,
    ...immutable
  } = question;

  return JSON.stringify(immutable);
}

async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const suffix = Math.random().toString(36).slice(2, 8);
  const backupDir = path.join(
    projectRoot,
    "data",
    "backups",
    `tznk-explanations-style-v3-before-${timestamp}-${suffix}`
  );

  await fs.mkdir(backupDir, { recursive: true });
  await fs.copyFile(tznkQuestionsPath, path.join(backupDir, "tznk.json"));
  return path.relative(projectRoot, backupDir).split("\\").join("/");
}

async function main(): Promise<void> {
  if (!(await pathExists(batchNormalizedOutputPath))) {
    throw new Error("Missing normalized ТЗНК style-v3 output. Normalize the batch first.");
  }

  const records = outputRecordsSchema.parse(
    await readJson<unknown>(batchNormalizedOutputPath)
  );

  if (records.length === 0) {
    console.log("No valid ТЗНК style-v3 explanations to apply.");
    return;
  }

  const candidates = await readCandidates();
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const questions = questionsSchema.parse(
    JSON.parse(await fs.readFile(tznkQuestionsPath, "utf8")) as unknown
  );
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const seenIds = new Set<string>();
  const skippedIds: string[] = [];

  for (const record of records) {
    if (seenIds.has(record.id)) {
      throw new Error(`Duplicate normalized output id "${record.id}".`);
    }

    seenIds.add(record.id);
    const candidate = candidatesById.get(record.id);
    const question = questionsById.get(record.id);

    if (!candidate || !question || question.subject !== "tznk" || record.uncertain) {
      skippedIds.push(record.id);
      continue;
    }

    if (validateTznkV3Record(record, candidate).length > 0) {
      skippedIds.push(record.id);
    }
  }

  if (skippedIds.length > 0) {
    throw new Error(
      `Refusing to apply uncertain, invalid, or unknown records: ${skippedIds.slice(0, 20).join(", ")}`
    );
  }

  const backupDir = await createBackup();
  let appliedCount = 0;

  for (const record of records) {
    const question = questionsById.get(record.id);
    if (!question) {
      continue;
    }

    const before = immutableSnapshot(question);
    question.explanation = record.improvedExplanation.trim();

    if (record.explanationByOption.length > 0) {
      question.explanationByOption = record.explanationByOption.map((item) => item.trim());
    }

    const tags = new Set(question.tags ?? []);
    for (const tag of requiredTznkV3Tags) {
      tags.add(tag);
    }
    for (const tag of record.tagsToAdd) {
      tags.add(tag);
    }

    if (record.rulesSectionMode === "no_general_rule") {
      tags.add("tznk_no_general_rule");
    }
    tags.delete("needs_explanation_style_v3");
    question.tags = [...tags].sort();

    if (before !== immutableSnapshot(question)) {
      throw new Error(`Immutable field changed while applying "${record.id}".`);
    }

    appliedCount += 1;
  }

  await fs.writeFile(tznkQuestionsPath, `${JSON.stringify(questions, null, 2)}\n`, "utf8");

  const metadata = await readMetadata();
  await writeMetadata({
    ...metadata,
    status: "applied",
    appliedCount,
    skippedIds: [],
    filesUpdated: ["public/data/questions/tznk.json", backupDir],
    updatedAt: new Date().toISOString()
  });

  console.log(`Applied ${appliedCount} ТЗНК style-v3 explanations.`);
  console.log(`Backup: ${backupDir}`);
  console.log("Uncertain outputs were not applied.");
  console.log("Changed only explanation, explanationByOption, and explanation-related tags.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
