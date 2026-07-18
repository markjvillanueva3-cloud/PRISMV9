---
title: NN/GNN PSN-leg schema-read blindness (fabricated diagnosis)
type: lesson
domain: ai-training
slot: india
created: 2026-06-02
commit: f436b2c614
tags: [nn-graph, gnn, psn, schema-read-blindness, fail-loud, observability]
---

# NN/GNN PSN-leg schema-read blindness — fabricated "embeddingSource mismatch"

## Symptom
Every prompt across all 26 slots injected, via `psn-leg-state-inject.mjs`:
> **NN/GNN (#10)** [UNGRADED] — AUROC not finite (eval deferred — likely embeddingSource mismatch, see U-NN-PREDICTOR-EMBED-WIRE)

The "embeddingSource mismatch" cause was **fabricated** — a hard-coded guess baked into the
detail string, not derived from any signal.

## Root cause (schema-read-blindness)
`legStateNnGraph` read **top-level** `evalDoc.auroc`. The real `state/shared/nn-graph/NN-EVAL.json`
nests AUROC under `checkpointMeta.auroc` and carries `deferred` / `reason` / `poolSize`:

```json
{ "deferred": true, "reason": "insufficient-reference-pool", "checkpointPresent": true,
  "poolSize": 0, "checkpointMeta": { "auroc": 0.0960..., "brierCalibrated": 0.249 } }
```

So the top-level read was **always `undefined`** → always "not finite" → always the fabricated
branch. The sibling consumer `nn-graph-health-inject.mjs` read the SAME file **correctly** via its
exported `classifyGnn` (`checkpointMeta.auroc` + `deferred`). Two readers of one state file diverged —
india's documented **"schema-read-blindness"** regression class (META tool reading the wrong schema).

## True state (what the leg should have said)
`DEFERRED — AUROC 0.096 (sub-gate); grading deferred — insufficient-reference-pool (reference pool empty)`.
The binding blocker is the **reference pool (poolSize 0)**, NOT embeddingSource.

## Fix (`U-NN-LEG-SCHEMA-READ-FIX`, f436b2c614)
1. Delegate the schema read to the canonical `classifyGnn` — **one source of truth** for the eval
   schema (prevents the two-reader drift from recurring). R8.
2. Type-strict top-level fallback for legacy flat `{auroc:N}` docs — guards the `Number(null)===0`
   trap (a flat `{auroc:null}` must NOT read as 0 → BELOW-GATE).
3. New `DEFERRED` status reports the **real** `reason` + the sub-gate AUROC actually measured —
   never a guessed cause. R12 fail-loud.
4. Gate on `classifyGnn.healthy` (AUROC **and** Brier, fail-closed) — a checkpoint passing AUROC but
   failing calibration is surfaced, not silently certified.
5. Export `PROMOTE_AUROC_MIN` / `PROMOTE_BRIER_MAX` from `nn-graph-health-inject.mjs` — the threshold
   is never re-inlined (drift risk).

## Tests (81/81)
- Real nested-schema DEFERRED / BELOW-GATE / HEALTHY cases.
- `{auroc:null}` → UNGRADED (the `Number(null)===0` regression guard).
- AUROC-pass + Brier-fail → BELOW-GATE (the calibration-gate guard).
- **Real-data anti-drift test** reads the on-disk `NN-EVAL.json` and fails LOUD if the schema drifts
  again (the exact way the original bug went undetected). R9.
- Negative-asserts the fabricated `embeddingSource` string can never reappear.

## Lessons
- **Never bake a cause into a diagnostic string.** "likely X" with no signal becomes fleet-wide
  misinformation. If you can't read the cause, say "unknown" — don't guess.
- **One state file → one reader.** When two hooks read the same JSON, share the parser
  (`classifyGnn`), or they WILL drift and one goes blind.
- **`Number(null)===0`** is finite — type-strict guards (`typeof === "number" && isFinite`) are
  mandatory for optional numeric fields.

## Related
- [[nn-graph-ms0]] · [[gnn-node-embedding-bridge]] · [[heterophily-collapse-class]]
- Real binding blocker for tier-5 deploy: reference-pool=0 → next-unit `U-NN-REFPOOL-REEVAL`
  (fresh `runAssessment` against the post-May-23-seed graph).
- Memory: [[reference_nn_leg_schema_read_fix_2026_06_02]]
