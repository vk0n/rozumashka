# Import Validation Report

Generated on 2026-05-18T17:40:54.567Z.

## Summary

- Total sources discovered: 30
- Total files downloaded: 13
- Total questions extracted: 302
- Total questions normalized: 302
- Questions with answers: 302
- Questions without answers: 0
- Questions needing manual review: 0 after the flagged-question review pass

## Questions By Subject

- ТЗНК: 17
- Англійська мова: 5
- Управління та адміністрування: 140
- Психологія та соціологія: 140

## Questions By Source Type

- official_demo: 22
- official_collection: 280

## Validation Errors

- Processed JSON shape check: no structural errors found during extraction.
- Final merged app validation: passed with `Validated 334 questions across 4 files.`

## Review Pass

- Reviewed flagged imported questions: 22
- ТЗНК reviewed/fixed: 17
- Англійська мова reviewed/fixed: 5
- `needs_manual_review`, `needs_answer_review`, and `low_confidence` tags remaining in public question files: 0
- ЄФВВ official collection questions remain `reviewed=false` where the source provides the correct answer but no explanation; these now carry `source_has_no_explanation`.

## Conservative Import Notes

- Current schema supports `single_choice` and `passage_single_choice`, so matching tasks and grouped cloze tasks were not force-fit.
- Official ЄФВВ 2024 collections were imported with high confidence because correct answers are marked inline.
- ТЗНК and English imports are intentionally partial because several official PDFs use multi-column, grouped, or diagram-dependent layouts.

## Next Recommended Actions

- Add schema support for matching and grouped cloze tasks if full English ЄВІ coverage is required.
- Add optional image/table prompt support before importing diagram-dependent ТЗНК tasks.
- Use OCR or a specialized PDF extractor for older English ЄВІ PDFs with encoding artifacts.
