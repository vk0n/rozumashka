import { promises as fs } from "node:fs";
import { questionsSchema } from "../../src/lib/schemas";
import {
  batchErrorsPath,
  batchInputPath,
  batchMetaPath,
  batchNormalizedOutputPath,
  batchRawOutputPath,
  candidateSchema,
  englishQuestionsPath,
  ensureEnglishV3Dir,
  getExplanationModel,
  inputPath,
  outputPath,
  pathExists,
  promptPath,
  readJson,
  writeJson,
  writeMetadata,
  type EnglishV3Metadata
} from "./english-style-v3-common";

function createPrompt(): string {
  return `# English Explanation Style V3 Prompt

Generate one detailed educational explanation for one English ЄВІ preparation question.

Do not change:
- id
- question
- passage
- options
- correctAnswer

Use the provided correctAnswer as the source of truth.

The question, passage, and answer options remain in English.
Write the entire explanation in Ukrainian. Short English words, phrases, and sentence fragments may be quoted when useful.

Use this exact structure:

Тут правильна відповідь — [LETTER]: “[correct option text]”.

1. Ключова ідея

[Українською поясни, що саме перевіряє питання: граматичне правило, значення слова в контексті, головну думку тексту, деталь, висновок, reference word, text coherence тощо.]

2. Чому правильна відповідь — [LETTER]

[Українською поясни, чому правильний варіант підходить до речення, контексту, тексту або граматичного правила.]

3. Чому не інші варіанти

A. [option A text] — [українською поясни, чому варіант неправильний]
B. [option B text] — [українською поясни, чому варіант неправильний]
C. [option C text] — [українською поясни, чому варіант неправильний]
D. [option D text] — [українською поясни, чому варіант неправильний]

If there are more options, explain all options.

4. Які правила треба знати, щоб не допустити тут помилок на іспиті

[Дай практичний перелік правил, навичок або стратегій, які допомагають відповідати на аналогічні завдання. Не повторюй попередній блок дослівно. Поясни узагальнене правило та типові пастки. Зазвичай достатньо 2–5 конкретних пунктів.]

5. Як запам’ятати

[Дай коротку мнемоніку, формулу, асоціацію або просту підказку.]

Коротко:

[Одне речення українською, яке підсумовує, чому відповідь правильна.]

Option letter rules:
- 0 = A
- 1 = B
- 2 = C
- 3 = D
- 4 = E

## Practical exam-rules section

The section "4. Які правила треба знати, щоб не допустити тут помилок на іспиті" must be practical and reusable.

It should answer:
- Яке правило треба повторити?
- На які слова, конструкції або сигнали в тексті звернути увагу?
- Які типові пастки трапляються у схожих завданнях?
- Як швидко перевірити себе перед вибором відповіді?

Avoid generic advice such as "Читайте уважніше" or "Звертайте увагу на контекст".

For grammar:
- explain the grammar rule
- mention markers and context clues
- mention typical distractors
- include a quick self-check method

For vocabulary:
- explain meaning in context
- mention collocations
- mention confusing synonyms
- mention word families or false friends where useful

For reading comprehension:
- explain how to find textual evidence
- distinguish main idea from details
- identify paraphrases
- warn against plausible but unsupported options

For cloze tests:
- check grammar and meaning together
- inspect words before and after the blank
- check collocations
- check coherence across the sentence or paragraph

For text coherence or sentence insertion:
- track pronouns and reference words
- check connectors
- check chronology
- check topic continuity
- look for repeated ideas and paraphrases

Length guidance:
- simple vocabulary or grammar question: 180–300 words
- medium question: 250–400 words
- reading comprehension, cloze, or coherence question: 300–500 words

Avoid unnecessary repetition. Prefer useful exam strategies over excessive theory.

Return only structured JSON matching the requested schema. No markdown fences and no extra commentary.

Required successful tags:
- explanation_improved
- explanation_style_v2
- explanation_style_v3
- english_exam_rules_section
- openai_english_explanation_batch_1

If the answer cannot be confidently justified:
- set uncertain=true
- add needs_explanation_review
- add needs_explanation_style_v3
`;
}

async function ensurePlaceholder(filePath: string, content: string): Promise<void> {
  if (!(await pathExists(filePath))) {
    await fs.writeFile(filePath, content, "utf8");
  }
}

async function main(): Promise<void> {
  await ensureEnglishV3Dir();

  if (await pathExists(batchMetaPath)) {
    const existingMetadata = await readJson<EnglishV3Metadata>(batchMetaPath);

    if (existingMetadata.batchId) {
      throw new Error(
        `English style-v3 batch ${existingMetadata.batchId} already exists. Refusing to overwrite its prepared files.`
      );
    }
  }

  const questions = questionsSchema.parse(
    JSON.parse(await fs.readFile(englishQuestionsPath, "utf8")) as unknown
  );
  const englishQuestions = questions.filter((question) => question.subject === "english");
  const candidates = englishQuestions
    .filter((question) => !(question.tags ?? []).includes("explanation_style_v3"))
    .map((question) =>
      candidateSchema.parse({
        id: question.id,
        subject: "english",
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

  const now = new Date().toISOString();
  await writeMetadata({
    workflow: "english_explanation_style_v3_batch_1",
    status: "prepared",
    createdAt: now,
    endpoint: "/v1/chat/completions",
    model: getExplanationModel(),
    inputPath: "data/explanations/english-style-v3-batch-1/openai-explanation-batch-input.jsonl",
    totalScanned: englishQuestions.length,
    candidateCount: candidates.length,
    outputsReceived: 0,
    normalizedCount: 0,
    rejectedCount: 0,
    uncertainCount: 0,
    appliedCount: 0,
    skippedIds: [],
    filesUpdated: [],
    validationResult: "not run",
    buildResult: "not run"
  });

  console.log(`Scanned ${englishQuestions.length} English questions.`);
  console.log(`Prepared ${candidates.length} English style-v3 candidates.`);
  console.log("Public question files were not modified.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
