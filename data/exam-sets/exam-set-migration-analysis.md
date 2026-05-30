# Exam Set Migration Analysis

Generated on 2026-05-30.

## Existing Schema Summary

- Questions live in `public/data/questions/*.json` and are loaded per subject through `public/data/subjects.json`.
- Current question fields are standalone-first: `id`, `subject`, `type`, `topic`, `subtopic`, `difficulty`, `sourceType`, `sourceUrl`, `reviewed`, `question`, optional `passage`, optional `imageUrl`, `options`, `correctAnswer`, `explanation`, optional `explanationByOption`, optional `tags`.
- Runtime selection currently shuffles individual questions with `shuffleQuestions(pool).slice(...)`.
- Attempts in localStorage store flattened `QuestionResult[]`; there is no group/unit metadata yet.
- Source metadata is mostly encoded in `sourceUrl`, tags, and ids. There is no dedicated `sourceSite`, `sourceYear`, `sourceExamSetId`, or `sourceQuestionOrder` field yet.

## Shared-Passage Detection

High-confidence detection was based only on identical normalized `passage` text within the same subject.

| Subject | Questions | With passage | Likely shared-passage groups | Grouped questions | Standalone or ungrouped |
| --- | ---: | ---: | ---: | ---: | ---: |
| ТЗНК | 515 | 381 | 56 | 193 | 322 |
| Англійська мова | 517 | 387 | 67 | 284 | 233 |
| Управління та адміністрування | 481 | 0 | 0 | 0 | 481 |
| Психологія та соціологія | 468 | 0 | 0 | 0 | 468 |

## Source Metadata Available

- `testportal.gov.ua`
  - ТЗНК official demo 2024: 17 questions, ids like `tznk-tznk-demo-2024-001`.
  - English official demo 2023: 5 questions, ids like `english-english-demo-2023-001`.
  - Management official ЄФВВ 2024 collection: 140 questions, ids like `management-yefvv-2024-001`.
  - Psychology/Sociology official ЄФВВ 2024 collection: 140 questions, ids like `psych-soc-yefvv-2024-001`.
- `zno.osvita.ua`
  - ТЗНК: 340 public-source mirror questions.
  - English: 284 public-source mirror questions.
  - Management: 20 public-source mirror questions.
  - Psychology/Sociology: 20 public-source mirror questions.
  - URLs are archive/list pages such as `/master/tznpk/all/75/`; they preserve a page/offset source but do not reliably encode year or original historical variant.
- Generated questions have `sourceType = "generated"` and no historical source year.

## Original Order Assessment

- Official Testportal ids preserve order for imported full collections and demos. Example: `management-yefvv-2024-001` through `management-yefvv-2024-140`.
- ZNO Освіта public JSON order is not guaranteed to be original exam order because public question files were later sorted/merged. The source URL offset can be used as a conservative archive-page order, and numeric ids can be used only as a fallback within a page/group.
- Shared-passage question order can be inferred conservatively from numeric suffixes in ids when the same passage is identical.
- No reliable year/variant is currently present for most ZNO Освіта entries.

## Ambiguous Cases Requiring Manual Mapping

- ZNO Освіта pages that contain tasks from multiple historical tests cannot be mapped to one original exam variant without additional source metadata.
- Some identical passages appear across multiple ZNO Освіта archive pages, likely because one original reading task spans page offsets. These can be grouped by identical passage, but year/variant should remain `null`.
- Similar-but-not-identical passages are not safe to group automatically.
- Topic similarity alone is not safe for grouping.

## Proposed Conservative Migration Approach

1. Add optional metadata fields to questions: `groupId`, `groupOrder`, `sourceSite`, `sourceYear`, `sourceExamSetId`, `sourceQuestionOrder`.
2. Generate `public/data/question-groups.json` from identical shared passages only.
3. Keep existing `question.passage` for compatibility; UI should prefer group passage when available.
4. Generate official exam sets where order is known:
   - `tznk-testportal-demo-2024`
   - `english-testportal-demo-2023`
   - `management-testportal-yefvv-2024`
   - `psych-soc-testportal-yefvv-2024`
5. Generate conservative ZNO Освіта archive-page sets with `year = null` and variant based on URL offset, not as historical exam-year claims.
6. Leave uncertain questions standalone and list them in the migration report rather than guessing.
