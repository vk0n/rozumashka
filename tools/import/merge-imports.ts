import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const subjects = ["tznk", "english", "management", "psychology-sociology"] as const;

function toAbs(relativePath: string): string {
  return path.join(projectRoot, relativePath);
}

function normalizeQuestionText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sortQuestions(left: Question, right: Question): number {
  return (
    left.subject.localeCompare(right.subject, "uk") ||
    left.sourceType.localeCompare(right.sourceType, "uk") ||
    left.topic.localeCompare(right.topic, "uk") ||
    left.id.localeCompare(right.id, "uk")
  );
}

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(toAbs(relativePath), "utf8")) as T;
}

async function main() {
  const summary: Array<{ subject: string; existing: number; imported: number; added: number; skipped: number }> = [];

  for (const subject of subjects) {
    const publicPath = `public/data/questions/${subject}.json`;
    const importedPath = `data/processed/${subject}.imported.json`;
    const existing = await readJson<Question[]>(publicPath);
    const imported = await readJson<Question[]>(importedPath);
    const seenIds = new Set(existing.map((question) => question.id));
    const seenTexts = new Set(existing.map((question) => normalizeQuestionText(question.question)));
    const merged = [...existing];
    let added = 0;
    let skipped = 0;

    for (const question of imported) {
      const normalizedText = normalizeQuestionText(question.question);

      if (seenIds.has(question.id) || seenTexts.has(normalizedText)) {
        skipped += 1;
        continue;
      }

      seenIds.add(question.id);
      seenTexts.add(normalizedText);
      merged.push(question);
      added += 1;
    }

    merged.sort(sortQuestions);
    await fs.writeFile(toAbs(publicPath), `${JSON.stringify(merged, null, 2)}\n`);
    summary.push({ subject, existing: existing.length, imported: imported.length, added, skipped });
  }

  for (const item of summary) {
    console.log(
      `${item.subject}: existing=${item.existing}, imported=${item.imported}, added=${item.added}, skipped=${item.skipped}`
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
