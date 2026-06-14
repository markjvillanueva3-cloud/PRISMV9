---
name: reference_xray_ocr_closed_loop_training_2026_06_04
description: "Closed-loop OCR training engine (ensemble distillation + agreement-fraction calibration) — ready without delta (slot xray, 2026-06-04)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.072Z
aliases: reference_xray_ocr_closed_loop_training_2026_06_04
---


slot:xray, 2026-06-04. Operator: "delta won't be done for a while, if we're ready for closed loop training based off available resources and data, do so." Built the **closed-loop OCR training-data engine** — trains the print-READING stage today, no delta needed.

- `scripts/lib/ocr-training-loop-lib.mjs` (12 tests) + `scripts/blueprint-ocr-training-loop.mjs` (runner). Phases: CALIBRATE (synthetic perfect-GT → ensemble → P(correct|f)) → WEAK-LABEL (real prints → tiered pseudo-labels) → EMIT (`state/shared/ocr-training-loop/trainset.jsonl` for india's LoRA + `active-learning-queue.jsonl` + report).
- **Ensemble distillation**: the multi-VLM ensemble ([[reference_xray_vlm_ensemble_ocr_2026_06_04]]) is the TEACHER; corroborated dims = pseudo-labels; india's LoRA = student. xray produces+grades the DATA, india owns the fine-tune.
- **KEY: calibrate on agreement FRACTION f = k/n_models, NOT raw count k** (ensemble-size-invariant — survives fleet contention varying how many models live per print). Isotonic-monotone in f; reuses `poolAdjacentViolators` from `isotonic-calibrator.mjs` (no dup). Tiers gold/silver/bronze/reject by expected-accuracy floors 0.85/0.65/0.45.
- **P1 caught in 3-of-3 (arm C) + fixed**: first cut calibrated on k from a 3-model ensemble then applied to a 1-model-survived real print → emitted 8 zero-corroboration dims as trainable silver. Fix: fraction model + a label is trainable ONLY if n_models≥2 (`MIN_ENSEMBLE_FOR_CORROBORATION`); a single-model dim → `no_corroboration` tier, routed to review. Regression test: 1-model run mints ZERO trainable.
- **Live proof**: real extrude_punch print, 2 warm models → calibration f=0.5→0.57, f=1.0→0.90 (monotone), 8 gold trainable labels emitted; flagged UNDER-POWERED (<50 samples). 1-model survival → 0 trainable (fail-safe).
- Honest limits: synthetic→real OOD transfer (mustHumanVerify gate); under-powered calibration under daemon contention. Next: accumulate calibration across runs to reliable≥50; wire cadDispatcher/prism_ai action.

Wiki [[ocr-closed-loop-training-ensemble-distillation]]. Soul-honored: no re-OCR of the 257K corpus (bounded operator prints only).
