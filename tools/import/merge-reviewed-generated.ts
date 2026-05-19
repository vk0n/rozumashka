import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

type SubjectId = "tznk" | "english" | "management" | "psychology-sociology";
type SkipReason =
  | "not_reviewed_or_blocked"
  | "duplicate_id"
  | "duplicate_question_text"
  | "near_duplicate_question_text"
  | "invalid_structure";

interface SubjectConfig {
  id: SubjectId;
  publicPath: string;
  generatedPaths: string[];
}

interface MergeStats {
  publicBefore: number;
  generatedBefore: number;
  candidates: number;
  merged: number;
  skipped: number;
  publicAfter: number;
  generatedAfter: number;
  skippedReasons: Record<SkipReason, number>;
}

interface SkippedQuestion {
  id: string;
  subject: SubjectId;
  reason: SkipReason;
  note: string;
}

interface GeneratedFileResult {
  filePath: string;
  before: number;
  after: number;
  merged: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const subjects: SubjectConfig[] = [
  {
    id: "tznk",
    publicPath: "public/data/questions/tznk.json",
    generatedPaths: ["data/generated/tznk.generated.json", "data/generated/tznk.generated-batch-3.json"]
  },
  {
    id: "english",
    publicPath: "public/data/questions/english.json",
    generatedPaths: ["data/generated/english.generated.json", "data/generated/english.generated-batch-3.json"]
  },
  {
    id: "management",
    publicPath: "public/data/questions/management.json",
    generatedPaths: [
      "data/generated/management.generated-batch-2.json",
      "data/generated/management.generated-batch-3.json"
    ]
  },
  {
    id: "psychology-sociology",
    publicPath: "public/data/questions/psychology-sociology.json",
    generatedPaths: [
      "data/generated/psychology-sociology.generated-batch-2.json",
      "data/generated/psychology-sociology.generated-batch-3.json"
    ]
  }
];

const blockingTags = new Set(["needs_manual_review", "needs_answer_review", "parse_error"]);

function relativePath(filePath: string): string {
  return path.relative(projectRoot, filePath);
}

async function readQuestions(filePath: string): Promise<Question[]> {
  return JSON.parse(await fs.readFile(path.join(projectRoot, filePath), "utf8")) as Question[];
}

async function writeQuestions(filePath: string, questions: Question[]): Promise<void> {
  await fs.writeFile(path.join(projectRoot, filePath), `${JSON.stringify(questions, null, 2)}\n`, "utf8");
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function hasDuplicateOptions(question: Question): boolean {
  const seen = new Set<string>();

  for (const option of question.options) {
    const normalizedOption = normalize(option);

    if (seen.has(normalizedOption)) {
      return true;
    }

    seen.add(normalizedOption);
  }

  return false;
}

function isMergeCandidate(question: Question): boolean {
  return (
    question.reviewed === true &&
    question.sourceType === "generated" &&
    question.sourceUrl === null &&
    !(question.tags ?? []).some((tag) => blockingTags.has(tag))
  );
}

function isStructurallyValid(question: Question): boolean {
  return (
    Boolean(question.question.trim()) &&
    question.options.length >= 4 &&
    !hasDuplicateOptions(question) &&
    question.correctAnswer >= 0 &&
    question.correctAnswer < question.options.length &&
    Boolean(question.explanation.trim()) &&
    (question.type !== "passage_single_choice" || Boolean(question.passage?.trim()))
  );
}

function findNearDuplicate(question: Question, existingQuestions: Question[]): Question | undefined {
  const normalizedQuestion = normalize(question.question);

  for (const existing of existingQuestions) {
    if (existing.subject !== question.subject) {
      continue;
    }

    const existingText = normalize(existing.question);
    const shorter = Math.min(existingText.length, normalizedQuestion.length);
    const longer = Math.max(existingText.length, normalizedQuestion.length);

    if (shorter >= 80 && shorter / longer >= 0.9 && tokenSimilarity(existingText, normalizedQuestion) >= 0.94) {
      return existing;
    }
  }

  return undefined;
}

function sortQuestions(left: Question, right: Question): number {
  return (
    left.subject.localeCompare(right.subject, "uk") ||
    left.sourceType.localeCompare(right.sourceType, "uk") ||
    left.topic.localeCompare(right.topic, "uk") ||
    left.id.localeCompare(right.id, "uk")
  );
}

function emptyStats(publicBefore: number, generatedBefore: number): MergeStats {
  return {
    publicBefore,
    generatedBefore,
    candidates: 0,
    merged: 0,
    skipped: 0,
    publicAfter: publicBefore,
    generatedAfter: generatedBefore,
    skippedReasons: {
      not_reviewed_or_blocked: 0,
      duplicate_id: 0,
      duplicate_question_text: 0,
      near_duplicate_question_text: 0,
      invalid_structure: 0
    }
  };
}

async function createSnapshot(): Promise<string> {
  const backupRoot = path.join(projectRoot, "data", "backups");
  await fs.mkdir(backupRoot, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const backupPath = await fs.mkdtemp(path.join(backupRoot, `generated-merge-${date}-`));
  const publicBackupPath = path.join(backupPath, "public-data-questions");
  const generatedBackupPath = path.join(backupPath, "generated");

  await fs.mkdir(publicBackupPath, { recursive: true });
  await fs.mkdir(generatedBackupPath, { recursive: true });

  for (const subject of subjects) {
    await fs.copyFile(path.join(projectRoot, subject.publicPath), path.join(publicBackupPath, path.basename(subject.publicPath)));

    for (const generatedPath of subject.generatedPaths) {
      await fs.copyFile(path.join(projectRoot, generatedPath), path.join(generatedBackupPath, path.basename(generatedPath)));
    }
  }

  return relativePath(backupPath);
}

function subjectLine(label: string, values: Record<SubjectId, number>): string {
  return `- ${label}: ТЗНК ${values.tznk}, Англійська ${values.english}, Управління ${values.management}, Психологія/соціологія ${values["psychology-sociology"]}`;
}

function buildReport(
  snapshotPath: string,
  statsBySubject: Record<SubjectId, MergeStats>,
  skippedQuestions: SkippedQuestion[],
  generatedFileResults: GeneratedFileResult[]
): string {
  const mergedBySubject = Object.fromEntries(
    subjects.map((subject) => [subject.id, statsBySubject[subject.id].merged])
  ) as Record<SubjectId, number>;
  const skippedBySubject = Object.fromEntries(
    subjects.map((subject) => [subject.id, statsBySubject[subject.id].skipped])
  ) as Record<SubjectId, number>;
  const finalCountsBySubject = Object.fromEntries(
    subjects.map((subject) => [subject.id, statsBySubject[subject.id].publicAfter])
  ) as Record<SubjectId, number>;
  const stagingRemainderBySubject = Object.fromEntries(
    subjects.map((subject) => [subject.id, statsBySubject[subject.id].generatedAfter])
  ) as Record<SubjectId, number>;
  const totalSkippedReasons = skippedQuestions.reduce<Record<SkipReason, number>>(
    (accumulator, skipped) => {
      accumulator[skipped.reason] += 1;
      return accumulator;
    },
    {
      not_reviewed_or_blocked: 0,
      duplicate_id: 0,
      duplicate_question_text: 0,
      near_duplicate_question_text: 0,
      invalid_structure: 0
    }
  );
  const generatedFileLines = generatedFileResults
    .map(
      (result) =>
        `- \`${result.filePath}\`: before ${result.before}, merged ${result.merged}, remaining ${result.after}`
    )
    .join("\n");
  const skippedExamples = skippedQuestions.length
    ? skippedQuestions
        .slice(0, 30)
        .map((skipped) => `- ${skipped.id}: ${skipped.reason} (${skipped.note})`)
        .join("\n")
    : "- None";

  return `# Generated Merge Report

Generated on ${new Date().toISOString()}.

## Summary

- Snapshot created before merge: \`${snapshotPath}\`
${subjectLine("Merged count", mergedBySubject)}
${subjectLine("Skipped count", skippedBySubject)}
${subjectLine("Final public counts", finalCountsBySubject)}
${subjectLine("Remaining generated staging questions", stagingRemainderBySubject)}

## Generated staging files

${generatedFileLines}

## Skipped reasons

- not_reviewed_or_blocked: ${totalSkippedReasons.not_reviewed_or_blocked}
- duplicate_id: ${totalSkippedReasons.duplicate_id}
- duplicate_question_text: ${totalSkippedReasons.duplicate_question_text}
- near_duplicate_question_text: ${totalSkippedReasons.near_duplicate_question_text}
- invalid_structure: ${totalSkippedReasons.invalid_structure}

## Skipped examples

${skippedExamples}

## Notes

- Only \`reviewed=true\` generated questions with \`sourceType="generated"\`, \`sourceUrl=null\`, and no blocking review tags were merged.
- Existing public questions were preserved.
- Merged records were removed from generated staging files to keep validation unique across \`public/data/questions\` and \`data/generated\`.
- Remaining generated staging questions are intentionally unmerged and still require manual editorial work.

## Verification

- Validation: pending \`npm run validate:questions\`
- Build: pending \`npm run build\`
`;
}

async function main(): Promise<void> {
  const snapshotPath = await createSnapshot();
  const statsBySubject = {} as Record<SubjectId, MergeStats>;
  const skippedQuestions: SkippedQuestion[] = [];
  const generatedFileResults: GeneratedFileResult[] = [];

  for (const subject of subjects) {
    const publicQuestions = await readQuestions(subject.publicPath);
    const generatedFiles = await Promise.all(
      subject.generatedPaths.map(async (filePath) => ({
        filePath,
        questions: await readQuestions(filePath)
      }))
    );
    const generatedBefore = generatedFiles.reduce((sum, file) => sum + file.questions.length, 0);
    const stats = emptyStats(publicQuestions.length, generatedBefore);
    const publicIds = new Set(publicQuestions.map((question) => question.id));
    const publicTexts = new Set(publicQuestions.map((question) => `${question.subject}:${normalize(question.question)}`));
    const mergedIds = new Set<string>();
    const mergedTexts = new Set<string>();
    const mergedQuestions: Question[] = [];
    const retainedByFile = new Map<string, Question[]>();

    for (const file of generatedFiles) {
      const retainedGeneratedQuestions: Question[] = [];
      let mergedFromFile = 0;

      for (const question of file.questions) {
        if (!isMergeCandidate(question)) {
          stats.skipped += 1;
          stats.skippedReasons.not_reviewed_or_blocked += 1;
          skippedQuestions.push({
            id: question.id,
            subject: subject.id,
            reason: "not_reviewed_or_blocked",
            note: "reviewed=false or has a blocking review tag"
          });
          retainedGeneratedQuestions.push(question);
          continue;
        }

        stats.candidates += 1;

        if (!isStructurallyValid(question)) {
          stats.skipped += 1;
          stats.skippedReasons.invalid_structure += 1;
          skippedQuestions.push({
            id: question.id,
            subject: subject.id,
            reason: "invalid_structure",
            note: "failed local merge-time structural checks"
          });
          retainedGeneratedQuestions.push(question);
          continue;
        }

        if (publicIds.has(question.id) || mergedIds.has(question.id)) {
          stats.skipped += 1;
          stats.skippedReasons.duplicate_id += 1;
          skippedQuestions.push({
            id: question.id,
            subject: subject.id,
            reason: "duplicate_id",
            note: "id already exists in public bank or current merge batch"
          });
          retainedGeneratedQuestions.push(question);
          continue;
        }

        const questionTextKey = `${question.subject}:${normalize(question.question)}`;

        if (publicTexts.has(questionTextKey) || mergedTexts.has(questionTextKey)) {
          stats.skipped += 1;
          stats.skippedReasons.duplicate_question_text += 1;
          skippedQuestions.push({
            id: question.id,
            subject: subject.id,
            reason: "duplicate_question_text",
            note: "question text already exists in public bank or current merge batch"
          });
          retainedGeneratedQuestions.push(question);
          continue;
        }

        const nearDuplicate = findNearDuplicate(question, [...publicQuestions, ...mergedQuestions]);

        if (nearDuplicate) {
          stats.skipped += 1;
          stats.skippedReasons.near_duplicate_question_text += 1;
          skippedQuestions.push({
            id: question.id,
            subject: subject.id,
            reason: "near_duplicate_question_text",
            note: `near duplicate of ${nearDuplicate.id}`
          });
          retainedGeneratedQuestions.push(question);
          continue;
        }

        mergedQuestions.push(question);
        mergedIds.add(question.id);
        mergedTexts.add(questionTextKey);
        stats.merged += 1;
        mergedFromFile += 1;
      }

      retainedByFile.set(file.filePath, retainedGeneratedQuestions.sort(sortQuestions));
      generatedFileResults.push({
        filePath: file.filePath,
        before: file.questions.length,
        after: retainedGeneratedQuestions.length,
        merged: mergedFromFile
      });
    }

    const nextPublicQuestions = [...publicQuestions, ...mergedQuestions].sort(sortQuestions);
    stats.publicAfter = nextPublicQuestions.length;
    stats.generatedAfter = [...retainedByFile.values()].reduce((sum, questions) => sum + questions.length, 0);

    await writeQuestions(subject.publicPath, nextPublicQuestions);

    for (const [filePath, retainedQuestions] of retainedByFile.entries()) {
      await writeQuestions(filePath, retainedQuestions);
    }

    statsBySubject[subject.id] = stats;
  }

  await fs.writeFile(
    path.join(projectRoot, "GENERATED_MERGE_REPORT.md"),
    buildReport(snapshotPath, statsBySubject, skippedQuestions, generatedFileResults),
    "utf8"
  );

  const totalMerged = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.merged, 0);
  const totalSkipped = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.skipped, 0);

  console.log(`Merged ${totalMerged} reviewed generated questions.`);
  console.log(`Skipped ${totalSkipped} generated questions.`);
  console.log(`Snapshot: ${snapshotPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
