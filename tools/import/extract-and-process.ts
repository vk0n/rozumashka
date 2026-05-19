import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question, SourceType } from "../../src/types";

type RawConfidence = "high" | "medium" | "low";
type InventorySourceType =
  | "official_demo"
  | "official_past_exam"
  | "official_collection"
  | "official_report"
  | "public_source";

interface RawQuestion {
  rawQuestionText: string;
  rawPassage?: string;
  rawOptions: string[];
  rawCorrectAnswer?: number | string | null;
  rawExplanation?: string | null;
  sourceUrl: string;
  sourceFile: string;
  pageNumber?: number | null;
  confidence: RawConfidence;
  extractionNotes: string;
  sourceType: InventorySourceType;
  subject: "tznk" | "english" | "management" | "psychology-sociology";
  sourceSlug: string;
  sourceYear?: string;
  originalNumber?: number;
  topic?: string;
  tags?: string[];
}

interface RawIndexEntry {
  localFilePath: string;
  sourceUrl: string;
  title: string;
  subject: string;
  sourceType: InventorySourceType;
  downloadedAt: string;
  containsQuestions: boolean;
  containsAnswers: boolean;
  containsExplanations: boolean;
  notes: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const subjects = ["tznk", "english", "management", "psychology-sociology"] as const;
const letters = ["А", "Б", "В", "Г"];
const englishLetters = ["A", "B", "C", "D"];

function toAbs(relativePath: string): string {
  return path.join(projectRoot, relativePath);
}

function pdfText(relativePath: string): string {
  return execFileSync("pdftotext", ["-layout", toAbs(relativePath), "-"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20
  }).replace(/\r/g, "");
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripPdfNoise(line: string): string {
  return line
    .replace(/\f/g, "")
    .replace(/©.*$/, "")
    .replace(/\(x\) – правильний варіант відповіді на завдання/g, "")
    .trim();
}

function cleanOption(value: string): string {
  return normalizeSpace(value.replace(/^\(?[xх]?\)?\s*/i, ""));
}

function parseMarkedSingleChoice(
  text: string,
  entry: RawIndexEntry,
  subject: RawQuestion["subject"],
  sourceSlug: string,
  sourceYear: string
): RawQuestion[] {
  const rawQuestions: RawQuestion[] = [];
  let pageNumber = 1;
  let current:
    | {
        number: number;
        questionLines: string[];
        options: string[];
        correctAnswer: number | null;
        currentOption: number | null;
        pageNumber: number;
      }
    | null = null;

  function finishCurrent() {
    if (!current) {
      return;
    }

    const options = current.options.map(cleanOption).filter(Boolean);
    const questionText = normalizeSpace(current.questionLines.join(" "));

    if (questionText && options.length >= 4) {
      rawQuestions.push({
        rawQuestionText: questionText,
        rawOptions: options.slice(0, 4),
        rawCorrectAnswer: current.correctAnswer,
        rawExplanation: null,
        sourceUrl: entry.sourceUrl,
        sourceFile: entry.localFilePath,
        pageNumber: current.pageNumber,
        confidence: current.correctAnswer === null ? "medium" : "high",
        extractionNotes:
          current.correctAnswer === null
            ? "Question/options parsed, but no marked correct answer was found."
            : "Parsed from `(x)` marked option in official PDF.",
        sourceType: entry.sourceType,
        subject,
        sourceSlug,
        sourceYear,
        originalNumber: current.number,
        tags: [entry.sourceType]
      });
    }

    current = null;
  }

  for (const rawLine of text.split("\n")) {
    if (rawLine.includes("\f")) {
      pageNumber += 1;
    }

    const line = stripPdfNoise(rawLine);

    if (
      !line ||
      /^\d+$/.test(line) ||
      /^ЄФВВ/.test(line) ||
      line === "Управління та адміністрування" ||
      line === "Психологія та соціологія" ||
      /^Завдання 1/.test(line) ||
      /^правильний/.test(line) ||
      /^відповіді на завдання/.test(line)
    ) {
      continue;
    }

    const questionMatch = line.match(/^(\d{1,3})\.\s+(.*)$/);

    if (questionMatch) {
      finishCurrent();
      current = {
        number: Number(questionMatch[1]),
        questionLines: [questionMatch[2]],
        options: [],
        correctAnswer: null,
        currentOption: null,
        pageNumber
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const optionMatch = line.match(/^\((x\s*)?\)\s*(.*)$/i);

    if (optionMatch) {
      current.options.push(optionMatch[2]);
      current.currentOption = current.options.length - 1;

      if (optionMatch[1]) {
        current.correctAnswer = current.currentOption;
      }

      continue;
    }

    if (current.currentOption !== null && current.options.length > 0) {
      current.options[current.currentOption] = `${current.options[current.currentOption]} ${line}`;
    } else {
      current.questionLines.push(line);
    }
  }

  finishCurrent();
  return rawQuestions;
}

function parseAnswerKey(text: string, alphabet: string[]): Map<number, number> {
  const key = new Map<number, number>();

  for (const rawLine of text.split("\n")) {
    const line = stripPdfNoise(rawLine);
    const match = line.match(/^\s*(\d{1,3})\.?\s+([A-DАБВГ])\s*$/);

    if (!match) {
      continue;
    }

    const optionIndex = alphabet.indexOf(match[2]);

    if (optionIndex >= 0) {
      key.set(Number(match[1]), optionIndex);
    }
  }

  return key;
}

function parseOptionsFromBlock(block: string, alphabet: string[]): { questionText: string; options: string[] } {
  const questionLines: string[] = [];
  const options: string[] = [];
  let currentOption: number | null = null;

  for (const rawLine of block.split("\n")) {
    const line = stripPdfNoise(rawLine);

    if (!line || /^\d+$/.test(line)) {
      continue;
    }

    const optionPattern = new RegExp(`^([${alphabet.join("")}])\\s+(.+)$`);
    const optionMatch = line.match(optionPattern);

    if (optionMatch) {
      options.push(optionMatch[2]);
      currentOption = options.length - 1;
      continue;
    }

    if (currentOption !== null) {
      options[currentOption] = `${options[currentOption]} ${line}`;
    } else {
      questionLines.push(line);
    }
  }

  return {
    questionText: normalizeSpace(questionLines.join(" ")),
    options: options.map(cleanOption).filter(Boolean)
  };
}

function splitNumberedBlocks(section: string, min: number, max: number): Array<{ number: number; block: string }> {
  const matches = [...section.matchAll(/(?:^|\n)\s*(\d{1,3})\.\s+/g)]
    .map((match) => ({
      number: Number(match[1]),
      index: match.index ?? 0
    }))
    .filter((match) => match.number >= min && match.number <= max);

  return matches.map((match, index) => {
    const next = matches[index + 1];
    return {
      number: match.number,
      block: section.slice(match.index, next?.index ?? section.length)
    };
  });
}

function extractBetween(text: string, start: string, end: string): string | undefined {
  const startIndex = text.indexOf(start);

  if (startIndex < 0) {
    return undefined;
  }

  const endIndex = text.indexOf(end, startIndex + start.length);
  return text.slice(startIndex, endIndex < 0 ? undefined : endIndex).trim();
}

function parseTznk(entry: RawIndexEntry): RawQuestion[] {
  const text = pdfText(entry.localFilePath);
  const firstSection = text.slice(0, text.indexOf("Обґрунтування правильної відповіді"));
  const answerKey = parseAnswerKey(text, letters);
  const passage5to12 = extractBetween(firstSection, "Текст А", "\n5.");
  const situation19to21 = extractBetween(firstSection, "Ситуація № 1", "\n19.");
  const rawQuestions: RawQuestion[] = [];

  for (const { number, block } of splitNumberedBlocks(firstSection, 5, 21)) {
    if (number > 21) {
      continue;
    }

    const { questionText, options } = parseOptionsFromBlock(block, letters);

    if (!questionText || options.length < 4) {
      continue;
    }

    const rawPassage = number >= 5 && number <= 12 ? passage5to12 : number >= 19 ? situation19to21 : undefined;

    rawQuestions.push({
      rawQuestionText: questionText.replace(/^\d{1,3}\.\s*/, ""),
      rawPassage: rawPassage ? normalizeSpace(rawPassage) : undefined,
      rawOptions: options.slice(0, 4),
      rawCorrectAnswer: answerKey.get(number) ?? null,
      rawExplanation: null,
      sourceUrl: entry.sourceUrl,
      sourceFile: entry.localFilePath,
      pageNumber: null,
      confidence: answerKey.has(number) ? "medium" : "low",
      extractionNotes:
        number >= 5 && number <= 12
          ? "Parsed text-passage question from official commented TЗНК demo; explanation not automatically segmented."
          : "Parsed single-choice TЗНК question from official commented demo; explanation not automatically segmented.",
      sourceType: entry.sourceType,
      subject: "tznk",
      sourceSlug: "tznk-demo-2024",
      sourceYear: "2024",
      originalNumber: number,
      topic: number <= 12 ? "Робота з текстом" : number <= 18 ? "Критичне мислення" : "Логічні задачі",
      tags: ["official_demo"]
    });
  }

  return rawQuestions;
}

function parseEnglishTask2(entry: RawIndexEntry): RawQuestion[] {
  const text = pdfText(entry.localFilePath);
  const answerKey = parseAnswerKey(text, englishLetters);
  const task2 = extractBetween(text, "Task 2", "Task 3");

  if (!task2) {
    return [];
  }

  const lines = task2.split("\n");
  const leftLines: string[] = [];
  const rightLines: string[] = [];

  for (const line of lines) {
    const left = line.slice(0, 54).trim();
    const right = line.slice(54).trim();

    if (left && !/^Task 2|Read the text|Confirm your choice|A Brief History/.test(left)) {
      leftLines.push(left);
    }

    if (right) {
      rightLines.push(right);
    }
  }

  const passage = normalizeSpace(leftLines.join(" "));
  const rawQuestions: RawQuestion[] = [];
  let current:
    | {
        number: number;
        questionLines: string[];
        options: string[];
        currentOption: number | null;
      }
    | null = null;

  function finishCurrent() {
    if (!current) {
      return;
    }

    const options = current.options.map(cleanOption).filter(Boolean);
    const questionText = normalizeSpace(current.questionLines.join(" "));

    if (questionText && options.length >= 4) {
      rawQuestions.push({
        rawQuestionText: questionText,
        rawPassage: passage,
        rawOptions: options.slice(0, 4),
        rawCorrectAnswer: answerKey.get(current.number) ?? null,
        rawExplanation: null,
        sourceUrl: entry.sourceUrl,
        sourceFile: entry.localFilePath,
        pageNumber: null,
        confidence: answerKey.has(current.number) ? "medium" : "low",
        extractionNotes: "Parsed English reading single-choice task from two-column PDF text.",
        sourceType: entry.sourceType,
        subject: "english",
        sourceSlug: "english-demo-2023",
        sourceYear: "2023",
        originalNumber: current.number,
        topic: "Reading",
        tags: ["official_demo"]
      });
    }

    current = null;
  }

  for (const rawLine of rightLines) {
    const line = stripPdfNoise(rawLine);

    if (!line || /^Confirm your choice/.test(line)) {
      continue;
    }

    const questionMatch = line.match(/^(\d{1,2})\s+(.*)$/);

    if (questionMatch) {
      finishCurrent();
      current = {
        number: Number(questionMatch[1]),
        questionLines: [questionMatch[2]],
        options: [],
        currentOption: null
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const optionMatch = line.match(/^([A-D])\s+(.+)$/);

    if (optionMatch) {
      current.options.push(optionMatch[2]);
      current.currentOption = current.options.length - 1;
      continue;
    }

    if (current.currentOption === null) {
      current.questionLines.push(line);
    } else {
      current.options[current.currentOption] = `${current.options[current.currentOption]} ${line}`;
    }
  }

  finishCurrent();
  return rawQuestions;
}

function processedSourceType(rawType: InventorySourceType): SourceType {
  return rawType === "official_demo" ? "official_demo" : "public_source";
}

function difficultyFor(raw: RawQuestion): Question["difficulty"] {
  if (raw.subject === "english" && raw.topic === "Reading") {
    return "medium";
  }

  if (raw.subject === "tznk" && raw.topic === "Логічні задачі") {
    return "hard";
  }

  return "medium";
}

function normalizeQuestion(raw: RawQuestion, sequence: number): Question {
  const sourceType = processedSourceType(raw.sourceType);
  const tags = new Set(raw.tags ?? []);
  tags.add(raw.sourceSlug);

  if (raw.sourceType !== "official_demo") {
    tags.add(raw.sourceType);
  }

  if (raw.confidence !== "high") {
    tags.add("needs_manual_review");
  }

  if (raw.rawCorrectAnswer === null || raw.rawCorrectAnswer === undefined) {
    tags.add("needs_answer_review");
  }

  const prefixBySubject: Record<RawQuestion["subject"], string> = {
    tznk: "tznk",
    english: "english",
    management: "management",
    "psychology-sociology": "psych-soc"
  };
  const answerIndex =
    typeof raw.rawCorrectAnswer === "number" && raw.rawCorrectAnswer >= 0
      ? raw.rawCorrectAnswer
      : 0;

  return {
    id: `${prefixBySubject[raw.subject]}-${raw.sourceSlug}-${String(sequence).padStart(3, "0")}`,
    subject: raw.subject,
    type: raw.rawPassage ? "passage_single_choice" : "single_choice",
    topic:
      raw.topic ??
      (raw.subject === "management"
        ? "Управління та адміністрування"
        : raw.subject === "psychology-sociology"
          ? "Психологія та соціологія"
          : raw.subject === "english"
            ? "Reading"
            : "ТЗНК"),
    difficulty: difficultyFor(raw),
    sourceType,
    sourceUrl: raw.sourceUrl,
    reviewed: false,
    question: raw.rawQuestionText,
    passage: raw.rawPassage,
    options: raw.rawOptions,
    correctAnswer: Math.min(answerIndex, raw.rawOptions.length - 1),
    explanation:
      raw.rawCorrectAnswer === null || raw.rawCorrectAnswer === undefined
        ? "Потрібна ручна перевірка відповіді."
        : raw.rawExplanation || "Правильний варіант позначено в офіційному джерелі. Пояснення потребує ручного рецензування.",
    tags: [...tags]
  };
}

function uniqueByQuestion(rawQuestions: RawQuestion[]): RawQuestion[] {
  const seen = new Set<string>();
  const unique: RawQuestion[] = [];

  for (const raw of rawQuestions) {
    const key = `${raw.subject}:${normalizeSpace(raw.rawQuestionText).toLowerCase()}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(raw);
  }

  return unique;
}

async function writeJson(relativePath: string, value: unknown) {
  const outputPath = toAbs(relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const rawIndex = JSON.parse(await fs.readFile(toAbs("data/raw/raw-index.json"), "utf8")) as RawIndexEntry[];
  const byPath = new Map(rawIndex.map((entry) => [entry.localFilePath, entry]));
  const rawBySubject: Record<(typeof subjects)[number], RawQuestion[]> = {
    tznk: [],
    english: [],
    management: [],
    "psychology-sociology": []
  };

  for (const config of [
    {
      path: "data/raw/management/management-yefvv-2024.pdf",
      subject: "management" as const,
      sourceSlug: "yefvv-2024",
      sourceYear: "2024"
    },
    {
      path: "data/raw/management/management-yefvv-2023-demo.pdf",
      subject: "management" as const,
      sourceSlug: "demo-2023",
      sourceYear: "2023"
    },
    {
      path: "data/raw/psychology-sociology/psychology-sociology-yefvv-2024.pdf",
      subject: "psychology-sociology" as const,
      sourceSlug: "yefvv-2024",
      sourceYear: "2024"
    },
    {
      path: "data/raw/psychology-sociology/psychology-sociology-yefvv-2023-demo.pdf",
      subject: "psychology-sociology" as const,
      sourceSlug: "demo-2023",
      sourceYear: "2023"
    }
  ]) {
    const entry = byPath.get(config.path);

    if (!entry) {
      throw new Error(`Missing raw-index entry for ${config.path}`);
    }

    rawBySubject[config.subject].push(
      ...parseMarkedSingleChoice(
        pdfText(config.path),
        entry,
        config.subject,
        config.sourceSlug,
        config.sourceYear
      )
    );
  }

  const tznkEntry = byPath.get("data/raw/tznk/tznk-2024-demo-with-comments.pdf");

  if (tznkEntry) {
    rawBySubject.tznk.push(...parseTznk(tznkEntry));
  }

  const englishEntry = byPath.get("data/raw/english/english-2023-demo.pdf");

  if (englishEntry) {
    rawBySubject.english.push(...parseEnglishTask2(englishEntry));
  }

  for (const subject of subjects) {
    rawBySubject[subject] = uniqueByQuestion(rawBySubject[subject]);
    await writeJson(`data/extracted/${subject}.raw.json`, rawBySubject[subject]);

    const counters = new Map<string, number>();
    const processed = rawBySubject[subject].map((raw) => {
      const count = (counters.get(raw.sourceSlug) ?? 0) + 1;
      counters.set(raw.sourceSlug, count);
      return normalizeQuestion(raw, count);
    });

    await writeJson(`data/processed/${subject}.imported.json`, processed);
  }

  const issues = `# Extraction Issues

Generated on ${new Date().toISOString()}.

| File path | Source URL | Reason parsing failed or was partial | Suggested manual action |
| --- | --- | --- | --- |
| data/raw/tznk/tznk-2023-demo.pdf | ${byPath.get("data/raw/tznk/tznk-2023-demo.pdf")?.sourceUrl ?? ""} | Not parsed in this pass because the commented 2024 demo was preferred for ТЗНК import and duplicate/overlap review is needed before importing another demo. | Extend the TЗНК parser to compare against already imported text and import non-duplicates. |
| data/raw/tznk/tznk-2024-demo-with-comments.pdf | ${tznkEntry?.sourceUrl ?? ""} | TЗНК cloze subquestions 1-10 use multi-gap/multi-column formatting; tasks 22-27 include fraction/table/diagram-dependent layout that the current schema cannot represent safely. | Manually normalize cloze questions or add schema support for grouped cloze/table/image prompts. |
| data/raw/english/english-2023-demo.pdf | ${englishEntry?.sourceUrl ?? ""} | Task 1 is a matching task unsupported by the current schema. Tasks 12-30 are cloze/table layouts and were not imported in this conservative pass. | Add schema support for matching/cloze groups or manually normalize each gap as a single-choice question. |
| data/raw/english/english-2021-shift-1.pdf | ${byPath.get("data/raw/english/english-2021-shift-1.pdf")?.sourceUrl ?? ""} | PDF text extraction contains mojibake/encoding artifacts in the instruction and task text. | Use OCR or a different PDF text extraction pipeline before normalization. |
| data/raw/english/english-2020-shift-1.pdf | ${byPath.get("data/raw/english/english-2020-shift-1.pdf")?.sourceUrl ?? ""} | Not parsed in this pass; older English past papers need a dedicated parser for matching/cloze sections plus answer-key alignment. | Implement an English past-paper parser and cross-check against answer keys. |
| data/raw/english/english-2019-shift-1.pdf | ${byPath.get("data/raw/english/english-2019-shift-1.pdf")?.sourceUrl ?? ""} | Not parsed in this pass; older English past papers need a dedicated parser for matching/cloze sections plus answer-key alignment. | Implement an English past-paper parser and cross-check against answer keys. |
`;

  await fs.writeFile(toAbs("data/extracted/extraction-issues.md"), issues);

  const totals = subjects
    .map((subject) => `${subject}: ${rawBySubject[subject].length}`)
    .join(", ");
  console.log(`Extracted and processed raw questions: ${totals}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
