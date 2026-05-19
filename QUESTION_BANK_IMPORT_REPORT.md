# Question Bank Import Report

Generated on 2026-05-18T17:40:54.568Z.

## Sources Used

- Official Testportal ЄФВВ 2024 Управління та адміністрування collection.
- Official Testportal ЄФВВ 2024 Психологія та соціологія collection.
- Official Testportal ЄВІ 2023 English demo, reading single-choice section.
- Official Testportal ТЗНК commented demo, supported single-choice sections.

Third-party/public mirrors were recorded in `data/sources/source-inventory.md` but not imported.

## Added Per Subject

- ТЗНК: 17
- Англійська мова: 5
- Управління та адміністрування: 140
- Психологія та соціологія: 140

Final public question-bank totals after merge:

- ТЗНК: 25
- Англійська мова: 13
- Управління та адміністрування: 148
- Психологія та соціологія: 148

## Added By Source Category

- official_demo: 22
- official_collection: 280

## Manual Review

- Needs manual review after review pass: 0
- Needs answer review: 0

Reviewed flagged imports:

- ТЗНК: 17 reviewed against the official commented demo; contaminated option tails were fixed, passage text was cleaned for the text/situation tasks, and concise explanations were added from the official rationale.
- Англійська мова: 5 reviewed against the official demo answer key; the reading passage was cleaned and question-answer explanations were added from the passage.
- ЄФВВ subject collections: no `needs_manual_review` / `needs_answer_review` flags were present. Their wording and terminology were left unchanged; explanations now clearly note that the official source marks the answer but does not provide an explanation.

The reviewed ТЗНК/English imports are marked `reviewed=true` with `reviewed_official_source`. ЄФВВ collection imports remain `reviewed=false` with `source_has_no_explanation`.

## Known Limitations

- English matching tasks and cloze-table tasks are logged but not imported.
- Some ТЗНК cloze, fraction, and diagram/table tasks are logged but not imported.
- Older English past papers were downloaded but not imported because several require OCR/encoding cleanup and answer-key alignment.
- Official collection/past-exam source categories are represented as `sourceType: "public_source"` plus tags such as `official_collection`, because the app schema intentionally keeps the existing sourceType enum.

## How To Continue

- Extend `tools/import/extract-and-process.ts` with a parser for a specific source layout.
- Re-run `npx tsx tools/import/extract-and-process.ts`.
- Re-run `npx tsx tools/import/merge-imports.ts`.
- Validate with `npm run validate:questions`.
- Build with `npm run build`.

## Commands Used

```bash
npx tsx tools/import/download-sources.ts
npx tsx tools/import/extract-and-process.ts
npx tsx tools/import/create-import-report.ts
npx tsx tools/import/merge-imports.ts
npm run import:review
npm run validate:questions
npm run build
```
