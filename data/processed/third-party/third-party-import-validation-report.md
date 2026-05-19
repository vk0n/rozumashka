# Third-Party Import Validation Report

Generated on 2026-05-19.

## Summary

- Total third-party sources inspected: 4 ZNO Освіта all-task sections plus previously inventoried sources
- Total files downloaded: 118
- Total questions extracted: 1751
- Total questions normalized: 781
- Total questions skipped: 1000
- Questions by subject:
- ТЗНК: 352
- Англійська мова: 355
- Управління та адміністрування: 31
- Психологія та соціологія: 43
- Questions with answers: 781
- Questions without answers: 0
- Questions needing manual review: 0
- Duplicates skipped: 1000
- Validation errors: 0
- Validation result: passed `npm run validate:questions` (`Validated 1335 questions across 10 files.`)
- Build result: passed `npm run build`

## Skipped Reasons

- unsupported or incomplete ZNO Освіта task block: 225
- duplicate within ZNO Освіта candidate batch: 510
- exact duplicate question text against existing official/generated/third-party bank: 261
- near-duplicate question text against existing official/generated/third-party bank: 4

## Notes

- ZNO Освіта pages contain previous ЄВІ/ЄФВВ tasks and answer metadata. They are imported as `sourceType: "public_source"` with tags `zno_osvita` and `official_past_exam_mirror`.
- These questions are kept separate in `data/processed/third-party/*.json` and are not merged into `public/data/questions/*`.
- All normalized ZNO Освіта questions are `reviewed=false` until a manual editorial review is completed.

## Next Recommended Actions

- Review imported explanations and spot-check source alignment before any future merge.
- Re-run `npm run validate:questions` after any manual edits.
