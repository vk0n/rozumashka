# Explanation Style V2 OpenAI Batch Workflow

This workflow improves question explanations offline during development. It never calls OpenAI from the frontend and never bundles `OPENAI_API_KEY` into the static app.

## Environment

Set your API key in the shell before submitting/checking/downloading a batch:

```bash
export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
```

Optionally choose a model:

```bash
export OPENAI_EXPLANATION_MODEL="gpt-5.4-mini"
```

If `OPENAI_EXPLANATION_MODEL` is not set, the scripts use `gpt-5.4-mini`.

Batch input is split into smaller chunks so the workflow can stay under OpenAI organization enqueued-token limits. The default chunk size is 350 questions:

```bash
export OPENAI_BATCH_CHUNK_SIZE=350
```

Use a smaller value, for example `250`, if a chunk still hits the token queue limit.

## Workflow

1. Prepare candidates:

```bash
npm run explanations:prepare
```

2. Create OpenAI Batch JSONL chunks:

```bash
npm run explanations:create-openai-batch
```

This writes:

```text
data/explanations/openai-explanation-batch-index.json
data/explanations/openai-batches/openai-explanation-batch-001.jsonl
data/explanations/openai-batches/openai-explanation-batch-002.jsonl
...
```

For compatibility, `data/explanations/openai-explanation-batch-input.jsonl` is also written as a copy of chunk 1. Prefer the chunked workflow below.

3. Submit one chunk:

```bash
OPENAI_API_KEY=... npm run explanations:submit-openai-batch -- --chunk 1
```

This uploads the selected JSONL file with `purpose=batch`, creates a Batch job, and writes:

```text
data/explanations/openai-batches/openai-explanation-batch-001-meta.json
```

It also updates `data/explanations/openai-explanation-batch-meta.json` as a latest-submitted compatibility file.

4. Check status for the same chunk:

```bash
OPENAI_API_KEY=... npm run explanations:check-openai-batch -- --chunk 1
```

5. Download completed results for that chunk:

```bash
OPENAI_API_KEY=... npm run explanations:download-openai-batch -- --chunk 1
```

This writes:

```text
data/explanations/openai-batches/openai-explanation-batch-001-raw-output.jsonl
data/explanations/openai-batches/openai-explanation-batch-001-errors.jsonl
```

The download script will not overwrite existing files unless you add `--force`:

```bash
OPENAI_API_KEY=... npm run explanations:download-openai-batch -- --chunk 1 --force
```

6. Repeat submit/check/download for each chunk.

If your organization is close to the enqueued-token limit, wait until chunk 1 is `completed` before submitting chunk 2:

```bash
OPENAI_API_KEY=... npm run explanations:submit-openai-batch -- --chunk 2
OPENAI_API_KEY=... npm run explanations:check-openai-batch -- --chunk 2
OPENAI_API_KEY=... npm run explanations:download-openai-batch -- --chunk 2
```

7. Normalize model output:

```bash
npm run explanations:normalize-openai-output
```

This reads all downloaded chunk outputs, validates structured output, and writes:

```text
data/explanations/openai-explanation-batch-normalized-output.json
data/explanations/explanation-improvement-output.json
data/explanations/openai-explanation-batch-report.md
```

If some chunks have not been downloaded yet, the report lists them as missing. Apply only when you intentionally want to apply the normalized subset or after all chunks are downloaded.

8. Optional: retry only rejected explanations.

If normalization rejects a small number of outputs, create one retry chunk only for those ids:

```bash
npm run explanations:create-openai-retry-batch
```

Then submit/check/download the retry chunk shown by the script:

```bash
OPENAI_API_KEY=... npm run explanations:submit-openai-batch -- --chunk 8
OPENAI_API_KEY=... npm run explanations:check-openai-batch -- --chunk 8
OPENAI_API_KEY=... npm run explanations:download-openai-batch -- --chunk 8
npm run explanations:normalize-openai-output
```

The exact retry chunk number may differ; use the number printed by the create command.

9. Apply improved explanations:

```bash
npm run explanations:apply
```

The apply step is the only step that may modify question JSON files. It changes only:

- `explanation`
- `explanationByOption`
- explanation-related `tags`

It preserves question count, ids, question text, passages, options, `correctAnswer`, `sourceType`, `sourceUrl`, and `reviewed`.

10. Validate and build:

```bash
npm run validate:questions
npm run build
```

## Important Safety Notes

- Never put `OPENAI_API_KEY` into frontend code, `public/`, or committed JSON files.
- Do not submit a batch from the browser.
- Do not apply explanations until `normalize-openai-output` has accepted them.
- Review `openai-explanation-batch-report.md` before applying if there are many rejected or uncertain outputs.
- If OpenAI returns `token_limit_exceeded` during batch validation, reduce `OPENAI_BATCH_CHUNK_SIZE` and recreate the chunk files.

## Incremental English Style V3 Batch

English style v3 is a separate English-only workflow. It adds the practical section:

```text
4. Які правила треба знати, щоб не допустити тут помилок на іспиті
```

It does not reuse or overwrite style-v2 batch files. All artifacts are stored under:

```text
data/explanations/english-style-v3-batch-1/
```

Prepare English candidates that do not yet have the `explanation_style_v3` tag:

```bash
npm run explanations:prepare-english-v3
```

Create the isolated Batch API JSONL:

```bash
npm run explanations:create-openai-english-v3-batch
```

Submit, check, and download:

```bash
OPENAI_API_KEY=... npm run explanations:submit-openai-english-v3-batch
OPENAI_API_KEY=... npm run explanations:check-openai-english-v3-batch
OPENAI_API_KEY=... npm run explanations:download-openai-english-v3-batch
```

Normalize and validate the returned explanations:

```bash
npm run explanations:normalize-openai-english-v3-output
```

Only the explicit apply command modifies `public/data/questions/english.json`:

```bash
npm run explanations:apply-english-v3
npm run validate:questions
npm run build
```

The apply script creates a backup under `data/backups/`, updates by question id, and allows changes only to `explanation`, `explanationByOption`, and explanation-related tags.

The workflow uses `OPENAI_EXPLANATION_MODEL` when set and otherwise follows the project default, currently `gpt-5.4-mini`.

## Incremental ТЗНК Style V3 Batch

ТЗНК style v3 is a separate ТЗНК-only workflow. It adds:

```text
4. Які правила треба знати, щоб не допустити тут помилок на іспиті
```

All artifacts live under:

```text
data/explanations/tznk-style-v3-batch-1/
```

Prepare candidates and create the isolated Batch API input:

```bash
npm run explanations:prepare-tznk-v3
npm run explanations:create-openai-tznk-v3-batch
```

Submit, check, and download:

```bash
OPENAI_API_KEY=... npm run explanations:submit-openai-tznk-v3-batch
OPENAI_API_KEY=... npm run explanations:check-openai-tznk-v3-batch
OPENAI_API_KEY=... npm run explanations:download-openai-tznk-v3-batch
```

Normalize and apply:

```bash
npm run explanations:normalize-openai-tznk-v3-output
npm run explanations:apply-tznk-v3
npm run validate:questions
npm run build
```

The rules section has two valid modes:

- `reusable_rules` gives a concrete, reusable algorithm or exam strategy.
- `no_general_rule` is used when a generalized rule would be artificial or merely repeat the solution.

For `no_general_rule`, section 4 must contain exactly:

```text
Для цього завдання немає окремого універсального правила. На іспиті потрібно послідовно застосувати всі умови задачі та перевірити, який варіант їм відповідає.
```

Valid outputs with `uncertain=true` are written only to:

```text
data/explanations/tznk-style-v3-batch-1/openai-explanation-batch-manual-review.json
```

They are excluded from the normalized auto-apply file. Review and resolve them manually before any separate application.

The apply command creates a backup under `data/backups/tznk-explanations-style-v3-before-*`. It updates only `explanation`, `explanationByOption`, and explanation-related tags. Question text, passage, options, correct answer, source metadata, and `reviewed` remain unchanged.
