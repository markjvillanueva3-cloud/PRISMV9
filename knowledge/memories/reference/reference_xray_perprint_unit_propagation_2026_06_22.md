---
name: reference_xray_perprint_unit_propagation_2026_06_22
description: "Per-print unit propagation for multi-page blueprint OCR — anchor the title-block unit, force it across pages 2+ (principled supersede of the global --force-units band-aid). Corroboration-gated so it is metric-safe."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.276Z
aliases: reference_xray_perprint_unit_propagation_2026_06_22
---


# Per-print unit propagation (xray, U-XRAY-PERPRINT-UNITS, 2026-06-22, commit 463b1d8fa1)

**Problem:** multi-page JM drawing PDFs lose the title block on pages 2+, so the VLM GUESSES units there and emits wrong-scale weak labels (a `.94in` dim read as `0.94mm` — a 25.4x scale error in training labels). The earlier band-aid forced a GLOBAL `--force-units in` (correct for the inch-dominant JM corpus, WRONG for a rare metric print — every page forced to inch). See [[reference_post_ship_blueprint-vision-ocr-u-xray-nightly-force-units]].

**Fix (auto mode, when `--force-units` NOT set):** detect the print's unit from the FIRST OCR'd page that declares a confident title block (usually page 1) and force it on every later page of the SAME print, via the EXISTING authoritative `forceUnits` channel in `extractDimension`. Inch AND metric, one OCR pass, zero re-OCR. **No change to `extractDimension`'s precedence** (`forced > per-dim d.unit > drawing title-block units`) — surgical (R8). Explicit `--force-units` stays authoritative (the cron path is byte-equivalent); `PRISM_OCR_PER_PRINT_UNIT_DISABLE=1` reverts.

**Two pure helpers** in `scripts/lib/ollama-vision-extract-lib.mjs`:
- `resolvePageTitleBlockUnit(per_model_runs)` -> `"in"|"mm"|null` — consensus title-block unit across the ensemble's per-model extractions (reads `extraction.units` -> `title_block.units` -> `unit_resolution.drawing_units`). Majority wins; tie/conflict -> null (never anchor on a disagreed guess); `null`/`"mixed"` abstain.
- **CORROBORATION GATE** (scrutiny P2, closed in the same commit): a vote counts ONLY when the `title_block` ALSO carries an identity field (`part_number`/`drawing_number`/`title`). A dimension-only continuation page where the VLM hallucinated a bare `units` value must NOT anchor the whole print — otherwise a metric print whose page-1 is mis-read as inch forces EVERY page to inch. This is what makes the anchor safe for the metric case.
- `pageForceUnit(explicitForce, printAnchor)` -> `"in"|"mm"|null` — explicit operator `--force-units` wins, else the propagated per-print anchor.

**Wired (apply-to-all, R15)** into the two multi-page per-page OCR loops:
- `scripts/blueprint-ocr-training-loop.mjs` (the closed-loop training corpus feeding india's LoRA). Forward-only; late-anchor logged (R12) so the rare title-block-on-a-later-page case is measurable, not silent.
- `scripts/validate-perfect-parts.mjs` (recall validation, non-tiling branch) — clone-don't-fork.

**Key facts for future xray work:**
- The production `.ts` OCR engines (`BlueprintVisionOCREngine`) do NOT call `runEnsembleOverImage` — they OCR ONE image with their own `convertTitleBlock`. The multi-page-of-one-print gap is purely the `.mjs` VLM training pipeline, not the production single-image surface.
- `runEnsembleOverImage().per_model_runs[].extraction` carries the parsed title-block unit on `extraction.units` (mirror of `title_block.units`). `fused` does NOT carry a top-level drawing unit — read from `per_model_runs`.

**Open follow-ups (scoped):**
- `validate-perfect-parts.mjs` TILING branch (`--tile`) does not yet propagate per-print units (tiles fragment the title block; currently forces `assumeUnits:"in"`). Harder — tile-level title-block detection.
- Do NOT flip `extractDimension`'s per-dim-vs-title-block precedence: ASME dual-dimensioning means a per-dim unit CAN legitimately differ from the title block, so page-1 per-dim guesses are left to the existing precedence.

Tests: +25 reference-value cases in `ollama-vision-extract-lib.test.mjs` (majority/tie/abstain/alias/both-fallbacks/corroboration/metric-invariant). Suite 121/121. Per-file 2-arm scrutiny PASS/PASS. Related: [[feedback_check_units_first]] · [[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]].

## LIVE VALIDATION (2026-06-22, R15 step 3 — the corroboration gate working on real VLM output)
Ran the real 2-model ensemble on `extrude_punch.png` and called `resolvePageTitleBlockUnit` on the live `per_model_runs`:
- `qwen3-vl:8b-instruct`: `units=in`, `title_block.part_number=null` (8 dims) -> vote does NOT count (bare units, no identity).
- `qwen2.5vl:7b`: `units=in`, `title_block.part_number="PRISM_2475-037_Extrude_Punch"` (4 dims) -> vote COUNTS.
- **Resolved anchor: `in`** (from the corroborated model only). `pageForceUnit(null,'in')='in'`; `pageForceUnit('mm','in')='mm'` (explicit override wins).
This is the gate's exact purpose, confirmed live: it ignored the bare-units guess and trusted the model that read a real title-block identity.

## STALE-ASSUMPTION CORRECTIONS (2026-06-22, R12)
- **GPU IS usable for vision (prior "blocked under qwen2.5-coder:32b @ 54.7GB" was stale/transient).** With ~41GB free, a single vision model AND the 2-model ensemble both loaded + inferred fine alongside the fleet's code model. `scripts/probe-vision-model.mjs --model qwen3-vl:8b-instruct --pdf <print>` returned 20+ dims. Don't assume the GPU is blocked — PROBE it.
- **The drawing worklist is mostly SINGLE-page.** First 12 `corpus-worklist-drawing.txt` entries (D22706 series) are all 1pp; the multi-page PDFs are the scanned-document set (mostly blank, ensemble-fails). The "96% multi-page" figure (see [[reference_xray_docustrata_96pct_unverified]]) is contradicted by this sample -> per-print propagation's LIVE impact on THIS worklist is small (most drawings = page 1 self-detect). It still matters for genuine multi-page drawing SETS + is a strict no-op safety improvement on single-page.

## BACKLOG STATUS (read-the-body findings, 2026-06-22)
- **P1.6 (recall-first fusion) = ALREADY DONE.** `fuseEnsemble` keeps singletons (labels `status:"singleton"`, `hallucination_candidate:true`); `buildTrainsetRow` keeps them as non-trainable labels; `classifyActiveLearning` routes any print with singletons to the AL queue. No drop -> no fix needed (R8 dedup).
- **P2.9 (per-feature-type calibration) = DORMANT-without-volume.** The cron calibrates on ~48 samples (`--calibrate-count 24`), already borderline vs `MIN_RELIABLE_SAMPLES`. Splitting per-type makes every type under-powered -> all fall back to global -> zero live effect. Blocked on a much larger calibration sample set; building it now would be a dormant feature (fails R15 "validate on live data").
- **P1.5 (layout-aware region routing) = next buildable P1, now GPU-validatable.** Region classifier + per-region routers (view->VLM, table->table-parser, title-block->field-parser).
