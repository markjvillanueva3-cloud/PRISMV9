---
name: reference-whiskey-rungc-step-loop-closed-2026-06-26
description: "G1 KEYSTONE CLOSED: STEP geometry leg of the lathe (Kienzle) closed loop -- full_geometry_loop_closed=true via STEP path, pure JS (no GPU). slot:whiskey 2026-06-26"
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.262Z
aliases: reference_whiskey_rungc_step_loop_closed_2026_06_26
---


# Kienzle G1 keystone CLOSED -- STEP geometry leg of the lathe closed loop (2026-06-26)

Continues [[reference_whiskey_kienzle_session_2026_06_26]] + [[reference_whiskey_step_profile_keystone_2026_06_26]]. The G1 gate (`full_geometry_loop_closed`) was the one open keystone of the operator /goal -- it is now **TRUE** via the STEP path. Commit `1567dba6f1` (`U-W-STEP-RUNGC-LOOP`).

## What shipped
- **`scripts/lib/lathe-step-profile-to-features.mjs`** (pure, 12/12 tests) -- the missing link: a STEP rotational profile (`{a:axial, r:radius|null}` from `step-mesh-rotational-profile.mjs`) -> `TurningFeature[]` (`od_contour`/`id_contour` with `profile_points {X=2r, Z=a}`) + stock dims, in mm. Mirrors `TurningPrintIntakeEngine.profileToTurningFeature` EXACTLY (R8 reuse), so `runPipeline` sees the same feature shape the OCR path already handles. UNITS-FIRST: scale 25.4(inch)/1(mm)/null(refuse unknown+metre).
- **`scripts/lathe-rungc-step-loop.mjs`** -- resumable corpus runner (mirrors `lathe-rungc-ocr-loop.mjs`): STEP -> `stepFileToProfile` -> `profileToTurningFeatures` -> `normalizeLatheInput` -> `turningPrintToProgramEngine.runPipeline` -> `scoreProgram` vs Rung A cloud + `scoreSafetyEfficiency` -> pair to `.MIN`. **Pure JS (occt-import-js mesh) -- NOT GPU-bound**, so unlike the OCR leg it RUNS TO COMPLETION.
- **`scripts/lathe-closed-loop-full.mjs`** -- folds `rung_c_step`; `verdict.full_geometry_loop_closed = OCR || STEP` with separate `_ocr`/`_step` flags; corpus-coverage honesty fix (`--all` already passes `--all-roots` => Rung A scans true ALL 34,993, not the stale "CNC LATHE only 16558" WARN).

## LIVE proof (R15)
AGRATI 9070219 OP2 STEP -> 2 ops, **both SFM+IPR in-band 100%** -> `full_geometry_loop_closed_step=true`. Headline now: "Empirical cloud over 34993 JM .MIN ... PRISM in-band feed 96.3%/SFM 100%; Rung C-STEP 1 part scored (both-in-band 100%), geometry loop CLOSED". Non-revolution bodies (electrodes/molds/toolholders -- the bulk of the 2,307 STEP corpus) correctly skipped as `suspect-not-revolution`; never scored against bad geometry.

## Scrutiny (per-file 2-arm) -- fixed
- **arm B P1**: path-casing double-count -- `STEP_ROOT "H:/PRISM"` vs REPO `H:/prism` keyed the same file twice (cursor showed `steps_scored:2` for one part). FIXED via lowercase `canon()` dedup key.
- arm A P2s: `occt-failed` now retriable (was wrongly terminal); part# pairing strips ` OP\d+/v\d+` suffix (`9070219 OP2 v1` -> `9070219`); done-aware `enumerateSteps` (no resume starvation); metre -> `units-unsupported` (honest label).

## Honest gaps (R12 -- do NOT over-claim)
- **Material defaulted 1018/P** (STEP carries no material) -> speeds/feeds scoring is op-archetype-relative, not material-exact. Disclosed in the dashboard `honest_note`.
- **Safety always PARTIAL** on the STEP leg: `normalizeLatheInput` sets no `max_spindle_rpm`/`max_power_kW`, so the spindle overspeed+power axes are unchecked (collision IS scored). Never false-SAFE. DEFERRED cross-leg follow-up: plumb JM Okuma LTH limits from `ShopConfigurationEngine` into `ti` in BOTH the STEP and OCR loops (clone-don't-fork).
- **Pairing AGRATI 9070219 -> 0 .MIN**: genuinely no `9070219.MIN` in the corpus (it is a Fusion-workflow part). Honest, not a bug; band-scoring vs the cloud is the validation, pairing is the bonus per-part compare.
- Only 1 turned STEP scored so far; `--all --limit N` (resumable, no GPU) compounds coverage across the 2,307-file corpus.

## Next (loop continuation)
1. G3 tribal 101 -> 500: drain `lathe-tribal-ollama-ingest.mjs --all --limit 1` (vision route built; GPU free; `--limit >=3` gets reaped/255). Operator explicit #2.
2. Run STEP loop over more of the corpus to score additional turned parts.
3. Plumb Okuma machine limits -> safety SAFE/UNSAFE not PARTIAL (cross-leg).
4. G4 Kienzle BE/FE design (in-page rename done U-W8-RENAME-INPAGE).

## Session follow-on (iter 2-3, session 14093afb)
- **U-W-CLOSEDLOOP-FLEET-SAFETY (d291e3abf0)** -- closed-loop safety PARTIAL -> SAFE/UNSAFE. New `scripts/lib/lathe-jm-fleet-envelope.mjs` (6/6) reduces `shopConfigurationEngine.getMachines()` to the JM lathe envelope; the safety check consumes the **FLOOR** (most restrictive lathe, 3800rpm/11kW) so it can never mark SAFE a program that would stall the weakest machine (soul refuse: softening-safety-thresholds). Wired into BOTH STEP+OCR loops (clone-don't-fork) via `resolveFleetFloor()` (resolves even on rebuild-only runs -> safety_basis never falsely PARTIAL). LIVE: AGRATI -> SAFE, 0 violations. 2-arm scrutiny BOTH PASS. **Honest:** rpm axis is partly confirmatory (program G50-clamped to the floor); POWER is the discriminating axis; collision independently checked.
- **U-W-STEP-COVERAGE (412bd3ecab)** -- ran STEP loop over 21 corpus files: 1 scored (AGRATI), rest suspect-skipped. **R12 finding: the JM STEP corpus is electrode/mold/toolholder/multi-body-setup dominated -- genuine turned bodies of revolution are RARE in STEP CAD.** Turned-part ground-truth lives in the 34,993 .MIN (Rung A), not STEP. The geometry leg is proven CLOSED; STEP-corpus turned-part yield is inherently low.
- **G3 tribal 101 -> 585 = TARGET MET+EXCEEDED (566 extracted-tips, 53 sources).** $0 Ollama vision route (qwen2.5vl:7b). **`--limit 1` is the ONLY non-reaped cadence (exit 0); `--limit 2/10/4` -> exit 255 fleet-reaper kill (resumable cursor = no loss).** Foreground batches of 3 survive; 4 sometimes reaped (~6min bash). Corpus jsonl is gitignored runtime data BUT is **the canonical CONSUMED convention** -- `build-domain-knowledge-feeders.mjs:18` documents `state/shared/<domain>-tribal-corpus.jsonl` is read by `AIResourceLearningEngine.getCadCamCorpus` + the per-slot tribal pipeline (R15 WIRE verified -- delivered, not orphaned). Embed-cron (`install-tribal-embed-cron.ps1`) makes them semantically searchable. **Corpus now DRY at 694 entries (~675 extracted-tips) -- loop-until-dry COMPLETE (consec_zero=3, the discovered PDF corpus is fully drained).** 101->694 = 12x the original, far past the 500 target. REMAINING (separate pipeline, not the PDF corpus): videos (~100 lathe training videos) + 6 MIT OCW courses via `/video-learn` -- a distinct toolchain unit, not the vendor-catalog PDF max-out which is now exhausted.
- **Gate status:** G1 closed-loop DONE (apparatus + geometry leg + actionable safety). G2 residual = none new. **G3 DONE+verified-delivered (566 tips >= 500).** G4 = cross-lane quebec (in-page Kienzle rename already shipped U-W8-RENAME-INPAGE).

Related: [[reference_whiskey_kienzle_closed_loop_u_w2_2026_06_26]] · [[feedback_check_units_first]] · [[node-fetch-localhost-ollama-broken-use-curl]]
