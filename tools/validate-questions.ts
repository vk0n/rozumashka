import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { questionsSchema, subjectsSchema } from "../src/lib/schemas";
import type { Question } from "../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "public", "data");
const questionsDir = path.join(dataDir, "questions");
const generatedDir = path.join(projectRoot, "data", "generated");
const thirdPartyProcessedDir = path.join(projectRoot, "data", "processed", "third-party");

interface QuestionFile {
  filePath: string;
  label: string;
}

async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

function printZodError(filePath: string, error: ZodError): void {
  console.error(`\n${path.relative(projectRoot, filePath)}`);
  for (const issue of error.issues) {
    const location = issue.path.length > 0 ? issue.path.join(".") : "root";
    console.error(`  - ${location}: ${issue.message}`);
  }
}

function normalizeForDuplicateCheck(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOptionForDuplicateCheck(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function validateDuplicateOptions(question: Question, filePath: string): void {
  const seenOptions = new Set<string>();

  for (const option of question.options) {
    const normalized = normalizeOptionForDuplicateCheck(option);

    if (seenOptions.has(normalized)) {
      console.error(`\n${path.relative(projectRoot, filePath)}`);
      console.error(`  - ${question.id}: duplicated option "${option}"`);
      process.exitCode = 1;
    }

    seenOptions.add(normalized);
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectQuestionFiles(): Promise<QuestionFile[]> {
  const publicFiles = (await fs.readdir(questionsDir))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const filePath = path.join(questionsDir, file);
      return { filePath, label: path.relative(projectRoot, filePath) };
    });

  const optionalDirs = [generatedDir, thirdPartyProcessedDir];
  const optionalFiles: QuestionFile[] = [];

  for (const directory of optionalDirs) {
    if (!(await pathExists(directory))) {
      continue;
    }

    optionalFiles.push(
      ...(await fs.readdir(directory))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) => {
          const filePath = path.join(directory, file);
          return { filePath, label: path.relative(projectRoot, filePath) };
        })
    );
  }

  return [...publicFiles, ...optionalFiles];
}

async function main() {
  const subjectFile = path.join(dataDir, "subjects.json");
  const subjects = subjectsSchema.parse(await readJson(subjectFile));
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const files = await collectQuestionFiles();

  const seenIds = new Map<string, string>();
  const seenQuestionTexts = new Map<string, { id: string; file: string; subject: string }>();
  const questionTextsBySubject = new Map<string, Array<{ id: string; file: string; text: string }>>();
  let questionCount = 0;

  for (const { filePath } of files) {
    try {
      const questions = questionsSchema.parse(await readJson(filePath));
      questionCount += questions.length;

      for (const question of questions) {
        if (seenIds.has(question.id)) {
          throw new Error(
            `Duplicate question id "${question.id}" in ${path.relative(projectRoot, filePath)} and ${seenIds.get(question.id)}`
          );
        }

        if (!subjectIds.has(question.subject)) {
          throw new Error(`Question "${question.id}" references unknown subject "${question.subject}"`);
        }

        validateDuplicateOptions(question, filePath);

        const normalizedQuestion = normalizeForDuplicateCheck(question.question);
        const duplicateQuestion = seenQuestionTexts.get(`${question.subject}:${normalizedQuestion}`);

        if (duplicateQuestion) {
          throw new Error(
            `Duplicate question text in "${question.id}" and "${duplicateQuestion.id}" (${duplicateQuestion.file})`
          );
        }

        const subjectQuestionTexts = questionTextsBySubject.get(question.subject) ?? [];

        for (const previous of subjectQuestionTexts) {
          const shorter = Math.min(previous.text.length, normalizedQuestion.length);
          const longer = Math.max(previous.text.length, normalizedQuestion.length);

          if (
            shorter >= 80 &&
            shorter / longer >= 0.9 &&
            tokenSimilarity(previous.text, normalizedQuestion) >= 0.94
          ) {
            throw new Error(
              `Near-duplicate question text in "${question.id}" and "${previous.id}" (${previous.file})`
            );
          }
        }

        seenQuestionTexts.set(`${question.subject}:${normalizedQuestion}`, {
          id: question.id,
          file: path.relative(projectRoot, filePath),
          subject: question.subject
        });
        subjectQuestionTexts.push({
          id: question.id,
          file: path.relative(projectRoot, filePath),
          text: normalizedQuestion
        });
        questionTextsBySubject.set(question.subject, subjectQuestionTexts);
        seenIds.set(question.id, path.relative(projectRoot, filePath));
      }
    } catch (error) {
      if (error instanceof ZodError) {
        printZodError(filePath, error);
      } else {
        console.error(`\n${path.relative(projectRoot, filePath)}`);
        console.error(`  - ${error instanceof Error ? error.message : String(error)}`);
      }

      process.exitCode = 1;
    }
  }

  if (process.exitCode) {
    console.error("\nQuestion validation failed.");
    return;
  }

  console.log(`Validated ${questionCount} questions across ${files.length} files.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
