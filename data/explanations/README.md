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
