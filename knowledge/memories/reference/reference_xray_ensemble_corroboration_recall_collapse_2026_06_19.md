---
name: reference_xray_ensemble_corroboration_recall_collapse_2026_06_19
description: "CORRECTED — the validate-perfect-parts recall=0 is NON-DRAWING print mis-resolution, NOT corroboration collapse; OCR reads clean drawings well (24 dims). Corroboration does NOT drop the read (singletons are included)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.272Z
aliases: reference_xray_ensemble_corroboration_recall_collapse_2026_06_19
---


slot:xray, 2026-06-19. **THIS MEMORY WAS REWRITTEN — its first version (claiming the 2-model
corroboration quorum collapses the OCR read 24->1-2) was WRONG (R12 self-correction). Verified facts:**

**Corroboration does NOT collapse the read.** `vision-ensemble-fuse.mjs` returns `fused.dimensions` =
the FULL cluster array (corroborated + partial + SINGLETON, sorted corroboration-desc); lines 41-42
only COUNT corroborated vs singleton, they do not filter the returned array. `validate-perfect-parts.mjs:147`
maps `res.fused.dimensions` (the FULL set) -> `ocrDimsMm`. So `ocr_dims_mm`=1-2 means the ensemble
GENUINELY produced 1-2 dims on those prints, not a filter artifact.

**Why those 4 perfect-parts scored recall=0 (the REAL cause):** the resolved "print" files are
NON-DRAWING scans. `find-perfect-parts` stores filenames; the PN-stem glob resolved files like
`Docustrata/Untitled Folder/Scanned Document - 11_18_2020 6_17 AM.pdf` -- scanned PAPERWORK/routing
docs, not engineering drawings. Probing that scan (8b): raw_len=456, all-null title block, 0 dims,
and `--enhance` (deskew+denoise+binarize) changed NOTHING (it is contentless to the VLM, not a quality
issue). So the OCR pipeline is reading a non-drawing -> 0 dims -> recall=0. The harness already
disclosed this caveat ("join stores filenames not paths ... spot-check the print depicts the part").

**The OCR pipeline READS CLEAN DRAWINGS WELL** -- D22706-12.pdf (a real drawing) -> parse_ok, 24 dims
(single 8b probe). Synthetic clean prints: F1 0.9383 / recall 1.0 (ocr-closed-loop bench). So
print-reading is largely SOUND on actual drawings.

**Dead-ends ruled out this session (all empirically, R12):** qwen3-vl:32b (empty/slow, rejected) ·
scan-preprocessing (--enhance no-op; pdf-to-png already has --preprocess/--deskew; clean drawings need
no enhance, contentless scans can't be enhanced) · GT-normalization (validate GT is already
distinct-callout-class, deliberately designed, line 179) · corroboration-collapse (DISPROVEN here).

**THE actual improvement levers (verified):**
1. **Print-resolution validity** — gate validate-perfect-parts' resolved print through the EXISTING
   page-classifier (page-classify.mjs / classifyImage), skip a confident non-drawing instead of
   scoring it recall=0. Makes the TRUE-test honest (measure OCR on real drawings only). SAFE/additive.
2. **find-perfect-parts resolution** — spot-check/verify the PN-stem glob picks a DRAWING, not paperwork.
3. (Open) whether the production print-reading CONSUMER (delta) uses the full fused read or a
   corroborated-only subset -- NOT yet verified; if delta filters to corroborated-only that is a real
   "missed dims" seam (the full read incl. singletons is available in fused.dimensions).

Evidence: state/shared/ocr-training-loop/perfect-parts-validate/truetest-results.jsonl;
scripts/probe-vision-model.mjs. Related: [[reference_xray_corpus_continuous_and_gdt_tribal_plan_2026_06_19]].
