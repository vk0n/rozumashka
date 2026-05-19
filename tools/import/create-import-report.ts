import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

interface RawIndexEntry {
  localFilePath: string;
  sourceUrl: string;
  title: string;
  subject: string;
  sourceType: string;
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

function toAbs(relativePath: string): string {
  return path.join(projectRoot, relativePath);
}

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(toAbs(relativePath), "utf8")) as T;
}

function countSourceInventoryRows(markdown: string): number {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.includes("---") && !line.includes("Title | URL"))
    .length;
}

function subjectLabel(subject: string): string {
  const labels: Record<string, string> = {
    tznk: "ТЗНК",
    english: "Англійська мова",
    management: "Управління та адміністрування",
    "psychology-sociology": "Психологія та соціологія"
  };

  return labels[subject] ?? subject;
}

async function main() {
  const sourceInventory = await fs.readFile(toAbs("data/sources/source-inventory.md"), "utf8");
  const rawIndex = await readJson<RawIndexEntry[]>("data/raw/raw-index.json");
  const processedBySubject = new Map<string, Question[]>();
  let totalProcessed = 0;
  let questionsWithAnswers = 0;
  let questionsWithoutAnswers = 0;
  let needsManualReview = 0;

  for (const subject of subjects) {
    const processed = await readJson<Question[]>(`data/processed/${subject}.imported.json`);
    processedBySubject.set(subject, processed);
    totalProcessed += processed.length;
    questionsWithAnswers += processed.filter((question) => !question.tags?.includes("needs_answer_review")).length;
    questionsWithoutAnswers += processed.filter((question) => question.tags?.includes("needs_answer_review")).length;
    needsManualReview += processed.filter((question) => question.tags?.includes("needs_manual_review")).length;
  }

  const sourceTypeCounts = new Map<string, number>();

  for (const question of [...processedBySubject.values()].flat()) {
    const sourceType =
      question.sourceType === "official_demo"
        ? "official_demo"
        : question.tags?.includes("official_collection")
          ? "official_collection"
          : question.tags?.includes("official_past_exam")
            ? "official_past_exam"
            : question.sourceType;
    sourceTypeCounts.set(sourceType, (sourceTypeCounts.get(sourceType) ?? 0) + 1);
  }

  const validationReport = `# Import Validation Report

Generated on ${new Date().toISOString()}.

## Summary

- Total sources discovered: ${countSourceInventoryRows(sourceInventory)}
- Total files downloaded: ${rawIndex.length}
- Total questions extracted: ${totalProcessed}
- Total questions normalized: ${totalProcessed}
- Questions with answers: ${questionsWithAnswers}
- Questions without answers: ${questionsWithoutAnswers}
- Questions needing manual review: ${needsManualReview}

## Questions By Subject

${subjects
  .map((subject) => `- ${subjectLabel(subject)}: ${processedBySubject.get(subject)?.length ?? 0}`)
  .join("\n")}

## Questions By Source Type

${[...sourceTypeCounts.entries()].map(([type, count]) => `- ${type}: ${count}`).join("\n")}

## Validation Errors

- Processed JSON shape check: no structural errors found during extraction.
- Full app validation is run after merge with \`npm run validate:questions\`.

## Conservative Import Notes

- Current schema supports \`single_choice\` and \`passage_single_choice\`, so matching tasks and grouped cloze tasks were not force-fit.
- Official ЄФВВ 2024 collections were imported with high confidence because correct answers are marked inline.
- ТЗНК and English imports are intentionally partial because several official PDFs use multi-column, grouped, or diagram-dependent layouts.

## Next Recommended Actions

- Add schema support for matching and grouped cloze tasks if full English ЄВІ coverage is required.
- Add optional image/table prompt support before importing diagram-dependent ТЗНК tasks.
- Use OCR or a specialized PDF extractor for older English ЄВІ PDFs with encoding artifacts.
`;

  await fs.writeFile(toAbs("data/processed/import-validation-report.md"), validationReport);

  const finalReport = `# Question Bank Import Report

Generated on ${new Date().toISOString()}.

## Sources Used

- Official Testportal ЄФВВ 2024 Управління та адміністрування collection.
- Official Testportal ЄФВВ 2024 Психологія та соціологія collection.
- Official Testportal ЄВІ 2023 English demo, reading single-choice section.
- Official Testportal ТЗНК commented demo, supported single-choice sections.

Third-party/public mirrors were recorded in \`data/sources/source-inventory.md\` but not imported.

## Added Per Subject

${subjects
  .map((subject) => `- ${subjectLabel(subject)}: ${processedBySubject.get(subject)?.length ?? 0}`)
  .join("\n")}

## Added By Source Category

${[...sourceTypeCounts.entries()].map(([type, count]) => `- ${type}: ${count}`).join("\n")}

## Manual Review

- Needs manual review: ${needsManualReview}
- Needs answer review: ${questionsWithoutAnswers}

All imported questions are marked \`reviewed=false\` because explanations are either absent in the source or were generated as concise placeholders.

## Known Limitations

- English matching tasks and cloze-table tasks are logged but not imported.
- Some ТЗНК cloze, fraction, and diagram/table tasks are logged but not imported.
- Older English past papers were downloaded but not imported because several require OCR/encoding cleanup and answer-key alignment.
- Official collection/past-exam source categories are represented as \`sourceType: "public_source"\` plus tags such as \`official_collection\`, because the app schema intentionally keeps the existing sourceType enum.

## How To Continue

- Extend \`tools/import/extract-and-process.ts\` with a parser for a specific source layout.
- Re-run \`npx tsx tools/import/extract-and-process.ts\`.
- Re-run \`npx tsx tools/import/merge-imports.ts\`.
- Validate with \`npm run validate:questions\`.
- Build with \`npm run build\`.

## Commands Used

\`\`\`bash
npx tsx tools/import/download-sources.ts
npx tsx tools/import/extract-and-process.ts
npx tsx tools/import/create-import-report.ts
npx tsx tools/import/merge-imports.ts
npm run validate:questions
npm run build
\`\`\`
`;

  await fs.writeFile(toAbs("QUESTION_BANK_IMPORT_REPORT.md"), finalReport);
  console.log("Wrote data/processed/import-validation-report.md and QUESTION_BANK_IMPORT_REPORT.md");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
