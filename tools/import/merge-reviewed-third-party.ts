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
  thirdPartyPath: string;
}

interface MergeStats {
  publicBefore: number;
  thirdPartyBefore: number;
  candidates: number;
  merged: number;
  skipped: number;
  publicAfter: number;
  thirdPartyAfter: number;
  skippedReasons: Record<SkipReason, number>;
}

interface SkippedQuestion {
  id: string;
  subject: SubjectId;
  reason: SkipReason;
  note: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const subjects: SubjectConfig[] = [
  {
    id: "tznk",
    publicPath: "public/data/questions/tznk.json",
    thirdPartyPath: "data/processed/third-party/tznk.third-party.json"
  },
  {
    id: "english",
    publicPath: "public/data/questions/english.json",
    thirdPartyPath: "data/processed/third-party/english.third-party.json"
  },
  {
    id: "management",
    publicPath: "public/data/questions/management.json",
    thirdPartyPath: "data/processed/third-party/management.third-party.json"
  },
  {
    id: "psychology-sociology",
    publicPath: "public/data/questions/psychology-sociology.json",
    thirdPartyPath: "data/processed/third-party/psychology-sociology.third-party.json"
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
    question.sourceType === "public_source" &&
    Boolean(question.sourceUrl?.trim()) &&
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

function emptyStats(publicBefore: number, thirdPartyBefore: number): MergeStats {
  return {
    publicBefore,
    thirdPartyBefore,
    candidates: 0,
    merged: 0,
    skipped: 0,
    publicAfter: publicBefore,
    thirdPartyAfter: thirdPartyBefore,
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

  const backupPath = await fs.mkdtemp(path.join(backupRoot, "third-party-merge-2026-05-19-"));
  const publicBackupPath = path.join(backupPath, "public-data-questions");
  const thirdPartyBackupPath = path.join(backupPath, "third-party-processed");

  await fs.mkdir(publicBackupPath, { recursive: true });
  await fs.mkdir(thirdPartyBackupPath, { recursive: true });

  for (const subject of subjects) {
    await fs.copyFile(path.join(projectRoot, subject.publicPath), path.join(publicBackupPath, path.basename(subject.publicPath)));
    await fs.copyFile(
      path.join(projectRoot, subject.thirdPartyPath),
      path.join(thirdPartyBackupPath, path.basename(subject.thirdPartyPath))
    );
  }

  return relativePath(backupPath);
}

function subjectLine(label: string, values: Record<SubjectId, number>): string {
  return `- ${label}: ТЗНК ${values.tznk}, Англійська ${values.english}, Управління ${values.management}, Психологія/соціологія ${values["psychology-sociology"]}`;
}

function buildReport(
  snapshotPath: string,
  statsBySubject: Record<SubjectId, MergeStats>,
  skippedQuestions: SkippedQuestion[]
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
  const expectedCountsBySubject = Object.fromEntries(
    subjects.map((subject) => [subject.id, statsBySubject[subject.id].publicBefore + statsBySubject[subject.id].merged])
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
  const skippedExamples = skippedQuestions.length
    ? skippedQuestions
        .slice(0, 30)
        .map((skipped) => `- ${skipped.id}: ${skipped.reason} (${skipped.note})`)
        .join("\n")
    : "- None";

  return `# Third-Party Merge Report

Generated on 2026-05-19.

## Summary

- Snapshot created before merge: \`${snapshotPath}\`
${subjectLine("Merged count", mergedBySubject)}
${subjectLine("Skipped count", skippedBySubject)}
${subjectLine("Expected final public counts", expectedCountsBySubject)}
${subjectLine("Final public counts", finalCountsBySubject)}

## Skipped Reasons

- not_reviewed_or_blocked: ${totalSkippedReasons.not_reviewed_or_blocked}
- duplicate_id: ${totalSkippedReasons.duplicate_id}
- duplicate_question_text: ${totalSkippedReasons.duplicate_question_text}
- near_duplicate_question_text: ${totalSkippedReasons.near_duplicate_question_text}
- invalid_structure: ${totalSkippedReasons.invalid_structure}

## Skipped Examples

${skippedExamples}

## Notes

- Only \`reviewed=true\` third-party questions with \`sourceType="public_source"\`, non-empty \`sourceUrl\`, and no blocking review tags were merged.
- Existing public questions were preserved.
- Merged records were removed from the third-party staging files to keep validation unique across public/generated/processed data.
- Generated batch 1 was not modified.

## Verification

- Validation: pending \`npm run validate:questions\`
- Build: pending \`npm run build\`
`;
}

async function main(): Promise<void> {
  const snapshotPath = await createSnapshot();
  const statsBySubject = {} as Record<SubjectId, MergeStats>;
  const skippedQuestions: SkippedQuestion[] = [];

  for (const subject of subjects) {
    const publicQuestions = await readQuestions(subject.publicPath);
    const thirdPartyQuestions = await readQuestions(subject.thirdPartyPath);
    const stats = emptyStats(publicQuestions.length, thirdPartyQuestions.length);
    const publicIds = new Set(publicQuestions.map((question) => question.id));
    const publicTexts = new Set(publicQuestions.map((question) => `${question.subject}:${normalize(question.question)}`));
    const mergedIds = new Set<string>();
    const mergedTexts = new Set<string>();
    const mergedQuestions: Question[] = [];
    const retainedThirdPartyQuestions: Question[] = [];

    for (const question of thirdPartyQuestions) {
      if (!isMergeCandidate(question)) {
        stats.skipped += 1;
        stats.skippedReasons.not_reviewed_or_blocked += 1;
        skippedQuestions.push({
          id: question.id,
          subject: subject.id,
          reason: "not_reviewed_or_blocked",
          note: "reviewed=false or has a blocking review tag"
        });
        retainedThirdPartyQuestions.push(question);
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
        retainedThirdPartyQuestions.push(question);
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
        retainedThirdPartyQuestions.push(question);
        continue;
      }

      mergedQuestions.push(question);
      mergedIds.add(question.id);
      mergedTexts.add(questionTextKey);
      stats.merged += 1;
    }

    const nextPublicQuestions = [...publicQuestions, ...mergedQuestions].sort(sortQuestions);
    const nextThirdPartyQuestions = retainedThirdPartyQuestions.sort(sortQuestions);
    stats.publicAfter = nextPublicQuestions.length;
    stats.thirdPartyAfter = nextThirdPartyQuestions.length;

    await writeQuestions(subject.publicPath, nextPublicQuestions);
    await writeQuestions(subject.thirdPartyPath, nextThirdPartyQuestions);

    statsBySubject[subject.id] = stats;
  }

  await fs.writeFile(
    path.join(projectRoot, "THIRD_PARTY_MERGE_REPORT.md"),
    buildReport(snapshotPath, statsBySubject, skippedQuestions),
    "utf8"
  );

  const totalMerged = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.merged, 0);
  const totalSkipped = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.skipped, 0);

  console.log(`Merged ${totalMerged} reviewed third-party questions.`);
  console.log(`Skipped ${totalSkipped} third-party questions.`);
  console.log(`Snapshot: ${snapshotPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
