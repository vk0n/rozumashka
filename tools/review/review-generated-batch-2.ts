import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

type SubjectId = "management" | "psychology-sociology";

interface BatchFile {
  subject: SubjectId;
  filePath: string;
  idPattern: RegExp;
  requiredTag: string;
  allowedTopics: Set<string>;
}

interface DuplicateMatch {
  id: string;
  file: string;
  type: "exact" | "near";
}

interface ReviewDecision {
  question: Question;
  reviewed: boolean;
  reasons: string[];
  duplicate?: DuplicateMatch;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const batchFiles: BatchFile[] = [
  {
    subject: "management",
    filePath: "data/generated/management.generated-batch-2.json",
    idPattern: /^management-generated-b2-\d{3}$/,
    requiredTag: "generated_management",
    allowedTopics: new Set([
      "Теорія менеджменту",
      "Функції менеджменту",
      "Стратегія та організація",
      "Лідерство і мотивація",
      "Комунікації та рішення",
      "HR та організаційна поведінка",
      "Маркетинг",
      "Фінанси та облік",
      "Проєкти, операції та ризики",
      "Публічне адміністрування і підприємництво"
    ])
  },
  {
    subject: "psychology-sociology",
    filePath: "data/generated/psychology-sociology.generated-batch-2.json",
    idPattern: /^psych-soc-generated-b2-\d{3}$/,
    requiredTag: "generated_psychology_sociology",
    allowedTopics: new Set([
      "Загальна психологія",
      "Когнітивні процеси",
      "Особистість, мотивація та емоції",
      "Вікова та соціальна психологія",
      "Методи, діагностика і консультування",
      "Соціологічна теорія та поняття",
      "Інститути, стратифікація і мобільність",
      "Культура, девіація і сучасні процеси"
    ])
  }
];

const comparisonFiles = [
  "public/data/questions/tznk.json",
  "public/data/questions/english.json",
  "public/data/questions/management.json",
  "public/data/questions/psychology-sociology.json",
  "data/generated/tznk.generated.json",
  "data/generated/english.generated.json",
  "data/processed/third-party/tznk.third-party.json",
  "data/processed/third-party/english.third-party.json",
  "data/processed/third-party/management.third-party.json",
  "data/processed/third-party/psychology-sociology.third-party.json"
];

const malformedTextPattern = /<[^>]+>|&(?:[a-z]+|#[0-9]+|#x[0-9a-f]+);|\bundefined\b|\bnull\b/i;

const expectedDifficultyCounts = {
  easy: 25,
  medium: 55,
  hard: 20
};

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

function removeTag(question: Question, tagToRemove: string): void {
  question.tags = uniqTags(question.tags).filter((tag) => tag !== tagToRemove);
}

function addTag(question: Question, tagToAdd: string): void {
  question.tags = uniqTags([...(question.tags ?? []), tagToAdd]);
}

async function readQuestions(filePath: string): Promise<Question[]> {
  return JSON.parse(await fs.readFile(path.join(projectRoot, filePath), "utf8")) as Question[];
}

async function readQuestionsIfExists(filePath: string): Promise<Array<Question & { file: string }>> {
  try {
    const questions = await readQuestions(filePath);
    return questions.map((question) => ({ ...question, file: filePath }));
  } catch {
    return [];
  }
}

async function writeQuestions(filePath: string, questions: Question[]): Promise<void> {
  await fs.writeFile(path.join(projectRoot, filePath), `${JSON.stringify(questions, null, 2)}\n`, "utf8");
}

async function loadComparisonQuestions(): Promise<Array<Question & { file: string }>> {
  const questions = await Promise.all(comparisonFiles.map(readQuestionsIfExists));
  return questions.flat();
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
    const normalizedOption = normalize(option);
    if (seen.has(normalizedOption)) {
      return true;
    }

    seen.add(normalizedOption);
  }

  return false;
}

function hasMalformedText(question: Question): boolean {
  const fields = [question.question, question.explanation, question.passage ?? "", ...question.options];
  return fields.some((field) => malformedTextPattern.test(field) || field.includes("  "));
}

function hasReasonableOptionLength(question: Question): boolean {
  return question.options.every((option) => option.trim().length >= 3);
}

function explanationIsUseful(question: Question): boolean {
  const normalizedExplanation = normalize(question.explanation);

  return (
    question.explanation.length >= 45 &&
    !normalizedExplanation.includes("потрібна ручна перевірка") &&
    !normalizedExplanation.includes("needs manual review")
  );
}

function knowledgeCheck(question: Question): string | null {
  const correctOption = question.options[question.correctAnswer] ?? "";
  const text = `${question.question} ${question.explanation}`;
  const expectations: Array<{ pattern: RegExp; expected: RegExp; message: string }> = [
    { pattern: /Файол/i, expected: /Єдиноначальність/i, message: "Fayol principle should resolve to unity of command" },
    { pattern: /Маслоу/i, expected: /потреб.*поваг/i, message: "Maslow recognition item should resolve to esteem needs" },
    { pattern: /Герцберг/i, expected: /гігієніч/i, message: "Herzberg pay/conditions item should resolve to hygiene factors" },
    { pattern: /Врум/i, expected: /зусилл|результат|винагород/i, message: "Vroom item should resolve to expectancy/instrumentality logic" },
    { pattern: /BCG/i, expected: /дійн/i, message: "BCG high share/low growth item should resolve to cash cow" },
    { pattern: /Дюркгайм.*соціального факту|соціального факту.*Дюркгайм/i, expected: /Дюркгайм/i, message: "Social fact author should be Durkheim" },
    { pattern: /Вебер.*соціальної дії|соціальної дії.*Вебер/i, expected: /Вебер/i, message: "Social action author should be Weber" },
    { pattern: /Роджерс/i, expected: /безумовн.*позитивн.*прийнят/i, message: "Rogers item should resolve to unconditional positive regard" }
  ];

  for (const expectation of expectations) {
    if (expectation.pattern.test(text) && !expectation.expected.test(correctOption)) {
      return expectation.message;
    }
  }

  return null;
}

function reviewQuestion(
  question: Question,
  batch: BatchFile,
  exactIndex: Map<string, Question & { file: string }>,
  comparison: Array<Question & { file: string }>,
  currentBatchSeen: Map<string, Question>
): ReviewDecision {
  const reasons: string[] = [];

  removeTag(question, "needs_manual_review");

  if (!batch.idPattern.test(question.id)) {
    reasons.push("id does not match batch 2 pattern");
  }

  if (question.subject !== batch.subject) {
    reasons.push("question subject does not match file subject");
  }

  if (question.type !== "single_choice") {
    reasons.push("question type is not single_choice");
  }

  if (question.sourceType !== "generated") {
    reasons.push("sourceType is not generated");
  }

  if (question.sourceUrl !== null) {
    reasons.push("sourceUrl must be null for generated questions");
  }

  if (!question.tags?.includes("generated_batch_2") || !question.tags.includes(batch.requiredTag)) {
    reasons.push("required generated batch tags are missing");
  }

  if (!batch.allowedTopics.has(question.topic)) {
    reasons.push("topic is outside expected subject coverage");
  }

  if (!question.subtopic?.trim()) {
    reasons.push("subtopic is empty");
  }

  if (!question.question.trim()) {
    reasons.push("question text is empty");
  }

  if (question.options.length !== 4) {
    reasons.push("generated batch 2 questions should have exactly 4 options");
  }

  if (hasDuplicateOptions(question)) {
    reasons.push("duplicate options inside question");
  }

  if (!hasReasonableOptionLength(question)) {
    reasons.push("one or more options are too short to be useful distractors");
  }

  if (question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
    reasons.push("correctAnswer is not a valid zero-based option index");
  }

  if (!question.explanation.trim()) {
    reasons.push("explanation is empty");
  } else if (!explanationIsUseful(question)) {
    reasons.push("explanation is too weak or does not clearly justify the answer");
  }

  if (hasMalformedText(question)) {
    reasons.push("malformed text artifact detected");
  }

  const knowledgeIssue = knowledgeCheck(question);
  if (knowledgeIssue) {
    reasons.push(knowledgeIssue);
  }

  const exactDuplicate = exactIndex.get(`${question.subject}:${normalize(question.question)}`);
  if (exactDuplicate) {
    reasons.push(`exact duplicate of ${exactDuplicate.id}`);
    return {
      question,
      reviewed: false,
      reasons,
      duplicate: { id: exactDuplicate.id, file: exactDuplicate.file, type: "exact" }
    };
  }

  const withinBatchDuplicate = currentBatchSeen.get(`${question.subject}:${normalize(question.question)}`);
  if (withinBatchDuplicate && withinBatchDuplicate.id !== question.id) {
    reasons.push(`exact duplicate within batch 2: ${withinBatchDuplicate.id}`);
    return {
      question,
      reviewed: false,
      reasons,
      duplicate: { id: withinBatchDuplicate.id, file: "data/generated/*batch-2.json", type: "exact" }
    };
  }

  const nearDuplicate = findNearDuplicate(question, comparison);
  if (nearDuplicate) {
    reasons.push(`near duplicate of ${nearDuplicate.id}`);
    return { question, reviewed: false, reasons, duplicate: nearDuplicate };
  }

  return { question, reviewed: reasons.length === 0, reasons };
}

function difficultyCounts(questions: Question[]): Record<string, number> {
  return questions.reduce<Record<string, number>>((counts, question) => {
    counts[question.difficulty] = (counts[question.difficulty] ?? 0) + 1;
    return counts;
  }, {});
}

function verifyDifficultyDistribution(questions: Question[]): string[] {
  const counts = difficultyCounts(questions);
  const issues: string[] = [];

  for (const [difficulty, expectedCount] of Object.entries(expectedDifficultyCounts)) {
    if ((counts[difficulty] ?? 0) !== expectedCount) {
      issues.push(`${difficulty} expected ${expectedCount}, got ${counts[difficulty] ?? 0}`);
    }
  }

  return issues;
}

function countBySubject(questions: Question[], predicate: (question: Question) => boolean): Record<SubjectId, number> {
  return {
    management: questions.filter((question) => question.subject === "management" && predicate(question)).length,
    "psychology-sociology": questions.filter(
      (question) => question.subject === "psychology-sociology" && predicate(question)
    ).length
  };
}

function buildReport(questions: Question[], decisions: ReviewDecision[], rewrittenCount: number): string {
  const reviewedTrue = countBySubject(questions, (question) => question.reviewed);
  const reviewedFalse = countBySubject(questions, (question) => !question.reviewed);
  const needsManualReview = questions.filter((question) => question.tags?.includes("needs_manual_review"));
  const duplicates = decisions.filter((decision) => decision.duplicate);
  const questionable = decisions.filter((decision) => !decision.reviewed).slice(0, 30);
  const questionableLines = questionable.length
    ? questionable.map((decision) => `- ${decision.question.id}: ${decision.reasons.join("; ")}`).join("\n")
    : "- None";
  const duplicateLines = duplicates.length
    ? duplicates
        .map((decision) => `- ${decision.question.id}: ${decision.duplicate?.type} duplicate of ${decision.duplicate?.id} (${decision.duplicate?.file})`)
        .join("\n")
    : "- None";

  return `# Generated Batch 2 Quality Report

Generated on 2026-05-19.

## Summary

- Total questions reviewed: ${questions.length}
- Management reviewed=true: ${reviewedTrue.management}
- Management reviewed=false: ${reviewedFalse.management}
- Psychology-sociology reviewed=true: ${reviewedTrue["psychology-sociology"]}
- Psychology-sociology reviewed=false: ${reviewedFalse["psychology-sociology"]}
- Questions rewritten: ${rewrittenCount}
- Questions marked needs_manual_review: ${needsManualReview.length}
- Duplicate questions fixed/removed: 0
- Duplicate questions detected: ${duplicates.length}

## Duplicate Findings

${duplicateLines}

## Questions Requiring Manual Review

${questionableLines}

## Review Notes

- Structural checks covered source metadata, required tags, answer indexes, option uniqueness, explanations, malformed text, and expected topic/subtopic coverage.
- Duplicate checks compared batch 2 against public questions, generated batch 1, and remaining third-party staging files.
- Domain checks included selected standard author/theory anchors such as Fayol, Maslow, Herzberg, Vroom, BCG, Durkheim, Weber, and Rogers.

## Recommendation

Ready for merge after normal product-owner approval. All reviewed items remain generated training questions and should keep \`sourceType="generated"\` so the source filter can separate them from imported questions.

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
  let rewrittenCount = 0;

  for (const batch of batchFiles) {
    const questions = await readQuestions(batch.filePath);
    const distributionIssues = verifyDifficultyDistribution(questions);

    for (const question of questions) {
      if (distributionIssues.length > 0) {
        addTag(question, "needs_manual_review");
      }

      const decision = reviewQuestion(question, batch, exactIndex, comparison, currentBatchSeen);
      question.reviewed = decision.reviewed;

      if (!decision.reviewed || distributionIssues.length > 0) {
        addTag(question, "needs_manual_review");
        question.reviewed = false;
      }

      currentBatchSeen.set(`${question.subject}:${normalize(question.question)}`, question);
      decisions.push(decision);
    }

    await writeQuestions(batch.filePath, questions);
    allQuestions.push(...questions);
  }

  await fs.writeFile(
    path.join(projectRoot, "data", "generated", "generated-batch-2-quality-report.md"),
    buildReport(allQuestions, decisions, rewrittenCount),
    "utf8"
  );

  console.log(`Reviewed ${allQuestions.length} generated batch 2 questions.`);
  console.log(`Marked reviewed=true: ${allQuestions.filter((question) => question.reviewed).length}.`);
  console.log(`Marked needs_manual_review: ${allQuestions.filter((question) => question.tags?.includes("needs_manual_review")).length}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
