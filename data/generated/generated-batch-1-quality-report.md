# Generated Batch 1 Quality Report

Reviewed on 2026-05-18.

## Summary

- Total questions reviewed: 220
- ТЗНК reviewed=true: 100
- ТЗНК reviewed=false: 0
- English reviewed=true: 120
- English reviewed=false: 0
- Questions marked `needs_manual_review`: 0
- Substantive questions rewritten: 24
- Duplicate questions removed or fixed: 0
- Correct-answer option order rebalanced: 164 questions

## Review Changes

- Rewrote ambiguous ТЗНК ordering/constraint questions where more than one option was defensible.
- Replaced a risky Ukrainian-letter sequence with a numeric sequence that has one clear rule.
- Strengthened several ТЗНК quantitative/data tasks whose original `hard` difficulty was too easy.
- Tightened ТЗНК explanations that referred to option letters, so they remain valid after option reordering.
- Adjusted English reading subtopics where the question was detail/inference rather than main idea.
- Rewrote several weak English distractors and one awkward wording item.
- Balanced correct answers evenly across option indexes in both generated files.

## Validation

- `npm run validate:questions`: passed
- Result: `Validated 554 questions across 6 files.`
- Duplicate and near-duplicate check: passed
- Correct answer index check: passed
- Passage requirement check: passed
- Duplicate options check: passed

## Build

- `npm run build`: passed
- Static Vite build completed successfully.

## Recommendation

Batch 1 is ready to merge into `public/data/questions` from a structural and editorial quality standpoint.

Recommended merge approach: merge generated ТЗНК and English only, preserve source metadata, and keep the reviewed flags from these reviewed generated files.
