import { promises as fs } from "node:fs";
import { questionsSchema } from "../../src/lib/schemas";
import {
  batchErrorsPath,
  batchInputPath,
  batchManualReviewPath,
  batchMetaPath,
  batchNormalizedOutputPath,
  batchRawOutputPath,
  candidateSchema,
  ensureTznkV3Dir,
  getExplanationModel,
  inputPath,
  noGeneralRulePlaceholder,
  outputPath,
  pathExists,
  promptPath,
  readJson,
  tznkQuestionsPath,
  writeJson,
  writeMetadata,
  type TznkV3Metadata
} from "./tznk-style-v3-common";

function createPrompt(): string {
  return `# ТЗНК Explanation Style V3 Prompt

Generate one detailed educational explanation for one ТЗНК question.

Do not change:
- id
- question
- passage
- options
- correctAnswer

Use the provided correctAnswer as the source of truth. Write the entire explanation in Ukrainian. Do not invent missing assumptions.

Use this exact structure:

Тут правильна відповідь — [LETTER]: “[correct option text]”.

1. Ключове поняття / ключові слова в умові

[Поясни, що саме перевіряє завдання. Виділи важливі умови, формулювання, обмеження або логічні зв’язки.]

2. Чому правильна відповідь — [LETTER]

[Поясни логіку розв’язання покроково. Покажи, як із тексту, умови, таблиці, послідовності або аргументу випливає правильний варіант.]

3. Чому не інші варіанти

А. [option A text] — [чому варіант неправильний]
Б. [option B text] — [чому варіант неправильний]
В. [option C text] — [чому варіант неправильний]
Г. [option D text] — [чому варіант неправильний]

If there are more options, explain all options.

4. Які правила треба знати, щоб не допустити тут помилок на іспиті

[Use exactly one of the two modes below.]

5. Як запам’ятати

[Дай коротку практичну підказку, алгоритм, логічне правило або нагадування про типову пастку.]

Коротко:

[Одне речення, яке підсумовує логіку правильної відповіді.]

Option letter rules:
- 0 = А
- 1 = Б
- 2 = В
- 3 = Г
- 4 = Д

## rulesSectionMode

Return one explicit mode:
- reusable_rules
- no_general_rule

### reusable_rules

Use reusable_rules only when the task supports a useful generalized strategy. Section 4 should contain 2–5 practical points, mention common traps where relevant, and explain how to self-check. It must help solve similar questions rather than repeat section 2.

Concrete strategies by task type:

Conditions and constraints:
- виписати всі обмеження окремо
- почати з найжорсткішої умови
- перевірити кожен варіант підстановкою
- відрізняти "може бути істинним" від "обов’язково істинне"
- не робити висновків, яких прямо не випливає з умови

Text inference:
- знайти фрагмент тексту, який підтверджує відповідь
- відрізняти висновок автора від власного припущення
- не обирати правдоподібний варіант без текстового підтвердження
- звертати увагу на слова "завжди", "лише", "усі", "деякі", "можливо"

Argument evaluation:
- відрізняти тезу від аргументу
- знаходити приховане припущення
- перевіряти, чи справді доказ підтримує висновок
- розпізнавати підміну причинності кореляцією
- не плутати приклад із доказом загального правила

Sequences and patterns:
- перевірити різниці між сусідніми числами
- перевірити множення, ділення, чергування правил
- перевірити окремо парні й непарні позиції
- не зупинятися на першій правдоподібній закономірності
- перевірити правило на всіх елементах

Quantitative reasoning:
- визначити, що саме порівнюється
- виписати одиниці вимірювання
- перевірити пропорції
- оцінити порядок величини
- виконати зворотну перевірку

Tables and data:
- перевірити заголовки рядків і стовпців
- звернути увагу на одиниці вимірювання
- відрізняти абсолютні значення від відсотків
- не робити висновку за одним показником, якщо потрібне порівняння
- перевірити, чи запитують значення, зміну або частку

Avoid vague advice such as "Читайте уважніше", "Будьте уважними", or "Перевіряйте відповідь".

### no_general_rule

Use no_general_rule when the logic is specific to the exact condition, a general rule would merely repeat section 2, or generalized advice would be vague or misleading.

In section 4 output exactly this sentence and nothing else:

${noGeneralRulePlaceholder}

Do not expand it. Add tag tznk_no_general_rule.

## Strict uncertainty handling

If the provided correctAnswer cannot be confidently justified from the available question or passage:
- do not invent missing assumptions
- set uncertain=true
- add needs_explanation_review
- add needs_explanation_style_v3
- briefly state the parsing, ambiguity, missing-context, or answer-derivation problem in notes

Possible reasons include incomplete condition, lost shared passage, malformed text, broken table formatting, ambiguous options, multiple plausible answers, or an answer that cannot be derived from supplied data.

Length guidance:
- simple question: 180–300 words
- medium question: 250–450 words
- complex passage, table, or constraint task: 350–600 words

If rulesSectionMode=no_general_rule, keep section 4 exactly equal to the placeholder and do not bloat other sections.

Required successful tags:
- explanation_improved
- explanation_style_v2
- explanation_style_v3
- tznk_exam_rules_section
- openai_tznk_explanation_batch_1

Return only structured JSON matching the requested schema. No markdown fences and no extra commentary.
`;
}

async function ensurePlaceholder(filePath: string, content: string): Promise<void> {
  if (!(await pathExists(filePath))) {
    await fs.writeFile(filePath, content, "utf8");
  }
}

async function main(): Promise<void> {
  await ensureTznkV3Dir();

  if (await pathExists(batchMetaPath)) {
    const existingMetadata = await readJson<TznkV3Metadata>(batchMetaPath);

    if (existingMetadata.batchId) {
      throw new Error(
        `ТЗНК style-v3 batch ${existingMetadata.batchId} already exists. Refusing to overwrite it.`
      );
    }
  }

  const questions = questionsSchema.parse(
    JSON.parse(await fs.readFile(tznkQuestionsPath, "utf8")) as unknown
  );
  const tznkQuestions = questions.filter((question) => question.subject === "tznk");
  const candidates = tznkQuestions
    .filter((question) => !(question.tags ?? []).includes("explanation_style_v3"))
    .map((question) =>
      candidateSchema.parse({
        id: question.id,
        subject: "tznk",
        type: question.type,
        question: question.question,
        passage: question.passage,
        options: question.options,
        correctAnswer: question.correctAnswer,
        currentExplanation: question.explanation,
        sourceType: question.sourceType,
        sourceUrl: question.sourceUrl,
        tags: question.tags
      })
    );

  await writeJson(inputPath, candidates);
  await fs.writeFile(promptPath, createPrompt(), "utf8");
  await ensurePlaceholder(outputPath, "[]\n");
  await ensurePlaceholder(batchInputPath, "");
  await ensurePlaceholder(batchRawOutputPath, "");
  await ensurePlaceholder(batchErrorsPath, "");
  await ensurePlaceholder(batchNormalizedOutputPath, "[]\n");
  await ensurePlaceholder(batchManualReviewPath, "[]\n");

  const now = new Date().toISOString();
  await writeMetadata({
    workflow: "tznk_explanation_style_v3_batch_1",
    status: "prepared",
    createdAt: now,
    endpoint: "/v1/chat/completions",
    model: getExplanationModel(),
    inputPath: "data/explanations/tznk-style-v3-batch-1/openai-explanation-batch-input.jsonl",
    totalScanned: tznkQuestions.length,
    candidateCount: candidates.length,
    outputsReceived: 0,
    normalizedCount: 0,
    rejectedCount: 0,
    uncertainCount: 0,
    reusableRulesCount: 0,
    noGeneralRuleCount: 0,
    appliedCount: 0,
    manualReviewIds: [],
    skippedIds: [],
    filesUpdated: [],
    validationResult: "not run",
    buildResult: "not run"
  });

  console.log(`Scanned ${tznkQuestions.length} ТЗНК questions.`);
  console.log(`Prepared ${candidates.length} ТЗНК style-v3 candidates.`);
  console.log("Public question files were not modified.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
