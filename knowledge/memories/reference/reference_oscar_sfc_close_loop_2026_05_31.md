---
name: oscar-sfc-close-loop-2026-05-31
description: "U-OSC9-DB-CLOSE-LOOP shipped (commit fd5c4e7f13) — vendor-delta→L1 calibration bridge closes the SFC-vs-HSMAdvisor/G-Wizard training loop; + per-segment-calibration follow-up insight (slot:oscar)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.250Z
aliases: reference_oscar_sfc_close_loop_2026_05_31
---


Second half of the operator's /goal "closed loop training: SFC calc comparison to HSMAdvisor and G-Wizard + auto-absorption of new DBs." First half = [[oscar-sfc-db-auto-absorb-2026-05-31]] (registry auto-glob). This half closes the LOOP.

**SHIPPED — U-OSC9-DB-CLOSE-LOOP (commit fd5c4e7f13):** new `SpeedFeedVendorDeltaCalibrationBridgeEngine` + `prism_calc:sfc_vendor_delta_calibrate`. Folds tri-vendor comparison cells into `speedFeedDeepLearningEngine.recordFeedback({predicted:PRISM, actual:vendor})`. G-Wizard uses ABSOLUTE `gwizard.{vc_mpm,fz_mm}`; baseline (HSMAdvisor-ish) recovers vendor = `prism/(1+vc_var_pct/100)` (inverse of SpeedFeedBaselineComparatorEngine:403 `vc_var_pct=(prism-vendorMedian)/vendorMedian*100`). `calibrateFromCells` + `calibrateFromLedger` (reads sf-tri-vendor-smoke.jsonl, fail-soft). Gates: in-envelope-only + maxAbsErrorPct=60 outlier guard + finite-positive denom guards.

**KEY FACT (recon was WRONG, corrected):** the apply-back ALREADY EXISTS — `SpeedFeedDeepLearningEngine.computeSpeed/computeFeed` multiply output by `calibrationFactors.speed/.feed` (lines 577/663); `recordFeedback` adjusts those factors (≥5-sample warmup, `*= (1-avgError/200)` damping). The loop was only missing the FEED. So this unit = one wire; loop is genuinely closed (compute→learn→apply). 14/14 tests (R9 derivation oracle catches sign flips), tsc clean, 30/30 regression, 3-arm scrutiny PASS.

**HIGH-VALUE FOLLOW-UP (from operator's design question 2026-05-31 "separate calculators per material/tooling/finish/rough-semi-fine?"):** the answer is NOT separate physics engines (that IS the JC-fragmentation anti-pattern I just fixed — duplicated physics diverges). The physics is ONE parameterized core (Kienzle/Taylor/JC by ISO group + alloy + multi-fit variant). BUT the instinct is RIGHT at the **calibration layer**: today's L1 `calibrationFactors` is GLOBAL ({speed,feed,tool_life,surface_finish}). Vendor-divergence is almost certainly NOT uniform across regimes — a single global factor AVERAGES away segment-specific bias (e.g. PRISM matches steel-roughing but diverges on Ti-finishing). **Proposed next unit U-OSC9-SEGMENTED-CALIBRATION:** key `calibrationFactors` by segment = material-group × tool-type × regime(rough/semi/finish) instead of global, so the closed loop learns per-segment vendor offsets. Small extension to SelfLearningSystem; the vendor-delta bridge already carries the segment context per cell (iso_group, operation, tool). Also: regime (rough/semi/finish) should be a first-class objective/constraint axis in the 9-axis orchestrator (different objective functions over shared physics), not separate calculators.

Relates to [[oscar-sfc-db-auto-absorb-2026-05-31]], [[oscar-jc-multifit-registry-u1-2026-05-31]] (the don't-duplicate-physics lesson), [[feedback_net_benefit_auto_build]]. Wiki: [[sfc-db-auto-absorption]].
