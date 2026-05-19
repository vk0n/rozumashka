import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

type SubjectId = "tznk" | "english" | "management" | "psychology-sociology";
type Difficulty = Question["difficulty"];

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
  rewritten: boolean;
}

interface SubjectSummary {
  total: number;
  reviewedTrue: number;
  reviewedFalse: number;
  rewritten: number;
  needsManualReview: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const batchFiles: BatchFile[] = [
  {
    subject: "tznk",
    filePath: "data/generated/tznk.generated-batch-3.json",
    idPattern: /^tznk-generated-b3-\d{3}$/,
    requiredTag: "generated_tznk",
    allowedTopics: new Set([
      "Вербальне мислення",
      "Логічне мислення",
      "Аналітичне мислення",
      "Критичне читання",
      "Короткі висновки",
      "Послідовності",
      "Кількісне мислення",
      "Інтерпретація даних",
      "Дані та таблиці",
      "Оцінювання аргументів",
      "Умови та обмеження"
    ])
  },
  {
    subject: "english",
    filePath: "data/generated/english.generated-batch-3.json",
    idPattern: /^english-generated-b3-\d{3}$/,
    requiredTag: "generated_english",
    allowedTopics: new Set(["Reading comprehension", "Grammar", "Vocabulary", "Cloze and sentence completion"])
  },
  {
    subject: "management",
    filePath: "data/generated/management.generated-batch-3.json",
    idPattern: /^management-generated-b3-\d{3}$/,
    requiredTag: "generated_management",
    allowedTopics: new Set([
      "Теорія менеджменту",
      "Функції менеджменту",
      "Стратегія та організаційні структури",
      "Лідерство, мотивація та комунікація",
      "Лідерство, мотивація і комунікація",
      "HR та організаційна поведінка",
      "Маркетинг і клієнтська орієнтація",
      "Фінанси, облік та економічні основи",
      "Фінанси, облік та економіка",
      "Проєкти, операції, інновації та ризики",
      "Проєкти, операції, інновації і ризики",
      "Публічне адміністрування, врядування та підприємництво",
      "Публічне адміністрування і підприємництво",
      "Організаційна культура, зміни та результативність",
      "Культура, зміни та результативність"
    ])
  },
  {
    subject: "psychology-sociology",
    filePath: "data/generated/psychology-sociology.generated-batch-3.json",
    idPattern: /^psych-soc-generated-b3-\d{3}$/,
    requiredTag: "generated_psychology_sociology",
    allowedTopics: new Set([
      "Загальна психологія та когнітивні процеси",
      "Загальна психологія і когнітивні процеси",
      "Особистість, мотивація та емоції",
      "Вікова та соціальна психологія",
      "Методи, психодіагностика і консультування",
      "Методи, діагностика і консультування",
      "Соціологічна теорія та поняття",
      "Соціологічна теорія і поняття",
      "Соціальні інститути, стратифікація і мобільність",
      "Інститути, стратифікація і мобільність",
      "Культура, соціалізація, девіація і сучасні процеси",
      "Демографія, урбанізація, сім'я, освіта, релігія та економіка",
      "Демографія, урбанізація та соціальні інститути"
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
  "data/generated/management.generated-batch-2.json",
  "data/generated/psychology-sociology.generated-batch-2.json",
  "data/processed/third-party/tznk.third-party.json",
  "data/processed/third-party/english.third-party.json",
  "data/processed/third-party/management.third-party.json",
  "data/processed/third-party/psychology-sociology.third-party.json"
];

const malformedTextPattern = /<[^>]+>|&(?:[a-z]+|#[0-9]+|#x[0-9a-f]+);|\bundefined\b|\bnull\b/i;

const manualReviewReasons = new Map<string, string[]>();

const contentPatches: Record<string, Partial<Question>> = {
  "tznk-generated-b3-027": {
    correctAnswer: 2,
    explanation:
      "У послідовності кожен наступний член отримуємо діленням попереднього на 3: 81 / 3 = 27, 27 / 3 = 9, 9 / 3 = 3. Отже, наступне число: 3 / 3 = 1.",
    explanationByOption: [
      "2 не відповідає правилу послідовного ділення на 3.",
      "6 не утворюється з попереднього числа 3 за правилом ділення на 3.",
      "Правильно: 3 / 3 = 1.",
      "0 не є результатом ділення 3 на 3."
    ]
  },
  "tznk-generated-b3-028": {
    question: "Яке число має продовжити послідовність: 5, 9, 17, 33, ...?",
    options: ["65", "49", "57", "70"],
    correctAnswer: 0,
    difficulty: "easy",
    explanation:
      "Прирости між сусідніми числами подвоюються: +4, +8, +16. Наступний приріст має бути +32, тому 33 + 32 = 65.",
    explanationByOption: [
      "Правильно: наступний приріст дорівнює 32.",
      "49 виникло б, якби приріст знову дорівнював 16, але він має подвоїтися.",
      "57 не відповідає закономірності подвоєння приростів.",
      "70 не утворюється з послідовності приростів +4, +8, +16, +32."
    ]
  },
  "english-generated-b3-096": {
    question: "Complete this sentence: A clear map helps visitors ___ the building without asking for directions.",
    options: ["find their way around", "wait near the door of", "walk past the entrance to", "look only at the outside of"],
    correctAnswer: 0,
    difficulty: "easy",
    explanation:
      "\"Find their way around\" means to understand how to move through a place, which matches the purpose of a clear map.",
    explanationByOption: [
      "Correct: a map helps people navigate inside or around a building.",
      "\"Wait near the door\" does not describe using a map to navigate.",
      "\"Walk past the entrance\" means not entering the building, so it does not fit.",
      "\"Look only at the outside\" does not match the idea of finding directions."
    ]
  },
  "english-generated-b3-054": {
    explanation:
      "The adjective/verb phrase \"depend on\" is a fixed collocation in English. The other prepositions do not normally follow \"depend\" in this meaning.",
    explanationByOption: [
      "\"From\" is not used after \"depend\" in this sentence.",
      "\"At\" does not form the correct collocation.",
      "\"With\" is not the standard preposition after \"depend\" here.",
      "Correct: something depends on support, help, money, or another condition."
    ]
  },
  "english-generated-b3-072": {
    explanation:
      "In this context, \"brief\" describes an explanation that does not take much time and is not long, so the closest meaning is \"short\".",
    explanationByOption: [
      "\"Expensive\" is about price, not length.",
      "Correct: \"brief\" means short in time or length.",
      "\"Angry\" describes emotion, not length.",
      "\"Secret\" means hidden or private, not brief."
    ]
  },
  "english-generated-b3-073": {
    explanation:
      "\"Purchase\" is a more formal verb meaning \"buy\". The other options describe different actions and do not match the meaning.",
    explanationByOption: [
      "Correct: to purchase something is to buy it.",
      "\"Borrow\" means to use something temporarily and return it.",
      "\"Repair\" means to fix something.",
      "\"Hide\" means to put something where others cannot see it."
    ]
  },
  "english-generated-b3-074": {
    explanation:
      "\"Assist\" means to help someone do something. The other verbs have different meanings and do not express support.",
    explanationByOption: [
      "\"Delay\" means to make something happen later.",
      "\"Forget\" means not to remember.",
      "\"Divide\" means to separate into parts.",
      "Correct: \"assist\" means \"help\"."
    ]
  },
  "english-generated-b3-081": {
    explanation:
      "\"Require\" means that something is necessary or needed. In the sentence-level meaning, \"need\" is the closest synonym.",
    explanationByOption: [
      "Correct: \"require\" means to need or demand something.",
      "\"Avoid\" means to stay away from something.",
      "\"Decorate\" means to make something look attractive.",
      "\"Lend\" means to give something temporarily."
    ]
  },
  "english-generated-b3-083": {
    explanation:
      "\"Initial\" refers to the beginning stage or the first part of a process, so \"first\" is the closest meaning.",
    explanationByOption: [
      "\"Usual\" means common or normal.",
      "\"Hidden\" means not easy to see.",
      "Correct: \"initial\" means first or at the beginning.",
      "\"Final\" means last, which is the opposite idea."
    ]
  },
  "english-generated-b3-084": {
    explanation:
      "\"Improve\" means to make something better than it was before. The other options either change the meaning or express the opposite.",
    explanationByOption: [
      "\"Make secret\" means hide information, not improve it.",
      "Correct: to improve something is to make it better.",
      "\"Make worse\" is the opposite of improve.",
      "\"Make empty\" does not match the meaning."
    ]
  },
  "english-generated-b3-099": {
    explanation:
      "\"So that\" introduces a purpose: the museum stayed open later with the aim of allowing more families to visit after work.",
    explanationByOption: [
      "\"Instead of\" shows replacement, not purpose.",
      "\"As soon as\" refers to time, not purpose.",
      "Correct: \"so that\" explains the purpose of staying open later.",
      "\"Even though\" introduces contrast, which does not fit the sentence."
    ]
  },
  "english-generated-b3-100": {
    options: [
      "As a result, users can manage their work more easily.",
      "For example, the app uses a simple colour scheme.",
      "However, some reminders can be repeated every day.",
      "In addition, many tasks have different names."
    ],
    correctAnswer: 0,
    difficulty: "medium",
    explanation:
      "The correct sentence gives a logical result of reminders and task tracking. The other options mention related details but do not complete the cause-and-effect relationship.",
    explanationByOption: [
      "Correct: this result follows from reminders and progress tracking.",
      "A colour scheme may be useful, but it is not the result of reminders and task tracking.",
      "Repeated reminders are an extra detail, not the main consequence.",
      "Different task names do not explain the benefit described in the sentence."
    ]
  }
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

function addTag(question: Question, tagToAdd: string): void {
  question.tags = uniqTags([...(question.tags ?? []), tagToAdd]);
}

function removeTag(question: Question, tagToRemove: string): void {
  question.tags = uniqTags(question.tags).filter((tag) => tag !== tagToRemove);
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
  return fields.some((field) => malformedTextPattern.test(field) || /\s{2,}/.test(field));
}

function explanationIsUseful(question: Question): boolean {
  const normalizedExplanation = normalize(question.explanation);

  return (
    question.explanation.trim().length >= 45 &&
    !normalizedExplanation.includes("потрібна ручна перевірка") &&
    !normalizedExplanation.includes("needs manual review")
  );
}

function applyContentPatch(question: Question): boolean {
  const patch = contentPatches[question.id];

  if (!patch) {
    return false;
  }

  Object.assign(question, patch);
  return true;
}

function recommendedDifficulty(question: Question): Difficulty | null {
  if (question.subject === "tznk") {
    if (["Вербальне мислення", "Послідовності", "Кількісне мислення", "Інтерпретація даних"].includes(question.topic)) {
      return "easy";
    }

    if (["Критичне читання", "Оцінювання аргументів", "Умови та обмеження"].includes(question.topic)) {
      return "hard";
    }

    return "medium";
  }

  if (question.subject === "english") {
    if (question.topic === "Vocabulary") {
      return "easy";
    }

    if (question.topic === "Grammar" || question.topic === "Cloze and sentence completion") {
      return "medium";
    }

    if (question.subtopic && /inference|text coherence|purpose/i.test(question.subtopic)) {
      return "medium";
    }

    return "easy";
  }

  if (question.question.startsWith("У завданні наведено опис")) {
    return "easy";
  }

  if (question.question.startsWith("Чому поняття")) {
    return "hard";
  }

  return "medium";
}

function normalizeDifficulty(question: Question): boolean {
  const expected = recommendedDifficulty(question);

  if (!expected || question.difficulty === expected) {
    return false;
  }

  question.difficulty = expected;
  return true;
}

function domainReviewReasons(question: Question): string[] {
  const reasons: string[] = [];

  if (question.subject === "tznk") {
    if (!question.tags?.includes("self_checked_single_answer")) {
      reasons.push("TZNK question lacks self_checked_single_answer tag");
    }

    if (question.type === "passage_single_choice" && !question.passage?.trim()) {
      reasons.push("passage_single_choice TZNK question has no passage");
    }
  }

  if (question.subject === "english") {
    if (question.type === "passage_single_choice" && !question.passage?.trim()) {
      reasons.push("passage-based English question has no passage");
    }

    if (/[А-ЯІЇЄҐа-яіїєґ]/.test(`${question.question} ${question.options.join(" ")} ${question.explanation}`)) {
      reasons.push("English question contains Ukrainian/Cyrillic text");
    }
  }

  if (
    (question.subject === "management" || question.subject === "psychology-sociology") &&
    question.question.startsWith("Чому поняття")
  ) {
    reasons.push("rationale-template item has weak cross-concept distractors and needs editorial review");
  }

  return reasons;
}

function knowledgeCheck(question: Question): string | null {
  const correctOption = question.options[question.correctAnswer] ?? "";
  const text = `${question.question} ${question.explanation}`;
  const expectations: Array<{ pattern: RegExp; expected: RegExp; message: string }> = [
    { pattern: /Файол/i, expected: /єдиноначаль/i, message: "Fayol item should resolve to unity of command" },
    { pattern: /Маслоу/i, expected: /потреб|ієрарх/i, message: "Maslow item should resolve to hierarchy of needs" },
    { pattern: /Герцберг/i, expected: /гігієніч|мотиватор/i, message: "Herzberg item should resolve to hygiene factors or motivators" },
    { pattern: /Врум/i, expected: /очікуван|зусилл|результат|винагород/i, message: "Vroom item should resolve to expectancy logic" },
    { pattern: /BCG/i, expected: /матриц|зірк|дійн|собак|знак/i, message: "BCG item should resolve to a standard BCG matrix concept" },
    { pattern: /Дюркгайм/i, expected: /соціальн.*факт|дюркгайм/i, message: "Durkheim item should not misattribute social facts" },
    { pattern: /Вебер/i, expected: /соціальн.*ді|вебер|легітимн/i, message: "Weber item should not misattribute social action or legitimacy" },
    { pattern: /Роджерс/i, expected: /безумовн|прийнят|клієнт/i, message: "Rogers item should resolve to client-centered counselling" },
    { pattern: /Піаже/i, expected: /операц|асиміляц|акомодац|когнітив/i, message: "Piaget item should resolve to standard cognitive-development concepts" }
  ];

  for (const expectation of expectations) {
    if (expectation.pattern.test(text) && !expectation.expected.test(`${correctOption} ${question.explanation}`)) {
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
  let rewritten = false;

  removeTag(question, "needs_manual_review");

  rewritten = applyContentPatch(question) || rewritten;
  rewritten = normalizeDifficulty(question) || rewritten;

  if (!batch.idPattern.test(question.id)) {
    reasons.push("id does not match batch 3 pattern");
  }

  if (question.subject !== batch.subject) {
    reasons.push("question subject does not match file subject");
  }

  if (question.sourceType !== "generated") {
    reasons.push("sourceType is not generated");
  }

  if (question.sourceUrl !== null) {
    reasons.push("generated question has non-null sourceUrl");
  }

  if (!question.tags?.includes("generated_batch_3")) {
    reasons.push("missing generated_batch_3 tag");
  }

  if (!question.tags?.includes(batch.requiredTag)) {
    reasons.push(`missing ${batch.requiredTag} tag`);
  }

  if (!batch.allowedTopics.has(question.topic)) {
    reasons.push(`unexpected topic "${question.topic}"`);
  }

  if (!question.subtopic?.trim()) {
    reasons.push("empty subtopic");
  }

  if (question.type !== "single_choice" && question.type !== "passage_single_choice") {
    reasons.push("invalid generated question type");
  }

  if (question.subject !== "english" && question.subject !== "tznk" && question.type !== "single_choice") {
    reasons.push("ЄФВВ generated subject questions should be single_choice");
  }

  if (!question.question.trim()) {
    reasons.push("empty question text");
  }

  if (question.options.length < 4) {
    reasons.push("fewer than four options");
  }

  if (question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
    reasons.push("correctAnswer is outside option range");
  }

  if (hasDuplicateOptions(question)) {
    reasons.push("duplicate options inside question");
  }

  if (!question.options.every((option) => option.trim().length > 0)) {
    reasons.push("one or more options are empty");
  }

  if (!explanationIsUseful(question)) {
    reasons.push("explanation is too short or not useful enough");
  }

  if (hasMalformedText(question)) {
    reasons.push("malformed text or formatting artifact detected");
  }

  const domainReasons = domainReviewReasons(question);
  reasons.push(...domainReasons);

  const knowledgeIssue = knowledgeCheck(question);
  if (knowledgeIssue) {
    reasons.push(knowledgeIssue);
  }

  const exactDuplicate = exactIndex.get(`${question.subject}:${normalize(question.question)}`);
  const ownDuplicate = currentBatchSeen.get(`${question.subject}:${normalize(question.question)}`);
  let duplicate: DuplicateMatch | undefined;

  if (exactDuplicate) {
    duplicate = { id: exactDuplicate.id, file: exactDuplicate.file, type: "exact" };
    reasons.push(`exact duplicate of ${exactDuplicate.id} in ${exactDuplicate.file}`);
  } else if (ownDuplicate) {
    duplicate = { id: ownDuplicate.id, file: batch.filePath, type: "exact" };
    reasons.push(`exact duplicate of ${ownDuplicate.id} in same batch`);
  } else {
    duplicate = findNearDuplicate(question, comparison);
    if (duplicate) {
      reasons.push(`near duplicate of ${duplicate.id} in ${duplicate.file}`);
    }
  }

  const reviewed = reasons.length === 0;
  question.reviewed = reviewed;

  if (reviewed) {
    removeTag(question, "needs_manual_review");
  } else {
    addTag(question, "needs_manual_review");
    manualReviewReasons.set(question.id, reasons);
  }

  currentBatchSeen.set(`${question.subject}:${normalize(question.question)}`, question);

  return { question, reviewed, reasons, duplicate, rewritten };
}

function emptySummary(): SubjectSummary {
  return {
    total: 0,
    reviewedTrue: 0,
    reviewedFalse: 0,
    rewritten: 0,
    needsManualReview: 0
  };
}

function formatSubject(subject: SubjectId): string {
  const labels: Record<SubjectId, string> = {
    tznk: "ТЗНК",
    english: "Англійська мова",
    management: "Управління та адміністрування",
    "psychology-sociology": "Психологія та соціологія"
  };

  return labels[subject];
}

async function writeReport(
  summaries: Record<SubjectId, SubjectSummary>,
  questionableExamples: Array<{ id: string; subject: SubjectId; reasons: string[] }>,
  duplicates: DuplicateMatch[],
  validationResult: string,
  buildResult: string
): Promise<void> {
  const totalReviewed = Object.values(summaries).reduce((sum, summary) => sum + summary.total, 0);
  const totalRewritten = Object.values(summaries).reduce((sum, summary) => sum + summary.rewritten, 0);
  const totalNeedsManual = Object.values(summaries).reduce((sum, summary) => sum + summary.needsManualReview, 0);
  const reviewedTrue = Object.values(summaries).reduce((sum, summary) => sum + summary.reviewedTrue, 0);
  const reviewedFalse = Object.values(summaries).reduce((sum, summary) => sum + summary.reviewedFalse, 0);

  const lines = [
    "# Generated Batch 3 Quality Report",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Total questions reviewed: ${totalReviewed}`,
    `- Reviewed true: ${reviewedTrue}`,
    `- Reviewed false: ${reviewedFalse}`,
    `- Questions rewritten: ${totalRewritten}`,
    `- Questions marked needs_manual_review: ${totalNeedsManual}`,
    `- Duplicate questions fixed/removed: 0`,
    `- Duplicate questions detected and kept out of reviewed=true: ${duplicates.length}`,
    "",
    "## Reviewed status by subject",
    "",
    "| Subject | Total | reviewed=true | reviewed=false | Rewritten | needs_manual_review |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...Object.entries(summaries).map(([subject, summary]) =>
      `| ${formatSubject(subject as SubjectId)} | ${summary.total} | ${summary.reviewedTrue} | ${summary.reviewedFalse} | ${summary.rewritten} | ${summary.needsManualReview} |`
    ),
    "",
    "## Duplicate review",
    "",
    duplicates.length
      ? duplicates.map((duplicate) => `- ${duplicate.type}: ${duplicate.id} in ${duplicate.file}`).join("\n")
      : "- No exact or near-duplicate questions were detected after scripted fixes.",
    "",
    "## Questionable examples",
    "",
    questionableExamples.length
      ? questionableExamples
          .map(
            (example) =>
              `- ${example.id} (${formatSubject(example.subject)}): ${example.reasons.slice(0, 3).join("; ")}`
          )
          .join("\n")
      : "- No questionable examples after review.",
    "",
    "## Validation result",
    "",
    validationResult,
    "",
    "## Build result",
    "",
    buildResult,
    "",
    "## Recommendation",
    "",
    totalNeedsManual === 0
      ? "Batch 3 is ready for merge."
      : "Batch 3 is ready only for selective merge of reviewed=true questions. Keep reviewed=false questions out of the public bank until a human/editorial pass improves the weak distractors or resolves the manual-review notes.",
    ""
  ];

  await fs.writeFile(path.join(projectRoot, "data/generated/generated-batch-3-quality-report.md"), `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const comparison = await loadComparisonQuestions();
  const exactIndex = buildExactIndex(comparison);
  const summaries: Record<SubjectId, SubjectSummary> = {
    tznk: emptySummary(),
    english: emptySummary(),
    management: emptySummary(),
    "psychology-sociology": emptySummary()
  };
  const questionableExamples: Array<{ id: string; subject: SubjectId; reasons: string[] }> = [];
  const duplicates: DuplicateMatch[] = [];

  for (const batch of batchFiles) {
    const questions = await readQuestions(batch.filePath);
    const currentBatchSeen = new Map<string, Question>();
    const reviewedQuestions: Question[] = [];

    for (const question of questions) {
      const decision = reviewQuestion(question, batch, exactIndex, comparison, currentBatchSeen);
      reviewedQuestions.push(decision.question);

      const summary = summaries[batch.subject];
      summary.total += 1;
      summary.rewritten += decision.rewritten ? 1 : 0;
      summary.reviewedTrue += decision.reviewed ? 1 : 0;
      summary.reviewedFalse += decision.reviewed ? 0 : 1;
      summary.needsManualReview += decision.question.tags?.includes("needs_manual_review") ? 1 : 0;

      if (decision.duplicate) {
        duplicates.push(decision.duplicate);
      }

      if (!decision.reviewed && questionableExamples.length < 12) {
        questionableExamples.push({
          id: decision.question.id,
          subject: batch.subject,
          reasons: decision.reasons
        });
      }
    }

    await writeQuestions(batch.filePath, reviewedQuestions);
  }

  await writeReport(
    summaries,
    questionableExamples,
    duplicates,
    "Pending. Run `npm run validate:questions` after this review script.",
    "Pending. Run `npm run build` after validation."
  );

  console.log("Generated batch 3 review completed.");
  for (const [subject, summary] of Object.entries(summaries)) {
    console.log(
      `${subject}: reviewed=true ${summary.reviewedTrue}, reviewed=false ${summary.reviewedFalse}, rewritten ${summary.rewritten}`
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
