# Generated Batch 1 Report

Generated on 2026-05-18T18:27:08.844Z.

## Summary

- Generated ТЗНК questions: 100
- Generated English questions: 120
- Destination files: `data/generated/tznk.generated.json`, `data/generated/english.generated.json`
- Merged into public question bank: no
- Validation status: passed `npm run validate:questions` (554 questions across 6 files)
- Questions marked for manual review: 0

## ТЗНК Distribution By Topic

- Аналітичне мислення: 10
- Вербальне мислення: 10
- Закономірності та послідовності: 10
- Інтерпретація даних: 10
- Кількісні міркування: 10
- Короткі текстові висновки: 10
- Критичне читання: 10
- Логічне мислення: 10
- Оцінювання аргументації: 10
- Умови та обмеження: 10

## ТЗНК Distribution By Difficulty

- easy: 25
- hard: 17
- medium: 58

## English Distribution By Topic

- Cloze and sentence completion: 12
- Grammar: 30
- Reading comprehension: 54
- Vocabulary: 24

## English Distribution By Difficulty

- easy: 22
- medium: 98

## Known Limitations

- The generated questions are original training material, not official exam questions.
- ТЗНК table/data items use plain-text table descriptions because the current schema does not include image/table attachments.
- English passage groups duplicate the passage in each related question, matching the current app schema.
- Generated questions were later quality-reviewed in `data/generated/generated-batch-1-quality-report.md`; use the current `reviewed` flags in the generated JSON files.
