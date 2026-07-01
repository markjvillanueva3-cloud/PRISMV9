---
title: CAD-gen 25.4x-undersize on metric requests (divide-by-IN units bug)
type: lesson
domain: cad
slot: delta
created: 2026-06-29
commit: 67ea872037
tags: [cad, units, generation, closed-loop, regression, self-check]
---

# CAD-gen 25.4× undersize on metric requests — the divide-by-IN units bug

## Symptom
The feature-aware self-check sweep (`scripts/cad-self-check-sweep.mjs`), on its first live run over the
generated-part corpus, scored several mm-dimensioned `rectangular plate` parts at **0%**: requested
`[101.6, 23.88, 22.4]` mm, generated bbox `[3.92, 0.86, 0.81]` mm — ~25.4× too small. Other mm plates scored
100%, so it was real (stochastic) generation, not a pipeline artifact.

## Root cause
`scripts/cad-text-to-cadquery.mjs` generates CadQuery via a local LLM. The `model.py` revealed:
```python
IN = 25.4
length_mm = 101.6 / IN   # = 4.0 mm   ← divides a MM value by 25.4
```
The prompt said *"dimensions are INCHES unless explicitly metric; convert with 25.4, name IN = 25.4"* with **no
direction**. On a metric request the LLM still applied the IN pattern and **divided** the mm dims by IN. And
`codeInvalidReason` **required** `25.4|IN|inch` to appear in the code, so a *correct* mm script (`length = 101.6`,
no IN) was **rejected** — the validator pushed the LLM toward the buggy `/IN`. Same class as the 2026-06-28
spark-gap units bug (the `IN = 25.4` electrode pattern bleeding into plain parts).

## Fix (`U-DELTA-CADGEN-MM-UNITS-FIX`)
1. Prompt states **direction**: inch→mm is `* 25.4`; a metric request uses the mm number **directly**; **never
   divide a dimension by IN/25.4**.
2. `codeInvalidReason(code, {requestIsMetric})` is **metric-aware** (no inch-evidence required for mm requests)
   and **rejects** any `= <num> / (IN|25.4)` → fails loud + records a `code_error` learning signal.
3. Added `requestIsMetric(request)` (purely mm/cm, no inch).

Live proof: regenerated the exact failing request → `length = 101.6` (no `/IN`), bbox `[101.6, 23.88, 22.4]`,
self-check **100% accurate**.

## Takeaways
- A unit-conversion instruction must state **direction** — "convert with 25.4" alone permits dividing the wrong
  way, producing a clean 25.4× scale error (the units-bug fingerprint).
- A validator that **requires** a conversion artifact forces the bug onto inputs that legitimately need none —
  gate the requirement on the input's units.
- A closed loop earns its keep on its first real catch: the feature-aware self-check (vs a bbox-only check) is
  what surfaced this. See the Stage-0 self-check architecture: `cad-self-check.mjs` + `cad-print-dim-match.mjs`.

Related: [[cad-step-failure-modes]] · the spark-gap units regression (CLAUDE.md ## Recent regressions 2026-06-28).
