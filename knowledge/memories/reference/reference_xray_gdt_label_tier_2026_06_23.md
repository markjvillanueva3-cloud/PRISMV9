---
name: reference_xray_gdt_label_tier_2026_06_23
description: U-XRAY-GDT-LABEL-TIER -- GD&T frames now become TRAINABLE LoRA labels (image -> FCF text), not just counts. The closed-loop OCR corpus is no longer dimension-only. Full vertical slice buildTrainsetRow -> runner JSONL -> LoRA pairs, live-validated end-to-end.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.273Z
aliases: reference_xray_gdt_label_tier_2026_06_23
---


**U-XRAY-GDT-LABEL-TIER shipped (slot:xray, cad-fusion-live-ms0, commit `abc63f4874`, 2026-06-23).** Builds directly on [[reference_xray_ensemble_nondim_union_2026_06_23]] (same session).

**The gap it closes:** U-XRAY-ENSEMBLE-NONDIM-UNION made `fuseEnsemble` carry gd&t/notes, and `buildTrainsetRow` recorded COUNTS only -- so GD&T frames never became trainable labels. The closed-loop OCR corpus could train DIMENSION reading but never GD&T reading (the operator's exact "delta missed FEATURES" concern). This makes every consensus GD&T frame a trainable label, end-to-end to the LoRA training pairs.

**Vertical slice (R13 logical order, R15 reach the destination -- the lesson from the prior unit's orphan):**
- `scripts/lib/ocr-training-loop-lib.mjs`: new pure `buildFcfText(g)` renders a canonical ASCII FCF ground-truth string (`"position 0.1mm MMC [A|B]"`; symbol + tol+unit + material_condition + `[datums]`; falls back to verbatim `raw_text`; `""` on malformed). `buildTrainsetRow` emits `gdt_labels[]` -- each fused.gdt frame tiered by the **SAME** corroboration-possible gate + `assignLabelTier(agreement_fraction, calibration)` the dimensions use (`agreement_fraction = corroboration/n_models`); `trainable = corroboration_possible && (gold||silver)`; a single-model run mints ZERO trainable gdt labels (mirrors the dim regression guard). Each label tagged `calibration_basis:"dimension-agreement"` (R12 -- the isotonic curve is dimension-derived, NOT GD&T-specific; per-feature-type calibration is a SEPARATE future unit, dormant-without-volume). `aggregateTrainingLoop` rolls up `trainable_gdt_labels`.
- `scripts/blueprint-ocr-training-loop.mjs` (runner): persists trainable `gdt_labels` into the trainset JSONL row; appends a row when EITHER trainable dims OR trainable gdt labels exist (was dim-only); surfaces `this_run_trainable_gdt_labels` in the report.
- `scripts/lib/trainset-to-lora-pairs.mjs`: emits one `{extractionType:"gdt", groundTruthValue:fcf_text, context:...}` LoRA pair per trainable gdt_label (guard relaxed to handle a gdt-only row; **dim path byte-identical**).

**Validation:** ocr-training-loop-lib 38/38 (9 new) + trainset-to-lora-pairs 12/12 (4 new) -- happy + >=3 failure + >=2 adversarial (single-model zero, singleton-flagged-silver, gdt-only row, malformed, mixed dim+gdt distinct pairIds). Per-file 2-arm scrutiny each file (all PASS, 0 P0/P1) + end 3-of-3 (A+B+C all PASS, 0 findings). **LIVE DESTINATION PROOF through the REAL modules (no VLM needed):** a corroborated GD&T frame (2 of 2 models) -> `buildTrainsetRow` trainable gdt_label (count 1) -> `trainsetToLoRAPairs` -> LoRA pair `{type:"gdt", gt:"position 0.1mm MMC [A|B]"}` (`DESTINATION REACHED: true`). Blast-radius traced: `xray-trainset-to-lora.mjs` (dedup key=`key#p<page>`, one combined row/page, no double-count), `build-ocr-gold-verify-package.mjs:76` (array-guards `r.labels`, gdt-only `labels:[]` safe), `blueprint-trainset-curate.mjs` (reads a DIFFERENT file -- out of blast radius).

**KEY DESIGN (do not regress):** GD&T tiering REUSES the dimension calibration + gate (R8 -- one trust mechanism across all label types), with `calibration_basis` flagging the borrow. The FCF ground-truth string is stamped ONCE by `buildFcfText` onto the label (`fcf_text`) so the pair builder reads it without a cross-import.

**NEXT (in-lane, code-only, queued):**
1. Per-region gd&t/notes full-schema merge for the dense-rescue case (`mergeRegionResults` is dims-only -> gdt by FCF identity) -- still the documented open thread from the region-routing arc.
2. GD&T operator-confirm surface in `build-ocr-gold-verify-package.mjs` (deferred P2 -- it is dimension-only; GD&T pseudo-labels currently flow to LoRA without the operator gold-verify gate dims have).
3. Per-feature-type GD&T calibration (P2.9) -- blocked on calibration sample volume; do NOT build until volume grows (fails the "measured lift" gate otherwise).

**Operator/data-gated (unchanged):** P2.10 stage GD&T source PDFs in `resources/blueprint-gdt-corpus/`; non-zero LIVE gdt capture from real dense JM scans is VLM-read-gated (the documented ~15% hard-scan ensemble-fail class), NOT a wiring issue.

Related: [[reference_xray_ensemble_nondim_union_2026_06_23]] · [[reference_xray_blueprint_lora_stage_2026_06_04]] · [[reference_xray_ocr_yield_mechanics_2026_06_10]] · backlog `knowledge/wiki/architecture/blueprint-reading-improvement-backlog-2026-06-19.md`.
