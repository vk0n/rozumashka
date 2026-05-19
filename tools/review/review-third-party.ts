import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

type SubjectId = "tznk" | "english" | "management" | "psychology-sociology";
type ReviewDecision = {
  question: Question;
  reviewed: boolean;
  reasons: string[];
  tagsToAdd: string[];
  duplicate?: DuplicateMatch;
};
type DuplicateMatch = {
  id: string;
  file: string;
  type: "exact" | "near";
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const thirdPartyFiles: Array<{ subject: SubjectId; filePath: string }> = [
  { subject: "tznk", filePath: "data/processed/third-party/tznk.third-party.json" },
  { subject: "english", filePath: "data/processed/third-party/english.third-party.json" },
  { subject: "management", filePath: "data/processed/third-party/management.third-party.json" },
  { subject: "psychology-sociology", filePath: "data/processed/third-party/psychology-sociology.third-party.json" }
];

const publicFiles = [
  "public/data/questions/tznk.json",
  "public/data/questions/english.json",
  "public/data/questions/management.json",
  "public/data/questions/psychology-sociology.json"
];

const generatedFiles = ["data/generated/tznk.generated.json", "data/generated/english.generated.json"];

const blockingTags = ["needs_manual_review", "needs_answer_review", "parse_error"];
const htmlArtifactPattern = /&(?:[a-z]+|#[0-9]+|#x[0-9a-f]+);/i;
const navigationArtifactPattern =
  /(Позначте відповіді|Перевірити|Наступне|Вхід|Профіль|Реєстрація|Facebook|Twitter|ПРЕМІУМ ДОСТУП|Знайшли помилку)/i;
const brokenEnglishPattern = /\bhey depend\b/i;

function decodeHtml(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    quot: "\"",
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
    laquo: "«",
    raquo: "»",
    ndash: "-",
    mdash: "-",
    hellip: "...",
    rsquo: "'",
    lsquo: "'",
    rdquo: "\"",
    ldquo: "\""
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity: string) => namedEntities[entity] ?? match)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
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

function uniqTags(tags: string[] | undefined): string[] {
  return [...new Set(tags ?? [])];
}

function addTags(question: Question, tags: string[]): void {
  question.tags = uniqTags([...(question.tags ?? []), ...tags]);
}

function removeTags(question: Question, tags: string[]): void {
  question.tags = uniqTags(question.tags).filter((tag) => !tags.includes(tag));
}

function sanitizeQuestion(question: Question): boolean {
  const before = JSON.stringify(question);
  question.question = decodeHtml(question.question);
  question.explanation = decodeHtml(question.explanation);
  question.options = question.options.map(decodeHtml);

  if (question.passage) {
    question.passage = decodeHtml(question.passage);
  }

  return JSON.stringify(question) !== before;
}

async function readQuestions(filePath: string): Promise<Question[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(projectRoot, filePath), "utf8")) as Question[];
  } catch {
    return [];
  }
}

async function writeQuestions(filePath: string, questions: Question[]): Promise<void> {
  await fs.writeFile(path.join(projectRoot, filePath), `${JSON.stringify(questions, null, 2)}\n`, "utf8");
}

async function loadComparisonQuestions(): Promise<Array<Question & { file: string }>> {
  const files = [...publicFiles, ...generatedFiles];
  const all: Array<Question & { file: string }> = [];

  for (const file of files) {
    const questions = await readQuestions(file);
    all.push(...questions.map((question) => ({ ...question, file })));
  }

  return all;
}

function buildExactIndex(questions: Array<Question & { file: string }>): Map<string, Question & { file: string }> {
  const index = new Map<string, Question & { file: string }>();

  for (const question of questions) {
    index.set(`${question.subject}:${normalize(question.question)}`, question);
  }

  return index;
}

function findNearDuplicate(question: Question, comparison: Array<Question & { file: string }>): DuplicateMatch | undefined {
  const normalizedQuestion = normalize(question.question);

  for (const previous of comparison) {
    if (previous.subject !== question.subject) {
      continue;
    }

    const previousText = normalize(previous.question);
    const shorter = Math.min(previousText.length, normalizedQuestion.length);
    const longer = Math.max(previousText.length, normalizedQuestion.length);

    if (shorter >= 80 && shorter / longer >= 0.9 && tokenSimilarity(previousText, normalizedQuestion) >= 0.94) {
      return { id: previous.id, file: previous.file, type: "near" };
    }
  }

  return undefined;
}

function hasDuplicateOptions(question: Question): boolean {
  const seen = new Set<string>();

  for (const option of question.options) {
    const normalized = normalize(option);
    if (seen.has(normalized)) {
      return true;
    }
    seen.add(normalized);
  }

  return false;
}

function hasParsingArtifact(question: Question): boolean {
  const fields = [question.question, question.explanation, question.passage ?? "", ...question.options];
  return fields.some(
    (field) => htmlArtifactPattern.test(field) || navigationArtifactPattern.test(field) || brokenEnglishPattern.test(field)
  );
}

function hasBrokenTznkFormatting(question: Question): boolean {
  if (question.subject !== "tznk") {
    return false;
  }

  const combined = `${question.passage ?? ""}\n${question.question}`;
  const hasTableLikeContent = /(Група|Таблиц|Стовп|Ряд|№\s*\d|I{1,3}\.)/i.test(combined);
  const hasLongPassage = (question.passage?.length ?? 0) > 450;
  return Boolean(hasTableLikeContent && hasLongPassage);
}

function reviewQuestion(
  question: Question,
  exactIndex: Map<string, Question & { file: string }>,
  comparison: Array<Question & { file: string }>,
  currentBatchSeen: Map<string, Question>
): ReviewDecision {
  const reasons: string[] = [];
  const tagsToAdd: string[] = [];

  sanitizeQuestion(question);
  removeTags(question, ["formatting_review_recommended"]);

  if (question.sourceType !== "public_source") {
    reasons.push("sourceType is not public_source");
  }

  if (!question.sourceUrl) {
    reasons.push("missing sourceUrl");
  }

  if (!question.question.trim()) {
    reasons.push("empty question text");
  }

  if (question.options.length < 4) {
    reasons.push("options length is below 4");
  }

  if (hasDuplicateOptions(question)) {
    reasons.push("duplicate options inside question");
  }

  if (question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
    reasons.push("invalid correctAnswer index");
  }

  if (!question.explanation.trim()) {
    reasons.push("empty explanation");
  }

  for (const tag of blockingTags) {
    if (question.tags?.includes(tag)) {
      reasons.push(`blocking tag present: ${tag}`);
    }
  }

  if (question.type === "passage_single_choice" && !question.passage?.trim()) {
    reasons.push("passage_single_choice without passage");
  }

  if (hasParsingArtifact(question)) {
    reasons.push("obvious parsing artifact detected");
    tagsToAdd.push("needs_manual_review");
  }

  if (question.subject === "tznk" && hasBrokenTznkFormatting(question)) {
    tagsToAdd.push("formatting_review_recommended");
  }

  if (question.subject === "english" && question.type === "passage_single_choice" && !question.passage?.trim()) {
    tagsToAdd.push("needs_manual_review");
  }

  const normalizedKey = `${question.subject}:${normalize(question.question)}`;
  const exactDuplicate = exactIndex.get(normalizedKey);

  if (exactDuplicate) {
    reasons.push(`exact duplicate of ${exactDuplicate.id}`);
    return {
      question,
      reviewed: false,
      reasons,
      tagsToAdd: ["needs_manual_review"],
      duplicate: { id: exactDuplicate.id, file: exactDuplicate.file, type: "exact" }
    };
  }

  const withinBatchDuplicate = currentBatchSeen.get(normalizedKey);
  if (withinBatchDuplicate && withinBatchDuplicate.id !== question.id) {
    reasons.push(`exact duplicate within third-party batch: ${withinBatchDuplicate.id}`);
    return {
      question,
      reviewed: false,
      reasons,
      tagsToAdd: ["needs_manual_review"],
      duplicate: { id: withinBatchDuplicate.id, file: "data/processed/third-party", type: "exact" }
    };
  }

  const nearDuplicate = findNearDuplicate(question, comparison);
  if (nearDuplicate) {
    reasons.push(`near duplicate of ${nearDuplicate.id}`);
    return { question, reviewed: false, reasons, tagsToAdd: ["needs_manual_review"], duplicate: nearDuplicate };
  }

  const isZnoMirror = question.tags?.includes("zno_osvita") && question.tags?.includes("official_past_exam_mirror");
  const isJustSchool = question.tags?.includes("justschool");
  const structurallyValid = reasons.length === 0;

  let reviewed = false;

  if (isZnoMirror && structurallyValid) {
    reviewed = true;
  } else if (isJustSchool && !reviewed) {
    tagsToAdd.push("needs_manual_review");
    reasons.push("JustSchool non-exam-mirror source requires manual editorial review");
  }

  return { question, reviewed, reasons, tagsToAdd };
}

function countBySubject(questions: Question[], predicate: (question: Question) => boolean): Record<SubjectId, number> {
  return {
    tznk: questions.filter((question) => question.subject === "tznk" && predicate(question)).length,
    english: questions.filter((question) => question.subject === "english" && predicate(question)).length,
    management: questions.filter((question) => question.subject === "management" && predicate(question)).length,
    "psychology-sociology": questions.filter((question) => question.subject === "psychology-sociology" && predicate(question)).length
  };
}

function subjectLine(label: string, counts: Record<SubjectId, number>): string {
  return `- ${label}: ТЗНК ${counts.tznk}, Англійська ${counts.english}, Управління ${counts.management}, Психологія/соціологія ${counts["psychology-sociology"]}`;
}

function buildReport(allQuestions: Question[], decisions: ReviewDecision[]): string {
  const reviewedTrue = countBySubject(allQuestions, (question) => question.reviewed);
  const reviewedFalse = countBySubject(allQuestions, (question) => !question.reviewed);
  const znoReviewed = allQuestions.filter((question) => question.tags?.includes("zno_osvita") && question.reviewed).length;
  const justSchoolReviewed = allQuestions.filter((question) => question.tags?.includes("justschool") && question.reviewed).length;
  const needsManual = allQuestions.filter((question) => question.tags?.includes("needs_manual_review"));
  const needsAnswer = allQuestions.filter((question) => question.tags?.includes("needs_answer_review"));
  const formattingReview = allQuestions.filter((question) => question.tags?.includes("formatting_review_recommended"));
  const duplicates = decisions.filter((decision) => decision.duplicate);
  const skippedExactDuplicates = decisions.filter((decision) => decision.duplicate?.type === "exact");
  const questionable = decisions.filter((decision) => !decision.reviewed || decision.tagsToAdd.length > 0).slice(0, 20);
  const questionableLines = questionable.length
    ? questionable
        .map((decision) => `- ${decision.question.id}: ${decision.reasons.join("; ") || decision.tagsToAdd.join(", ")}`)
        .join("\n")
    : "- None";
  const duplicateLines = duplicates.length
    ? duplicates
        .slice(0, 20)
        .map((decision) => `- ${decision.question.id}: ${decision.duplicate?.type} duplicate of ${decision.duplicate?.id} (${decision.duplicate?.file})`)
        .join("\n")
    : "- None";

  return `# Third-Party Quality Report

Generated on 2026-05-19.

## Summary

- Total third-party questions reviewed: ${decisions.length}
- Records retained after exact duplicate cleanup: ${allQuestions.length}
${subjectLine("reviewed=true", reviewedTrue)}
${subjectLine("reviewed=false", reviewedFalse)}
- ZNO Освіта reviewed count: ${znoReviewed}
- JustSchool reviewed count: ${justSchoolReviewed}
- Questions marked needs_manual_review: ${needsManual.length}
- Questions marked needs_answer_review: ${needsAnswer.length}
- Questions marked formatting_review_recommended: ${formattingReview.length}
- Duplicates found during review: ${duplicates.length}
- Exact duplicates skipped/removed from third-party processed files: ${skippedExactDuplicates.length}

## Duplicate Findings

${duplicateLines}

## Questionable Examples

${questionableLines}

## Review Notes

- ZNO Освіта questions that passed structural checks were marked \`reviewed=true\` because they are mirrored past-exam sources with answer metadata.
- ТЗНК questions with clear but table/condition-heavy formatting were kept and tagged \`formatting_review_recommended\`.
- JustSchool questions were kept \`reviewed=false\` and tagged \`needs_manual_review\` because they are non-exam-mirror third-party items.
- No official public files and no generated batch files were modified.

## Recommendation

Ready for selective merge of \`reviewed=true\` ZNO Освіта questions, preferably excluding \`formatting_review_recommended\` until a quick visual spot-check. Keep \`needs_manual_review\` items out of any bulk merge.

## Verification

- Validation: pending \`npm run validate:questions\`
- Build: pending \`npm run build\`
`;
}

async function main(): Promise<void> {
  const comparison = await loadComparisonQuestions();
  const exactIndex = buildExactIndex(comparison);
  const currentBatchSeen = new Map<string, Question>();
  const allQuestions: Question[] = [];
  const decisions: ReviewDecision[] = [];

  for (const { filePath } of thirdPartyFiles) {
    const questions = await readQuestions(filePath);
    const retainedQuestions: Question[] = [];

    for (const question of questions) {
      const decision = reviewQuestion(question, exactIndex, comparison, currentBatchSeen);
      decisions.push(decision);

      if (decision.duplicate?.type === "exact") {
        continue;
      }

      question.reviewed = decision.reviewed;
      addTags(question, decision.tagsToAdd);

      currentBatchSeen.set(`${question.subject}:${normalize(question.question)}`, question);
      retainedQuestions.push(question);
    }

    await writeQuestions(filePath, retainedQuestions);
    allQuestions.push(...retainedQuestions);
  }

  await fs.writeFile(
    path.join(projectRoot, "data", "processed", "third-party", "third-party-quality-report.md"),
    buildReport(allQuestions, decisions),
    "utf8"
  );

  console.log(`Reviewed ${allQuestions.length} third-party questions.`);
  console.log(`Marked reviewed=true: ${allQuestions.filter((question) => question.reviewed).length}.`);
  console.log(`Marked reviewed=false: ${allQuestions.filter((question) => !question.reviewed).length}.`);
  console.log(`needs_manual_review: ${allQuestions.filter((question) => question.tags?.includes("needs_manual_review")).length}.`);
  console.log(`formatting_review_recommended: ${allQuestions.filter((question) => question.tags?.includes("formatting_review_recommended")).length}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
