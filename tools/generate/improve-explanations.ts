import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const explanationsDir = path.join(projectRoot, "data", "explanations");
const inputPath = path.join(explanationsDir, "explanation-improvement-input.json");
const promptPath = path.join(explanationsDir, "explanation-improvement-prompt.md");
const outputPath = path.join(explanationsDir, "explanation-improvement-output.json");
const reportPath = path.join(explanationsDir, "explanation-style-v2-report.md");

const publicQuestionsDir = path.join(projectRoot, "public", "data", "questions");
const generatedDir = path.join(projectRoot, "data", "generated");
const thirdPartyDir = path.join(projectRoot, "data", "processed", "third-party");

const ukLetters = ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З"];
const enLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];

interface QuestionFile {
  filePath: string;
  relativePath: string;
}

interface ImprovementInputItem {
  filePath: string;
  id: string;
  subject: string;
  type: Question["type"];
  topic: string;
  subtopic?: string;
  question: string;
  passage?: string;
  options: string[];
  correctAnswer: number;
  correctLetter: string;
  correctOption: string;
  currentExplanation: string;
  currentExplanationByOption?: string[];
  sourceType: Question["sourceType"];
  sourceUrl?: string | null;
  reviewed: boolean;
  tags?: string[];
  weakReasons: string[];
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectJsonFiles(directory: string): Promise<QuestionFile[]> {
  if (!(await pathExists(directory))) {
    return [];
  }

  const entries = await fs.readdir(directory);
  return entries
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => {
      const filePath = path.join(directory, entry);
      return {
        filePath,
        relativePath: path.relative(projectRoot, filePath)
      };
    });
}

async function readQuestions(filePath: string): Promise<Question[]> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as Question[];
}

function getLetters(subject: string): string[] {
  return subject === "english" ? enLetters : ukLetters;
}

function isStructuredExplanation(explanation: string): boolean {
  return (
    explanation.includes("Тут правильна відповідь") &&
    explanation.includes("Чому правильна відповідь") &&
    explanation.includes("Чому не інші варіанти") &&
    explanation.includes("Як запам’ятати") &&
    explanation.includes("Коротко:")
  );
}

function findWeakReasons(question: Question): string[] {
  const explanation = question.explanation?.trim() ?? "";
  const reasons: string[] = [];

  if (!explanation) {
    reasons.push("empty_explanation");
  }

  if (
    explanation.includes("Офіційне джерело позначає цей варіант як правильний") ||
    explanation.includes("пояснення в джерелі не наведено")
  ) {
    reasons.push("placeholder_explanation");
  }

  if (!isStructuredExplanation(explanation)) {
    reasons.push("not_style_v2");
  }

  if (explanation.length < 700) {
    reasons.push("too_short_for_style_v2");
  }

  if (
    /Інші варіанти (описують|стосуються).+не (відповідають|пояснюють)/iu.test(explanation) ||
    explanation.includes("Саме цей варіант найточніше називає") ||
    explanation.includes("Саме цей варіант називає відповідне")
  ) {
    reasons.push("generic_distractor_explanation");
  }

  const letters = getLetters(question.subject);
  const hasAllOptionLetters = question.options.every((_, index) =>
    explanation.includes(`${letters[index]}.`)
  );

  if (!hasAllOptionLetters) {
    reasons.push("missing_option_by_option_explanation");
  }

  if (question.subject === "english" && /^(The|This|Correct|Option|Because|In this)/.test(explanation)) {
    reasons.push("english_explanation_not_ukrainian_first");
  }

  if (question.type === "passage_single_choice" && !question.passage) {
    reasons.push("passage_question_without_passage");
  }

  return [...new Set(reasons)];
}

function createPrompt(): string {
  return `# Explanation Style V2 Prompt

You are improving explanations for a Ukrainian ЄВІ/ЄФВВ static quiz app.

Use \`data/explanations/explanation-improvement-input.json\` as input and fill \`data/explanations/explanation-improvement-output.json\`.

Do not change question text, passage, options, correctAnswer, id, subject, sourceType, sourceUrl, or reviewed.

Return a JSON array. Each item must have:

\`\`\`json
{
  "filePath": "public/data/questions/example.json",
  "id": "question-id",
  "improvedExplanation": "full explanation",
  "explanationByOption": ["optional per-option notes"],
  "tagsToAdd": ["explanation_improved", "explanation_style_v2"],
  "uncertain": false,
  "notes": "short reviewer note"
}
\`\`\`

For Ukrainian-subject questions use Ukrainian letters:
- 0 = А
- 1 = Б
- 2 = В
- 3 = Г
- 4 = Д

For English questions use Latin letters:
- 0 = A
- 1 = B
- 2 = C
- 3 = D
- 4 = E

## Required format for Ukrainian-subject questions

Тут правильна відповідь — [LETTER]: “[correct option text]”.

1. Ключове поняття / ключові слова в умові

[Поясни, що саме питають у завданні. Виділи ключовий термін, поняття або підказку в умові.]

2. Чому правильна відповідь — [LETTER]

[Чітко поясни, чому правильний варіант є правильним.]

3. Чому не інші варіанти

А. [option A text] — [чому цей варіант неправильний або до якого іншого поняття він належить]
Б. [option B text] — [чому цей варіант неправильний]
В. [option C text] — [чому цей варіант неправильний]
Г. [option D text] — [чому цей варіант неправильний]

4. Як запам’ятати

[Коротке правило, мнемоніка, протиставлення, формула або проста підказка.]

Коротко:

[Одне речення, яке підсумовує, чому відповідь правильна.]

## Required format for English questions

Questions/passages/options stay in English, but explanations must be Ukrainian.

Тут правильна відповідь — [LETTER]: “[correct option text]”.

1. Ключова ідея

[Українською поясни, що саме перевіряє питання.]

2. Чому правильна відповідь — [LETTER]

[Українською поясни, чому правильний варіант підходить.]

3. Чому не інші варіанти

A. [option A text] — [українською поясни, чому варіант неправильний]
B. [option B text] — [українською поясни, чому варіант неправильний]
C. [option C text] — [українською поясни, чому варіант неправильний]
D. [option D text] — [українською поясни, чому варіант неправильний]

4. Як запам’ятати

[Коротке правило або підказка українською.]

Коротко:

[Одне речення українською.]

## Safety rules

- Never contradict \`correctAnswer\`.
- If the answer cannot be confidently justified, keep \`uncertain: true\` and add \`needs_explanation_review\` to \`tagsToAdd\`.
- For uncertain ТЗНК also add \`tznk_explanation_uncertain\`.
- Avoid fabricating facts, authors, theories, statistics, or source claims.
- Prefer clear exam-preparation language over academic verbosity.
`;
}

function createReport(params: {
  files: QuestionFile[];
  scanned: number;
  weakItems: ImprovementInputItem[];
  existingOutputCount: number;
}): string {
  const bySubject = new Map<string, number>();
  const byReason = new Map<string, number>();

  for (const item of params.weakItems) {
    bySubject.set(item.subject, (bySubject.get(item.subject) ?? 0) + 1);

    for (const reason of item.weakReasons) {
      byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
    }
  }

  const subjectLines = [...bySubject.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([subject, count]) => `- ${subject}: ${count}`)
    .join("\n");

  const reasonLines = [...byReason.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reason, count]) => `- ${reason}: ${count}`)
    .join("\n");

  const fileLines = params.files.map((file) => `- \`${file.relativePath}\``).join("\n");

  return `# Explanation Style V2 Report

Generated on ${new Date().toISOString()}.

## Scope

This run prepared a manual/LLM-assisted workflow because no local LLM CLI or API credentials are available inside the project environment. It did not rewrite public question files directly.

## Files Scanned

${fileLines}

## Summary

- Total questions scanned: ${params.scanned}
- Total explanations identified for improvement: ${params.weakItems.length}
- Questions skipped because explanation was already style-v2: ${params.scanned - params.weakItems.length}
- Existing output records ready to apply: ${params.existingOutputCount}
- Explanations applied in this run: 0
- Questions marked needs_explanation_review in this run: 0

## Improvement Candidates By Subject

${subjectLines || "- None"}

## Weak Reasons

${reasonLines || "- None"}

## Generated Workflow Files

- \`data/explanations/explanation-improvement-input.json\`
- \`data/explanations/explanation-improvement-prompt.md\`
- \`data/explanations/explanation-improvement-output.json\`
- \`tools/generate/apply-improved-explanations.ts\`

## How To Continue

1. Fill \`data/explanations/explanation-improvement-output.json\` with improved explanations using the prompt and input file.
2. Run \`npm run explanations:apply\`.
3. Run \`npm run validate:questions\`.
4. Run \`npm run build\`.

## Validation Result

- Pending after applying output.

## Build Result

- Pending after applying output.
`;
}

async function main() {
  await fs.mkdir(explanationsDir, { recursive: true });

  const files = [
    ...(await collectJsonFiles(publicQuestionsDir)),
    ...(await collectJsonFiles(generatedDir)),
    ...(await collectJsonFiles(thirdPartyDir))
  ];

  const weakItems: ImprovementInputItem[] = [];
  let scanned = 0;

  for (const file of files) {
    const questions = await readQuestions(file.filePath);
    scanned += questions.length;

    for (const question of questions) {
      const weakReasons = findWeakReasons(question);

      if (weakReasons.length === 0) {
        continue;
      }

      const letters = getLetters(question.subject);
      weakItems.push({
        filePath: file.relativePath,
        id: question.id,
        subject: question.subject,
        type: question.type,
        topic: question.topic,
        subtopic: question.subtopic,
        question: question.question,
        passage: question.passage,
        options: question.options,
        correctAnswer: question.correctAnswer,
        correctLetter: letters[question.correctAnswer] ?? String(question.correctAnswer),
        correctOption: question.options[question.correctAnswer],
        currentExplanation: question.explanation,
        currentExplanationByOption: question.explanationByOption,
        sourceType: question.sourceType,
        sourceUrl: question.sourceUrl,
        reviewed: question.reviewed,
        tags: question.tags,
        weakReasons
      });
    }
  }

  await fs.writeFile(inputPath, `${JSON.stringify(weakItems, null, 2)}\n`);
  await fs.writeFile(promptPath, createPrompt());

  if (!(await pathExists(outputPath))) {
    await fs.writeFile(outputPath, "[]\n");
  }

  const existingOutput = JSON.parse(await fs.readFile(outputPath, "utf8")) as unknown[];
  await fs.writeFile(
    reportPath,
    createReport({
      files,
      scanned,
      weakItems,
      existingOutputCount: Array.isArray(existingOutput) ? existingOutput.length : 0
    })
  );

  console.log(`Scanned ${scanned} questions across ${files.length} files.`);
  console.log(`Prepared ${weakItems.length} explanation improvement candidates.`);
  console.log(`Wrote ${path.relative(projectRoot, inputPath)}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
