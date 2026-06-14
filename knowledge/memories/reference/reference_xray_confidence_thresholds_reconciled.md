---
name: reference_xray_confidence_thresholds_reconciled
description: blueprint-vision confidence gates — verified shipped values are 0.70 OCR floor + conformal drift, NOT the seed's 0.85/0.95/0.99
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.067Z
aliases: reference_xray_confidence_thresholds_reconciled
---


R12 reconciliation (slot:xray, 2026-05-29). The blueprint-vision galaxy seed (and my first buildout pass) asserted per-field confidence thresholds **0.85 dims / 0.95 tolerances / 0.99 GD&T callouts**. Verification against the shipped specs shows those are **uncorroborated** — reasonable consumer-set defaults, but no shipped gate uses them.

**Verified shipped gates (on-disk):**
- **OCR per-field floor = 0.70** — below it triggers an operator-confirm dialog with the highlighted region (`PRINT-TO-INSPECTION-PIPELINE-V2.md`).
- **CAD-fidelity score < 0.85** → flag for operator review before continuing (same spec).
- **Safety output S(x) ≥ 0.98** — shop_floor tier for feed/speed → machine.
- **Conformal-bound drift > 20%** vs the rolling 50-sample window → `blueprint-accuracy-guard.mjs` HARD BLOCK (knob `PRISM_BLUEPRINT_DRIFT_WIDEN_PCT`, default 20) — verified in the hook source.

The deeper mechanism (BLUEPRINT-OCR-TRAINING-MS1) is **conformal prediction sets + 4-tier ground-truth stratification** (`confirmed > produced > quoted > inferred`), not fixed per-field cutoffs. Treat per-field-class tiers as consumer-set until a shipped gate corroborates them. Reconciled across galaxy CLAUDE.md/MEMORY.md + extraction-confidence wiki + GSD protocol. See [[feedback_xray_per_field_confidence_mandatory]] · [[blueprint-vision-extraction-confidence]].
