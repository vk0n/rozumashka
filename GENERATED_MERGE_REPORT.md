# Generated Merge Report

Generated on 2026-05-18T23:47:06.224Z.

## Summary

- Snapshot created before merge: `data/backups/generated-merge-2026-05-18-dEfRC6`
- Merged count: ТЗНК 150, Англійська 220, Управління 313, Психологія/соціологія 300
- Skipped count: ТЗНК 0, Англійська 0, Управління 37, Психологія/соціологія 50
- Final public counts: ТЗНК 515, Англійська 517, Управління 481, Психологія/соціологія 468
- Remaining generated staging questions: ТЗНК 0, Англійська 0, Управління 37, Психологія/соціологія 50

## Generated staging files

- `data/generated/tznk.generated.json`: before 100, merged 100, remaining 0
- `data/generated/tznk.generated-batch-3.json`: before 50, merged 50, remaining 0
- `data/generated/english.generated.json`: before 120, merged 120, remaining 0
- `data/generated/english.generated-batch-3.json`: before 100, merged 100, remaining 0
- `data/generated/management.generated-batch-2.json`: before 100, merged 100, remaining 0
- `data/generated/management.generated-batch-3.json`: before 250, merged 213, remaining 37
- `data/generated/psychology-sociology.generated-batch-2.json`: before 100, merged 100, remaining 0
- `data/generated/psychology-sociology.generated-batch-3.json`: before 250, merged 200, remaining 50

## Skipped reasons

- not_reviewed_or_blocked: 87
- duplicate_id: 0
- duplicate_question_text: 0
- near_duplicate_question_text: 0
- invalid_structure: 0

## Skipped examples

- management-generated-b3-094: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-095: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-096: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-097: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-098: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-099: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-100: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-121: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-122: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-123: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-124: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-125: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-146: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-147: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-148: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-149: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-150: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-171: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-172: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-173: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-174: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-175: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-208: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-209: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-210: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-211: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-212: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-213: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-214: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)
- management-generated-b3-215: not_reviewed_or_blocked (reviewed=false or has a blocking review tag)

## Notes

- Only `reviewed=true` generated questions with `sourceType="generated"`, `sourceUrl=null`, and no blocking review tags were merged.
- Existing public questions were preserved.
- Merged records were removed from generated staging files to keep validation unique across `public/data/questions` and `data/generated`.
- Remaining generated staging questions are intentionally unmerged and still require manual editorial work.

## Verification

- Validation: passed `npm run validate:questions`
- Validation output: `Validated 2150 questions across 16 files.`
- Build: passed `npm run build`
- Build output summary: Vite production build completed successfully; generated `dist/index.html`, CSS, and JS assets.
