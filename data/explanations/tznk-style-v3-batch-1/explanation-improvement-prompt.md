# ТЗНК Explanation Style V3 Prompt

Generate one detailed educational explanation for one ТЗНК question.

Do not change:
- id
- question
- passage
- options
- correctAnswer

Use the provided correctAnswer as the source of truth. Write the entire explanation in Ukrainian. Do not invent missing assumptions.

Use this exact structure:

Тут правильна відповідь — [LETTER]: “[correct option text]”.

1. Ключове поняття / ключові слова в умові

[Поясни, що саме перевіряє завдання. Виділи важливі умови, формулювання, обмеження або логічні зв’язки.]

2. Чому правильна відповідь — [LETTER]

[Поясни логіку розв’язання покроково. Покажи, як із тексту, умови, таблиці, послідовності або аргументу випливає правильний варіант.]

3. Чому не інші варіанти

А. [option A text] — [чому варіант неправильний]
Б. [option B text] — [чому варіант неправильний]
В. [option C text] — [чому варіант неправильний]
Г. [option D text] — [чому варіант неправильний]

If there are more options, explain all options.

4. Які правила треба знати, щоб не допустити тут помилок на іспиті

[Use exactly one of the two modes below.]

5. Як запам’ятати

[Дай коротку практичну підказку, алгоритм, логічне правило або нагадування про типову пастку.]

Коротко:

[Одне речення, яке підсумовує логіку правильної відповіді.]

Option letter rules:
- 0 = А
- 1 = Б
- 2 = В
- 3 = Г
- 4 = Д

## rulesSectionMode

Return one explicit mode:
- reusable_rules
- no_general_rule

### reusable_rules

Use reusable_rules only when the task supports a useful generalized strategy. Section 4 should contain 2–5 practical points, mention common traps where relevant, and explain how to self-check. It must help solve similar questions rather than repeat section 2.

Concrete strategies by task type:

Conditions and constraints:
- виписати всі обмеження окремо
- почати з найжорсткішої умови
- перевірити кожен варіант підстановкою
- відрізняти "може бути істинним" від "обов’язково істинне"
- не робити висновків, яких прямо не випливає з умови

Text inference:
- знайти фрагмент тексту, який підтверджує відповідь
- відрізняти висновок автора від власного припущення
- не обирати правдоподібний варіант без текстового підтвердження
- звертати увагу на слова "завжди", "лише", "усі", "деякі", "можливо"

Argument evaluation:
- відрізняти тезу від аргументу
- знаходити приховане припущення
- перевіряти, чи справді доказ підтримує висновок
- розпізнавати підміну причинності кореляцією
- не плутати приклад із доказом загального правила

Sequences and patterns:
- перевірити різниці між сусідніми числами
- перевірити множення, ділення, чергування правил
- перевірити окремо парні й непарні позиції
- не зупинятися на першій правдоподібній закономірності
- перевірити правило на всіх елементах

Quantitative reasoning:
- визначити, що саме порівнюється
- виписати одиниці вимірювання
- перевірити пропорції
- оцінити порядок величини
- виконати зворотну перевірку

Tables and data:
- перевірити заголовки рядків і стовпців
- звернути увагу на одиниці вимірювання
- відрізняти абсолютні значення від відсотків
- не робити висновку за одним показником, якщо потрібне порівняння
- перевірити, чи запитують значення, зміну або частку

Avoid vague advice such as "Читайте уважніше", "Будьте уважними", or "Перевіряйте відповідь".

### no_general_rule

Use no_general_rule when the logic is specific to the exact condition, a general rule would merely repeat section 2, or generalized advice would be vague or misleading.

In section 4 output exactly this sentence and nothing else:

Для цього завдання немає окремого універсального правила. На іспиті потрібно послідовно застосувати всі умови задачі та перевірити, який варіант їм відповідає.

Do not expand it. Add tag tznk_no_general_rule.

## Strict uncertainty handling

If the provided correctAnswer cannot be confidently justified from the available question or passage:
- do not invent missing assumptions
- set uncertain=true
- add needs_explanation_review
- add needs_explanation_style_v3
- briefly state the parsing, ambiguity, missing-context, or answer-derivation problem in notes

Possible reasons include incomplete condition, lost shared passage, malformed text, broken table formatting, ambiguous options, multiple plausible answers, or an answer that cannot be derived from supplied data.

Length guidance:
- simple question: 180–300 words
- medium question: 250–450 words
- complex passage, table, or constraint task: 350–600 words

If rulesSectionMode=no_general_rule, keep section 4 exactly equal to the placeholder and do not bloat other sections.

Required successful tags:
- explanation_improved
- explanation_style_v2
- explanation_style_v3
- tznk_exam_rules_section
- openai_tznk_explanation_batch_1

Return only structured JSON matching the requested schema. No markdown fences and no extra commentary.
