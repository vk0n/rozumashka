# Extraction Issues

Generated on 2026-05-18T17:38:52.066Z.

| File path | Source URL | Reason parsing failed or was partial | Suggested manual action |
| --- | --- | --- | --- |
| data/raw/tznk/tznk-2023-demo.pdf | https://testportal.gov.ua/wp-content/uploads/2024/12/TZNK_2023_merged-1.pdf | Not parsed in this pass because the commented 2024 demo was preferred for ТЗНК import and duplicate/overlap review is needed before importing another demo. | Extend the TЗНК parser to compare against already imported text and import non-duplicates. |
| data/raw/tznk/tznk-2024-demo-with-comments.pdf | https://testportal.gov.ua/wp-content/uploads/2024/04/TZNK_maket_sajt_2024_03_29_merged.pdf | TЗНК cloze subquestions 1-10 use multi-gap/multi-column formatting; tasks 22-27 include fraction/table/diagram-dependent layout that the current schema cannot represent safely. | Manually normalize cloze questions or add schema support for grouped cloze/table/image prompts. |
| data/raw/english/english-2023-demo.pdf | https://testportal.gov.ua/wp-content/uploads/2023/05/YEVI-2023_angl_mova_demo.pdf | Task 1 is a matching task unsupported by the current schema. Tasks 12-30 are cloze/table layouts and were not imported in this conservative pass. | Add schema support for matching/cloze groups or manually normalize each gap as a single-choice question. |
| data/raw/english/english-2021-shift-1.pdf | https://testportal.gov.ua/wp-content/uploads/2021/06/EVI_2021-Angl_mova-1_zmina-Zoshyt_1.pdf | PDF text extraction contains mojibake/encoding artifacts in the instruction and task text. | Use OCR or a different PDF text extraction pipeline before normalization. |
| data/raw/english/english-2020-shift-1.pdf | https://testportal.gov.ua/wp-content/uploads/2020/07/EVI_2020-Angl_mova-1_-Zoshyt_1.pdf | Not parsed in this pass; older English past papers need a dedicated parser for matching/cloze sections plus answer-key alignment. | Implement an English past-paper parser and cross-check against answer keys. |
| data/raw/english/english-2019-shift-1.pdf | https://testportal.gov.ua/wp-content/uploads/2019/07/EVI_2019-Angl_mova-1_zmina-Zoshyt_1.pdf | Not parsed in this pass; older English past papers need a dedicated parser for matching/cloze sections plus answer-key alignment. | Implement an English past-paper parser and cross-check against answer keys. |
