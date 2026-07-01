---
name: reference_xray_region_nondim_rescue_2026_06_23
description: U-XRAY-P15-REGION-NONDIM-RESCUE -- region routing now recovers GD&T/notes/profiles/surface_finishes on the dense-rescue path (full-page floor fails -> region crops recover them), not just dimensions. Closes the last documented honest limit of the P1.5 region-routing arc. Completes the 3-unit GD&T-recall arc this session.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.277Z
aliases: reference_xray_region_nondim_rescue_2026_06_23
---


**U-XRAY-P15-REGION-NONDIM-RESCUE shipped (slot:xray, cad-fusion-live-ms0, commit `e7fd24791b`, 2026-06-23).** Third + final unit of this session's GD&T-recall arc.

**The gap it closes (documented honest limit from the P1.5 region-routing arc):** when a dense page's full-page floor FAILS (0 dims AND 0 gdt -- the 3400x2200 VLM-internal-resize limit), region routing recovered the DIMENSIONS via crops but `mergeRegionResults` was dims-only, so the hybrid fused took its non-dim fields from the FAILED floor -> GD&T/notes/profiles/surface_finishes stayed EMPTY on exactly the hardest pages (dense, where cropping is the whole point). This recovers them.

**The fix:**
- `scripts/lib/vision-ensemble-fuse.mjs`: export `NON_DIM_KEY_FNS` (the 4 per-field identity keys `gdtKey/noteKey/profileKey/surfaceFinishKey`) so a cross-SOURCE union de-dupes by the SAME identity the ensemble fuse uses -- one identity definition, not a fork (R8).
- `scripts/lib/region-glue-lib.mjs`: new pure `mergeRegionFused(fullPageFused, perRegionFused, fields)` -- **recall-first** union of the non-dim fields across the floor + every per-region fused, de-duped by NON_DIM_KEY_FNS. Floor is the FIRST source (wins a key tie); null dropped, primitives deduped by `"prim:"+value`, un-keyable objects KEPT (never drop a read label); does NOT re-corroborate across regions (each entry keeps the corroboration/n_models it earned in its own region's ensemble fuse -- cross-region co-occurrence is a different signal). `buildRegionRoutedFused` gains `opts.regionFused` -> `Object.assign`s the merged non-dim onto the output; byte-identical when absent (back-compat).
- `scripts/region-classify.mjs`: `extractWithRegionRouting` captures each region's full `fused` (was dims-only at the perRegion.push) + passes `regionFused: perRegion.map(p=>p.fused).filter(Boolean)`.

**REGRESSION caught DURING dev (the load-bearing lesson):** the union INITIALLY dropped a string-note stand-in -- the existing region-classify test 9 (`r.fused.notes = ["NOTE A"]`, a STRING, line 148) failed because my first cut filtered non-object items. Real notes are objects, but a STRING note is still a label the floor read -> dropping it is a recall regression (the exact class this whole arc fights). FIX: made `mergeRegionFused` **recall-first** (primitives deduped by value + kept; un-keyable objects kept; only genuine null dropped). R12: fixed the CODE to be recall-first, NEVER weakened the preserved-notes assertion. The recall-first primitive test pins it.

**Validation:** region-glue-lib 30/30 (8 new: dense-rescue recovery, floor-wins-tie, distinct-kept, notes/profiles/finishes union, malformed no-throw, recall-first-primitive regression pin, end-to-end, back-compat) + region-classify 17/17 (test 9 now passes via recall-first code) + vision-ensemble-fuse 43/43. Per-file 2-arm + end 3-of-3 (A+B+C) all PASS, 0 P0/P1. No import cycle (region-glue -> vision-ensemble-fuse is one-way; the latter imports only leaf modules + has no top-level execution). Wired to the live consumer: region fused -> buildTrainsetRow -> trainset corpus.

**THE 3-UNIT GD&T-RECALL ARC (this session, all on cad-fusion-live-ms0) -- COMPLETE:**
1. `a783df2419` U-XRAY-ENSEMBLE-NONDIM-UNION -- fuseEnsemble was silently DROPPING gd&t/notes/profiles/finish; recall-first cross-model union added + counts wired to report. [[reference_xray_ensemble_nondim_union_2026_06_23]]
2. `abc63f4874` U-XRAY-GDT-LABEL-TIER -- GD&T frames become TRAINABLE LoRA labels (buildFcfText FCF ground-truth, tiered like dims, calibration_basis-honest) -> runner JSONL -> LoRA pairs. [[reference_xray_gdt_label_tier_2026_06_23]]
3. `e7fd24791b` U-XRAY-P15-REGION-NONDIM-RESCUE (this) -- region routing recovers gd&t/notes on dense-rescue pages.
Net: the closed-loop OCR corpus now captures + trains GD&T (was dimension-only) AND recovers it on the hardest dense pages.

**NEXT (in-lane, code-only, queued):**
1. GD&T operator-confirm surface in `build-ocr-gold-verify-package.mjs` (deferred P2 -- it is dimension-only; GD&T pseudo-labels now flow to LoRA without the operator gold-verify gate dims have).
2. Per-feature-type GD&T calibration (P2.9) -- BLOCKED on calibration sample volume; do NOT build until volume grows (fails the measured-lift gate).
3. Then descend NEVER-IDLE ladder (FIXES / WIRINGS / GHOST / backlog).

**Deferred P2s (logged, non-blocking):** dense-rescue `summary.n_models` = best-region depth (pre-existing, per-entry tier is correct); un-keyable-object KEEP branch unreachable for normal shapes (keyFns total); pairId/log-count nits from units 1-2.

**Operator/data-gated (unchanged):** P2.10 stage GD&T/Y14.5 PDFs in `resources/blueprint-gdt-corpus/`; non-zero LIVE gdt capture from real dense JM scans is VLM-read-gated (~15% hard-scan ensemble-fail), NOT wiring; multi-PART region-route default-on decision needs a callout-GT corpus (perfect-parts has 1 scoreable part).

Related: [[reference_xray_ensemble_nondim_union_2026_06_23]] · [[reference_xray_gdt_label_tier_2026_06_23]] · [[reference_xray_p15_region_routing_arc_complete_2026_06_22]] · backlog `knowledge/wiki/architecture/blueprint-reading-improvement-backlog-2026-06-19.md`.
