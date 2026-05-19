# Third-Party Quality Report

Generated on 2026-05-19.

## Summary

- Total third-party questions reviewed: 781
- Records retained after exact duplicate cleanup: 746
- reviewed=true: ТЗНК 340, Англійська 284, Управління 20, Психологія/соціологія 20
- reviewed=false: ТЗНК 10, Англійська 71, Управління 1, Психологія/соціологія 0
- ZNO Освіта reviewed count: 664
- JustSchool reviewed count: 0
- Questions marked needs_manual_review: 78
- Questions marked needs_answer_review: 0
- Questions marked formatting_review_recommended: 129
- Duplicates found during review: 35
- Exact duplicates skipped/removed from third-party processed files: 35

## Duplicate Findings

- tznk-zno-osvita-27578: exact duplicate of tznk-tznk-demo-2024-007 (public/data/questions/tznk.json)
- tznk-zno-osvita-27575: exact duplicate of tznk-tznk-demo-2024-004 (public/data/questions/tznk.json)
- management-zno-osvita-32769: exact duplicate of management-yefvv-2024-128 (public/data/questions/management.json)
- management-zno-osvita-32767: exact duplicate of management-yefvv-2024-126 (public/data/questions/management.json)
- management-zno-osvita-32762: exact duplicate of management-yefvv-2024-121 (public/data/questions/management.json)
- management-zno-osvita-32746: exact duplicate of management-yefvv-2024-105 (public/data/questions/management.json)
- management-zno-osvita-32730: exact duplicate of management-yefvv-2024-089 (public/data/questions/management.json)
- management-zno-osvita-32712: exact duplicate of management-yefvv-2024-071 (public/data/questions/management.json)
- management-zno-osvita-32698: exact duplicate of management-yefvv-2024-057 (public/data/questions/management.json)
- management-zno-osvita-32696: exact duplicate of management-yefvv-2024-055 (public/data/questions/management.json)
- management-zno-osvita-32663: exact duplicate of management-yefvv-2024-022 (public/data/questions/management.json)
- management-zno-osvita-32647: exact duplicate of management-yefvv-2024-006 (public/data/questions/management.json)
- psych-soc-zno-osvita-32921: exact duplicate of psych-soc-yefvv-2024-140 (public/data/questions/psychology-sociology.json)
- psych-soc-zno-osvita-32916: exact duplicate of psych-soc-yefvv-2024-135 (public/data/questions/psychology-sociology.json)
- psych-soc-zno-osvita-32914: exact duplicate of psych-soc-yefvv-2024-133 (public/data/questions/psychology-sociology.json)
- psych-soc-zno-osvita-32895: exact duplicate of psych-soc-yefvv-2024-114 (public/data/questions/psychology-sociology.json)
- psych-soc-zno-osvita-32888: exact duplicate of psych-soc-yefvv-2024-107 (public/data/questions/psychology-sociology.json)
- psych-soc-zno-osvita-32882: exact duplicate of psych-soc-yefvv-2024-101 (public/data/questions/psychology-sociology.json)
- psych-soc-zno-osvita-32874: exact duplicate of psych-soc-yefvv-2024-093 (public/data/questions/psychology-sociology.json)
- psych-soc-zno-osvita-32868: exact duplicate of psych-soc-yefvv-2024-087 (public/data/questions/psychology-sociology.json)

## Questionable Examples

- tznk-zno-osvita-33991: formatting_review_recommended
- tznk-zno-osvita-33989: formatting_review_recommended
- tznk-zno-osvita-33981: blocking tag present: needs_manual_review; obvious parsing artifact detected
- tznk-zno-osvita-33978: blocking tag present: needs_manual_review; obvious parsing artifact detected
- tznk-zno-osvita-33977: blocking tag present: needs_manual_review; obvious parsing artifact detected
- tznk-zno-osvita-33974: formatting_review_recommended
- tznk-zno-osvita-33971: formatting_review_recommended
- tznk-zno-osvita-33970: formatting_review_recommended
- tznk-zno-osvita-33969: formatting_review_recommended
- tznk-zno-osvita-33968: formatting_review_recommended
- tznk-zno-osvita-33967: formatting_review_recommended
- tznk-zno-osvita-33966: formatting_review_recommended
- tznk-zno-osvita-33918: formatting_review_recommended
- tznk-zno-osvita-33917: duplicate options inside question
- tznk-zno-osvita-33893: formatting_review_recommended
- tznk-zno-osvita-33887: formatting_review_recommended
- tznk-zno-osvita-33883: formatting_review_recommended
- tznk-zno-osvita-33881: formatting_review_recommended
- tznk-zno-osvita-33870: formatting_review_recommended
- tznk-zno-osvita-33869: formatting_review_recommended

## Review Notes

- ZNO Освіта questions that passed structural checks were marked `reviewed=true` because they are mirrored past-exam sources with answer metadata.
- ТЗНК questions with clear but table/condition-heavy formatting were kept and tagged `formatting_review_recommended`.
- JustSchool questions were kept `reviewed=false` and tagged `needs_manual_review` because they are non-exam-mirror third-party items.
- No official public files and no generated batch files were modified.

## Recommendation

Ready for selective merge of `reviewed=true` ZNO Освіта questions, preferably excluding `formatting_review_recommended` until a quick visual spot-check. Keep `needs_manual_review` items out of any bulk merge.

## Verification

- Validation: passed `npm run validate:questions` (`Validated 1300 questions across 10 files.`)
- Build: passed `npm run build`
