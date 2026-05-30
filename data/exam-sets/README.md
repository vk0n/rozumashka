# Exam Sets And Question Groups

Ця папка містить службові артефакти для підтримки grouped-питань і конкретних варіантів іспитів. Runtime сайту читає тільки:

- `public/data/question-groups.json`
- `public/data/exam-sets.json`
- `public/data/questions/*.json`

## Question Groups

Група потрібна, коли кілька питань мають одну спільну умову, текст або passage.

```json
{
  "id": "qg-english-example-2024-reading-01",
  "subject": "english",
  "title": "Reading text 1",
  "passage": "Shared text for several questions...",
  "questionIds": [
    "english-example-001",
    "english-example-002",
    "english-example-003"
  ],
  "sourceType": "public_source",
  "sourceUrl": "https://example.test/exam",
  "sourceSite": "example.test",
  "sourceYear": 2024,
  "tags": ["manual_group"]
}
```

Кожне питання з групи має мати:

```json
{
  "groupId": "qg-english-example-2024-reading-01",
  "groupOrder": 1
}
```

Порядок у `questionIds` є порядком показу в тесті.

## Exam Sets

Exam set описує конкретний варіант іспиту або консервативно зібраний набір із джерела.

```json
{
  "id": "english-example-2024-variant-a",
  "subject": "english",
  "title": "English 2024, variant A",
  "description": "Imported historical exam set.",
  "sourceType": "public_source",
  "sourceSite": "example.test",
  "sourceUrl": "https://example.test/exam",
  "year": 2024,
  "variant": "A",
  "tags": ["manual_exam_set"],
  "units": [
    { "type": "question", "questionId": "english-example-standalone-001" },
    { "type": "group", "groupId": "qg-english-example-2024-reading-01" }
  ]
}
```

`units` не дублюють текст питання. Вони тільки посилаються на standalone-питання або групи й зберігають порядок варіанта.

## Migration

Автоматична міграція консервативна: вона групує тільки питання з однаковим passage/умовою та не намагається вгадувати за темою.

```bash
npm run migrate:exam-sets
npm run validate:exam-sets
```

Звіт міграції:

```text
data/exam-sets/exam-set-migration-report.md
```

## Manual Overrides

`manual-group-overrides.json` має формат:

```json
{
  "groups": [],
  "examSets": [],
  "excludeQuestionIds": []
}
```

Використовуйте:

- `groups`, щоб додати або замінити групу вручну.
- `examSets`, щоб додати або замінити конкретний варіант іспиту.
- `excludeQuestionIds`, щоб залишити питання standalone, навіть якщо автоматична міграція бачить однакову умову.

## Source And Year Filters

`sourceSite` має бути стабільним доменом або маркером, наприклад:

- `testportal.gov.ua`
- `zno.osvita.ua`
- `generated`

`sourceYear` заповнюється тільки тоді, коли рік можна надійно визначити з джерела, id або імпортних метаданих. Якщо рік невідомий, використовується `null`.

## Quiz Behavior

- Конкретний exam set показується в порядку `units`.
- Випадковий тест тасує units, а не окремі питання.
- Питання всередині групи завжди йдуть поруч і в порядку `questionIds`.
- У режимі помилок одне помилкове питання з групи підтягує всю групу як контекст.
