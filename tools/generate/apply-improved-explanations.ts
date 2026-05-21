import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const outputPath = path.join(projectRoot, "data", "explanations", "explanation-improvement-output.json");
const publicQuestionsDir = path.join(projectRoot, "public", "data", "questions");

interface ImprovedExplanationRecord {
  filePath?: string;
  id: string;
  improvedExplanation: string;
  explanationByOption?: string[];
  tagsToAdd?: string[];
  uncertain?: boolean;
  notes?: string;
}

interface QuestionLocation {
  filePath: string;
  relativePath: string;
  index: number;
  question: Question;
}

const immutableFields: Array<keyof Question> = [
  "id",
  "subject",
  "type",
  "topic",
  "subtopic",
  "difficulty",
  "sourceType",
  "sourceUrl",
  "reviewed",
  "question",
  "passage",
  "imageUrl",
  "options",
  "correctAnswer"
];

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectTargetFiles(): Promise<string[]> {
  const directories = [
    publicQuestionsDir,
    path.join(projectRoot, "data", "generated"),
    path.join(projectRoot, "data", "processed", "third-party")
  ];
  const files: string[] = [];

  for (const directory of directories) {
    if (!(await pathExists(directory))) {
      continue;
    }

    const entries = await fs.readdir(directory);
    files.push(
      ...entries
        .filter((entry) => entry.endsWith(".json"))
        .sort()
        .map((entry) => path.join(directory, entry))
    );
  }

  return files;
}

async function readQuestions(filePath: string): Promise<Question[]> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as Question[];
}

function snapshotImmutable(question: Question): string {
  return JSON.stringify(
    Object.fromEntries(immutableFields.map((field) => [field, question[field]]))
  );
}

function normalizeRelativePath(filePath: string): string {
  return filePath.split("\\").join("/").replace(/^\.\//, "");
}

function resolveRecordLocation(
  record: ImprovedExplanationRecord,
  locationsById: Map<string, QuestionLocation[]>
): QuestionLocation {
  const locations = locationsById.get(record.id) ?? [];

  if (locations.length === 0) {
    throw new Error(`No question found for id "${record.id}".`);
  }

  if (record.filePath) {
    const normalized = normalizeRelativePath(record.filePath);
    const location = locations.find((candidate) => candidate.relativePath === normalized);

    if (!location) {
      throw new Error(`No question "${record.id}" found in "${record.filePath}".`);
    }

    return location;
  }

  if (locations.length > 1) {
    throw new Error(
      `Question id "${record.id}" appears in multiple files. Add filePath to the output record.`
    );
  }

  return locations[0];
}

async function createPublicBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const suffix = Math.random().toString(36).slice(2, 8);
  const backupDir = path.join(
    projectRoot,
    "data",
    "backups",
    `explanations-style-v2-before-${timestamp}-${suffix}`
  );

  await fs.mkdir(backupDir, { recursive: true });

  const entries = await fs.readdir(publicQuestionsDir);
  for (const entry of entries.filter((file) => file.endsWith(".json"))) {
    await fs.copyFile(path.join(publicQuestionsDir, entry), path.join(backupDir, entry));
  }

  return path.relative(projectRoot, backupDir);
}

async function main() {
  if (!(await pathExists(outputPath))) {
    throw new Error("Missing data/explanations/explanation-improvement-output.json. Run npm run explanations:prepare first.");
  }

  const records = JSON.parse(await fs.readFile(outputPath, "utf8")) as ImprovedExplanationRecord[];

  if (!Array.isArray(records)) {
    throw new Error("explanation-improvement-output.json must contain a JSON array.");
  }

  if (records.length === 0) {
    console.log("No improved explanations to apply. Fill explanation-improvement-output.json first.");
    return;
  }

  const files = await collectTargetFiles();
  const questionsByFile = new Map<string, Question[]>();
  const locationsById = new Map<string, QuestionLocation[]>();

  for (const filePath of files) {
    const questions = await readQuestions(filePath);
    questionsByFile.set(filePath, questions);

    questions.forEach((question, index) => {
      const locations = locationsById.get(question.id) ?? [];
      locations.push({
        filePath,
        relativePath: path.relative(projectRoot, filePath).split("\\").join("/"),
        index,
        question
      });
      locationsById.set(question.id, locations);
    });
  }

  const backupDir = records.some((record) => record.filePath?.startsWith("public/data/questions/"))
    ? await createPublicBackup()
    : null;

  const changedFiles = new Set<string>();
  const appliedBySubject = new Map<string, number>();
  let uncertainCount = 0;

  for (const record of records) {
    if (!record.id || !record.improvedExplanation?.trim()) {
      throw new Error(`Invalid output record: ${JSON.stringify(record)}`);
    }

    const location = resolveRecordLocation(record, locationsById);
    const before = snapshotImmutable(location.question);

    const hasExplanationByOption =
      Array.isArray(record.explanationByOption) && record.explanationByOption.length > 0;

    if (
      hasExplanationByOption &&
      record.explanationByOption &&
      record.explanationByOption.length !== location.question.options.length
    ) {
      throw new Error(
        `explanationByOption length mismatch for "${record.id}" in "${location.relativePath}".`
      );
    }

    location.question.explanation = record.improvedExplanation.trim();

    if (hasExplanationByOption && record.explanationByOption) {
      location.question.explanationByOption = record.explanationByOption.map((item) => item.trim());
    } else if (Array.isArray(record.explanationByOption)) {
      delete location.question.explanationByOption;
    }

    const tags = new Set(location.question.tags ?? []);
    tags.add("explanation_improved");
    tags.add("explanation_style_v2");

    for (const tag of record.tagsToAdd ?? []) {
      tags.add(tag);
    }

    if (record.uncertain) {
      tags.add("needs_explanation_review");
      uncertainCount += 1;

      if (location.question.subject === "tznk") {
        tags.add("tznk_explanation_uncertain");
      }
    }

    location.question.tags = [...tags].sort();

    const after = snapshotImmutable(location.question);
    if (before !== after) {
      throw new Error(`Immutable field changed while applying "${record.id}".`);
    }

    changedFiles.add(location.filePath);
    appliedBySubject.set(
      location.question.subject,
      (appliedBySubject.get(location.question.subject) ?? 0) + 1
    );
  }

  for (const filePath of changedFiles) {
    const questions = questionsByFile.get(filePath);
    if (!questions) {
      continue;
    }

    await fs.writeFile(filePath, `${JSON.stringify(questions, null, 2)}\n`);
  }

  console.log(`Applied ${records.length} improved explanations.`);
  console.log(`Changed files: ${[...changedFiles].map((file) => path.relative(projectRoot, file)).join(", ")}`);
  console.log(`Uncertain explanations marked: ${uncertainCount}`);

  for (const [subject, count] of [...appliedBySubject.entries()].sort()) {
    console.log(`${subject}: ${count}`);
  }

  if (backupDir) {
    console.log(`Public question backup: ${backupDir}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
