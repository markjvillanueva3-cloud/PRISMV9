---
name: reference_oscar_sfc_full_assessment_2026_06_15
description: Exhaustive SFC feature assessment (3-agent enumeration over all 11 specs + 3 milestones + 38 roadmap units + ~50 memories, repo-verified) 2026-06-15. SFC galaxy is ~95% built. The genuine remaining work + the HARD vendor-data reality (G-Wizard/HSMAdvisor don't persist S&F -> live comparison for "every input" is structurally impossible; published refs ~192 cells, OCR-expandable). U-FT-13 shipped; SFC-FULLTUNE 13/14+CRON.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.705Z
aliases: reference_oscar_sfc_full_assessment_2026_06_15
---


# SFC full feature assessment + training reality (2026-06-15, slot:oscar)

Operator directive: "continue building all SFC features ever planned (assess if outdated), then
finish the SFC closed-loop training over EVERY logical input with G-Wizard/HSMAdvisor comparison
(billions of combos), using Hermes/Ollama/RTX-6000/CPU + the full PSN stack." Drove a 3-agent
enumeration (general-purpose sonnet) over ALL sources, repo-verified.

## Verdict: the SFC galaxy is ~95% BUILT
- **OSCAR-SFC-9AXIS-MS0**: 14 units + 13 CSFH harness units -- ALL DONE.
- **PSAU-PPG-SFC**: ~13/14 closed-loop-learning engines DONE (outcome capture, provenance, LoRA
  inference gates, RAG warm-start, multi-hypothesis ranker, drift canary, few-shot new-material,
  E2E orchestrator). U-PPG-SFC-10 (PPGDialectHypothesisRanker) unverified.
- **SFC-FULLTUNE**: U-FT-01..10, 12, 13, 14, CRON DONE (this session shipped 09/12/13/14/CRON).
  **Only U-FT-11 remains (BLOCKED).** U-FT-13 = `e9bfa19067`.
- **Vendor comparison**: tri-comparator, per-vendor G-Wizard/HSMAdvisor published deltas, HSS/
  ceramic/CBN baselines, live adapters -- DONE (much on `main`, see worktree-divergence note).

## The genuine remaining BUILD items (small)
1. **U-FT-11 + vendor densification** = THE training keystone. BLOCKED on TWO prereqs:
   (a) the reducer (`sfc-aggregate.mjs`) must emit **cutType-resolved baselines** `(iso, cutType)`
       not its current `(iso, operation)` -- the DL apply key is `iso|_|cutType`, so operation-keyed
       records land in the dead `iso|_|_` bucket; AND
   (b) sweep cells must carry **vendor citation context** (tool identity) so `resolveCell` returns
       vendor data -> `comparable>0` -> `vendor_corroborated` regimes exist. The bare enumerator is
       tool-agnostic -> `comparable=0` -> calib-sync writes nothing (dormant no-op).
2. 12 N-aluminum Vc divergences (PRISM under-speeds Al -55..-60% vs baseline) -- open correctness Q.
3. U-OSC-TURNING-CAP-VC-DW bug (uses tool Dc not workpiece Dw at `UltimateSpeedFeedEngine.ts:2152`; STEP 18F mirrors it -- fix BOTH).
4. SFC-ACCURACY-MS1 long-tail stages (1/2/3/6, 18-dim envelope) -- assess per-stage need.
5. DL-singleton E2E test (keystone uses injected provider); fz force-envelope physics-reviewer proof.

## OUTDATED / superseded (drop)
- The plan's U-FT-11/12 "add toolMaterial at apply" premise -- proven a REGRESSION (U-OSC9 made keys
  coherent; U-FT-12 shipped a coherence-lock). See [[reference_oscar_sfc_fulltune_calib_axis_finding_2026_06_14]].
- Consumed design-spec process artifacts.

## THE HARD VENDOR-DATA REALITY (R12 -- exhaustively repo-verified)
**Live comparison to G-Wizard/HSMAdvisor for "every input / billions" is STRUCTURALLY IMPOSSIBLE.**
- G-Wizard `toolcrib.csv` = 41,210 rows, ALL `sfm=ipt=0` (geometry only; S&F computed on-demand in
  the closed UI, never persisted). Verified commit `16e010cada`.
- HSMAdvisor `%APPDATA%` = tool definitions + preferences only, ZERO sfm/ipt/chipload fields.
- => The ONLY automatable vendor reference is PUBLISHED tables (~192 cells: CNCCookbook/G-Wizard-
  published 144, HSMAdvisor public 12, + Sandvik/Kennametal/Titans + HSS/ceramic/CBN), in
  `SpeedFeedBaselineComparatorEngine.ts`. For the other ~20.3M cells comparison is `prism_only`.
- **Honest "finish the training" = (1)** run PRISM physics over the full 20,321,280-cell space
  (infra built: enumerator + FAST flag + fork pool + reducer + cron); **(2)** vendor-compare where
  published refs exist; **(3)** EXPAND refs via Blackwell vision-OCR of the Kennametal 271MB/2032pp
  catalog (the genuine multi-hour GPU unit); **(4)** feed `vendor_corroborated` regimes back via the
  tier-1 calib loop (needs U-FT-11 prereqs above).

## WORKTREE DIVERGENCE (important)
Agent 3 found many vendor/calibration engines committed on `main` but NOT in the slot/oscar worktree:
`SpeedFeedCalibrationPersistEngine` (`16d6eecef4`), `SpeedFeedTriComparatorEngine` (`a2dbfa76e1`),
`scripts/sfc-full-sweep-compare.mjs`, `sfc-all-axis-sweep.mjs`, the HSS/ceramic/CBN baselines, the
per-vendor-compare. Before building U-FT-11 / running the full sweep on slot/oscar, RECONCILE: either
merge main->slot/oscar or run the training from a tree that has these. Verify presence first.

## SFC input axes (the training space)
20,321,280 discrete cells = 192 valid (op x strategy x cut x toolmat) x 6 ISO x 10 dia x 7 flute x 6
power x 6 hardness x 7 coolant (`SFC_FULL_SPACE_SIZE` in `sfc-combinatorial-enumerator.ts`). Plus ~20
continuous axes (ap, ae, stickout, runout, helix, corner-radius, economics, chatter params) sampled
via LHS. The "billions" framing comes from cross-producting the continuous axes.

## Recommended execution order (the training finish)
1. Reconcile worktree vs main (get the vendor/calib engines present).
2. Reducer: emit cutType-resolved baselines (unblocks U-FT-11 axis).
3. Vendor-densify the sweep (pair cells with tool entries so citations flow).
4. Run the full 20.3M sweep (fork pool / cron) -> baseline moat + vendor_corroborated regimes.
5. U-FT-11 calib-sync: vendor_corroborated -> sfc_dl_record_feedback (tier-1 learning).
6. Kennametal catalog Blackwell OCR -> expand published refs -> wider comparison coverage.

Pairs with [[reference_oscar_sfc_fulltune_pipeline_2026_06_14]] · [[reference_oscar_sfc_fulltune_calib_axis_finding_2026_06_14]].
