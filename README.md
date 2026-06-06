# РозуМашка

Статичний тренажер для підготовки до українських вступних іспитів у магістратуру: ЄВІ та ЄФВВ. Застосунок працює повністю в браузері: без бекенду, авторизації, бази даних, API або платежів.

Питання завантажуються з JSON-файлів у `public/data/questions/`, а прогрес, історія спроб і помилки зберігаються локально в `localStorage`.

## Можливості

- Режими: практика, іспит, робота над помилками.
- Предмети: ТЗНК, Англійська мова, Управління та адміністрування, Психологія та соціологія.
- Фільтр джерела питань: усі, імпортовані, згенеровані.
- Бейджі джерела питання та позначка `Потребує перевірки` для `reviewed=false`.
- Детальні результати: score, відсоток, розбір відповідей, результат за темами.
- Сторінка прогресу з останніми спробами та базовою статистикою.
- Підтримка passage-завдань, довгих текстів, зображень у питаннях і читабельного форматування.
- SVG favicon для легкого пошуку вкладки в браузері.

## Поточний банк питань

Публічний runtime-банк містить 2150 питань:

| Предмет | Усього | Імпортовані | Згенеровані |
| --- | ---: | ---: | ---: |
| ТЗНК | 515 | 357 | 158 |
| Англійська мова | 517 | 289 | 228 |
| Управління та адміністрування | 481 | 160 | 321 |
| Психологія та соціологія | 468 | 160 | 308 |

Основний банк для сайту лежить у:

```text
public/data/questions/
```

Допоміжні артефакти імпорту, генерації та рев’ю лежать у `data/` і `tools/`. Raw-завантаження та backup-снапшоти не потрібні для роботи сайту й виключені з git.

## Технології

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router з `HashRouter`
- Zod для runtime-валідації JSON
- `localStorage` для прогресу й помилок

## Встановлення

```bash
npm install
```

## Локальний запуск

```bash
npm run dev
```

Після старту Vite відкрийте локальну адресу з термінала.

## Валідація питань

```bash
npm run validate:questions
```

Скрипт перевіряє обов’язкові поля, унікальність id, валідність `sourceType`, `difficulty`, `type`, індекс `correctAnswer`, кількість варіантів, наявність пояснень, passage для `passage_single_choice`, дублікати варіантів і дублікати текстів питань.

## Static Build

```bash
npm run build
```

Готовий статичний сайт буде в `dist/`.

## Деплой на S3 + CloudFront

Команди для редеплою:

```bash
npm run validate:questions
npm run build

aws s3 sync dist/ s3://maga-rozumashka --delete

aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

Якщо використовується AWS profile, додайте `--profile YOUR_PROFILE` до AWS-команд.

Застосунок використовує `HashRouter`, тому маршрути мають вигляд `/#/subjects` і не потребують CloudFront/S3 fallback rewrite. Якщо колись перейти на `BrowserRouter`, тоді всі невідомі маршрути треба буде повертати на `index.html`.

## Як додати питання

1. Відкрийте відповідний файл у `public/data/questions/`.
2. Додайте питання за схемою:

```json
{
  "id": "english-custom-001",
  "subject": "english",
  "type": "single_choice",
  "topic": "Grammar",
  "subtopic": "Articles",
  "difficulty": "easy",
  "sourceType": "generated",
  "sourceUrl": null,
  "reviewed": false,
  "question": "Choose the correct answer.",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "explanation": "A concise explanation of the correct answer.",
  "tags": ["grammar"]
}
```

Для reading comprehension або довгих текстів використовуйте:

```json
{
  "type": "passage_single_choice",
  "passage": "Text for the task..."
}
```

Для питання із зображенням можна додати:

```json
{
  "imageUrl": "data/images/example.svg"
}
```

Після будь-якої зміни банку питань запускайте:

```bash
npm run validate:questions
```

## Корисні скрипти

```bash
npm run import:zno-osvita
npm run review:third-party
npm run merge:third-party
npm run generate:explanations
npm run explanations:prepare
npm run explanations:create-openai-batch
npm run explanations:submit-openai-batch
npm run explanations:check-openai-batch
npm run explanations:download-openai-batch
npm run explanations:normalize-openai-output
npm run explanations:apply
npm run explanations:prepare-english-v3
npm run explanations:create-openai-english-v3-batch
npm run explanations:normalize-openai-english-v3-output
npm run explanations:apply-english-v3
npm run explanations:prepare-tznk-v3
npm run explanations:create-openai-tznk-v3-batch
npm run explanations:normalize-openai-tznk-v3-output
npm run explanations:apply-tznk-v3
npm run merge:generated
```

Ці скрипти використовуються лише під час розробки. Runtime сайту не скрапить інтернет і читає тільки статичні JSON-файли з `public/data/`.

`explanations:prepare` збирає питання зі слабкими або неструктурованими поясненнями в `data/explanations/explanation-improvement-input.json` і створює prompt для редакторського/LLM-проходу. `explanations:apply` застосовує заповнений `explanation-improvement-output.json`, змінюючи тільки пояснення та explanation-related tags.

## OpenAI Batch Для Пояснень

OpenAI використовується тільки offline у Node-скриптах для розробки. Frontend не викликає OpenAI API, а `OPENAI_API_KEY` не потрапляє в `public/` або production bundle.

Налаштування:

```bash
export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
export OPENAI_EXPLANATION_MODEL="gpt-5.4-mini"
```

`OPENAI_EXPLANATION_MODEL` опційний; якщо його не вказати, використовується `gpt-5.4-mini`.

Повний workflow:

```bash
npm run explanations:prepare
npm run explanations:create-openai-batch
OPENAI_API_KEY=... npm run explanations:submit-openai-batch
OPENAI_API_KEY=... npm run explanations:check-openai-batch
OPENAI_API_KEY=... npm run explanations:download-openai-batch
npm run explanations:normalize-openai-output
npm run explanations:apply
npm run validate:questions
npm run build
```

### ТЗНК Explanation Style V3

ТЗНК workflow окремо визначає, чи має завдання корисне універсальне правило (`reusable_rules`), чи потребує стандартизованої секції `no_general_rule`. Невпевнені відповіді відокремлюються для ручного перегляду й не потрапляють до auto-apply.

```bash
npm run explanations:prepare-tznk-v3
npm run explanations:create-openai-tznk-v3-batch
OPENAI_API_KEY=... npm run explanations:submit-openai-tznk-v3-batch
OPENAI_API_KEY=... npm run explanations:check-openai-tznk-v3-batch
OPENAI_API_KEY=... npm run explanations:download-openai-tznk-v3-batch
npm run explanations:normalize-openai-tznk-v3-output
npm run explanations:apply-tznk-v3
npm run validate:questions
npm run build
```

Артефакти зберігаються в `data/explanations/tznk-style-v3-batch-1/`; попередні batches не перезаписуються.

Детальна інструкція лежить у `data/explanations/README.md`.

### English Explanation Style V3

Новий incremental English-only batch додає практичний блок про правила, сигнали й типові пастки на іспиті. Він зберігається окремо в `data/explanations/english-style-v3-batch-1/` і не перезаписує style-v2 артефакти.

```bash
npm run explanations:prepare-english-v3
npm run explanations:create-openai-english-v3-batch
OPENAI_API_KEY=... npm run explanations:submit-openai-english-v3-batch
OPENAI_API_KEY=... npm run explanations:check-openai-english-v3-batch
OPENAI_API_KEY=... npm run explanations:download-openai-english-v3-batch
npm run explanations:normalize-openai-english-v3-output
npm run explanations:apply-english-v3
npm run validate:questions
npm run build
```
