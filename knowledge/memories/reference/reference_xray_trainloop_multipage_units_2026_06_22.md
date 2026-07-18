---
name: reference_xray_trainloop_multipage_units_2026_06_22
description: closed-loop OCR training PHASE-2 OCRs each page independently, so multi-page prints (96% of JM corpus) lose the title block on pages 2+ -> wrong-unit weak labels; --force-units in fixes it (reuses the tiling forceUnits chain). xray commit 141ce06eb8
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.278Z
aliases: reference_xray_trainloop_multipage_units_2026_06_22
---


**U-XRAY-TRAINLOOP-FORCE-UNITS (slot:xray, 2026-06-22, commit `141ce06eb8`).** `scripts/blueprint-ocr-training-loop.mjs` PHASE-2 (weak-label real prints) OCRs each PAGE of a multi-page print INDEPENDENTLY (`for (const {page,png} of rast.pages)`). The title block -- which carries the drawing's unit system -- lives on ONE page; pages 2+ lose it, so the VLM guesses the unit and emits WRONG-SCALE weak labels (a `.94` inch dim tagged `unit:mm` -> 0.94mm instead of 23.876mm) into the trainset. **96% of the JM corpus is multi-page** ([[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]]), so this silently corrupted a large fraction of training-data unit values.

**The general lesson (sibling of the tiling units fix):** any pipeline that OCRs a multi-page or multi-region print **page-by-page / region-by-region** structurally STRIPS the title block from most of those pieces, so the global drawing units must be forced authoritatively on every piece -- a per-piece VLM unit guess is unreliable. This is the SAME title-block-loss class the tiling forceUnits fix solved ([[reference_xray_tiling_extract_e2e_bugs_2026_06_22]] -- tiles lose the title block; this -- multi-page pages lose it). Whenever you split a print for OCR, force the units.

**Fix** -- a `--force-units <in|mm>` flag threads the already-shipped `forceUnits` override into the PHASE-2 per-page `runEnsembleOverImage` call. JM is INCH, so a corpus run uses `--force-units in`. Default null = unchanged fallback behavior (no regression); PHASE-1 calibration (synthetic prints with known units) is untouched. Reuses the proven forceUnits chain (`extractDimension`/`parseVisionResponse`/`runEnsembleOverImage`, additive, 95 extract-lib tests). Live-verified: page-2 `.94` tagged `unit:mm` -> with `--force-units in` resolves to 23.876mm; fallback-only keeps the VLM's wrong 0.94mm.

**Operational follow-up:** the corpus training run (nightly cron + manual) should pass `--force-units in` for the JM (inch) corpus so the trainset stops accumulating wrong-scale unit labels on multi-page prints. The forceUnits override exists across the OCR chain + tiling (`--force-units` on `vision-tiling-extract.mjs`) + validation; the training loop is now the 3rd consumer.

Sibling memories (same session): [[reference_xray_tiling_extract_e2e_bugs_2026_06_22]] · [[reference_xray_tiling_clique_not_unionfind_2026_06_22]] · [[reference_xray_gdt_normalize_dormant_fcf_2026_06_22]]. Pipeline: [[reference_xray_ocr_yield_mechanics_2026_06_10]].
