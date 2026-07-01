---
name: reference_xray_gdt_gold_verify_2026_06_23
description: U-XRAY-GDT-GOLD-VERIFY -- the GD&T operator-confirm surface (VERIFY-gdt.csv) so GD&T pseudo-labels get the same human gold-verify gate dimensions have before they train. Closes the operator-confirm story for the GD&T closed-loop arc. 4th + final GD&T unit this session.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.273Z
aliases: reference_xray_gdt_gold_verify_2026_06_23
---


**U-XRAY-GDT-GOLD-VERIFY shipped (slot:xray, cad-fusion-live-ms0, commit `3a330195d6` + ASCII follow-up, 2026-06-23).**

**The gap:** U-XRAY-GDT-LABEL-TIER made GD&T frames trainable LoRA labels, but `build-ocr-gold-verify-package.mjs` (the operator gold-verify packager) was DIMENSION-ONLY -- so GD&T pseudo-labels reached the LoRA trainer WITHOUT the human gold-verify gate dimensions have (the operator confirms each extracted value against the print before it becomes a GOLD training label). That gate is "the gate to 100% print-reading accuracy" per the package README. This closes it for GD&T.

**The fix (single file + test):** new pure `buildGdtRecords(rows)` mirrors `buildDimRecords` exactly (R8) but reads `r.gdt_labels` (which the runner persists since U-XRAY-GDT-LABEL-TIER) -> one CSV record per trainable GD&T frame: `print/page/gdt_no/symbol/fcf_text/tier/agreement_fraction/corroboration/calibration_basis` + operator `CORRECT_Y_N` + `CORRECT_fcf_if_wrong`. `main()` writes `VERIFY-gdt.csv` alongside `VERIFY-dimensions.csv` (header-only when empty -- honest "GD&T review is part of the flow, none read this batch"); README gains a GD&T section; console reports the count. **Surfaces `calibration_basis: dimension-agreement`** so the operator sees the GD&T tier is dimension-calibrated, not GD&T-specific (R12). Read-only on PRISM state (copies out to the dest package folder, never writes a GOLD label).

**Validation:** 9/9 tests (3 new: per-frame records sorted + fcf_text/calibration_basis captured + operator cols blank; no-gdt/non-array/null safe; README surfaces count). Per-file = end 3-of-3 (single file; A+B+C all PASS, 0 P0/P1). 2 P2s: a non-ASCII section banner (FIXED in the ASCII follow-up commit) + a dead `distinctPrints` return (harmless -- the dim path's distinctPrints is the superset, so the PDF-copy loop misses no print). **LIVE-validated:** the real script on a gdt trainset row produced `VERIFY-gdt.csv` = `DEMO.pdf,1,1,position,position 0.1mm MMC [A|B],silver,1,2,dimension-agreement,,` (the operator-confirm row, blank Y/N + correct-fcf columns).

**THE COMPLETE GD&T CLOSED-LOOP (4 units this session, all cad-fusion-live-ms0):**
1. `a783df2419` ENSEMBLE-NONDIM-UNION -- fuse CARRIES gd&t (was dropping it). [[reference_xray_ensemble_nondim_union_2026_06_23]]
2. `abc63f4874` GDT-LABEL-TIER -- gd&t becomes TRAINABLE LoRA labels. [[reference_xray_gdt_label_tier_2026_06_23]]
3. `e7fd24791b` REGION-NONDIM-RESCUE -- region routing RECOVERS gd&t on dense pages. [[reference_xray_region_nondim_rescue_2026_06_23]]
4. `3a330195d6` GDT-GOLD-VERIFY (this) -- operator CONFIRMS gd&t before it trains.
Net: extraction -> training -> dense-page recovery -> operator-confirm. The GD&T closed loop is whole; it was dimension-only at session start (the operator's "delta missed FEATURES" concern).

**NEXT (in-lane, code-only):**
1. Per-feature-type GD&T calibration (P2.9) -- calibrate P(correct | agreement) PER GD&T type instead of borrowing the dimension curve. BLOCKED on calibration sample volume (the cron calibrates on ~48 samples, already borderline; per-type splits make every type under-powered). Do NOT build until volume grows -- it fails the measured-lift gate.
2. Then descend the NEVER-IDLE ladder: FIXES (failing tests/tsc/regressions) -> WIRINGS (audit-unwired-engines) -> GHOST -> MISC-TASKS.

**Operator/data-gated (unchanged):** P2.10 stage GD&T/Y14.5 PDFs in `resources/blueprint-gdt-corpus/`; non-zero LIVE gd&t from real dense JM scans is VLM-read-gated (~15% hard-scan ensemble-fail); region-route default-on needs a multi-part callout-GT corpus (perfect-parts has 1 scoreable part).

Related: [[reference_xray_ensemble_nondim_union_2026_06_23]] · [[reference_xray_gdt_label_tier_2026_06_23]] · [[reference_xray_region_nondim_rescue_2026_06_23]] · [[reference_xray_stepped_bore_prompt_fix_rerun_2026_06_16]] (the gold-verify package found a real systematic VLM miss on its first batch -- this kind of operator feedback is the whole point).
