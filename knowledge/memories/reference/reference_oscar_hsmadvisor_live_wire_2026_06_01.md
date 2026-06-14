---
name: oscar-hsmadvisor-live-wire-2026-06-01
description: "U-OSC9-HSMADVISOR-LIVE-WIRE shipped (commit 6b10a9ed66) — wires orphan hsmAdvisorComparatorBridgeEngine into prism_calc (sfc_hsmadvisor_compare + sfc_hsmadvisor_calibrate) + feeds the LIVE HSMAdvisor delta into the L1 closed loop (slot:oscar)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.242Z
aliases: reference_oscar_hsmadvisor_live_wire_2026_06_01
---


Strengthens the operator's /goal "closed loop training: SFC vs HSMAdvisor AND G-Wizard." The G-Wizard + static-baseline feed already shipped ([[oscar-sfc-close-loop-2026-05-31]]); this unit makes the **HSMAdvisor** half a LIVE, loop-fed signal instead of the recovered-from-var_pct inverse.

**SHIPPED — U-OSC9-HSMADVISOR-LIVE-WIRE (commit 6b10a9ed66):** the previously-orphan `hsmAdvisorComparatorBridgeEngine` (grep-confirmed: `hsmadvisor_compare` had ZERO dispatcher matches — genuine orphan, domain-map was stale) is now wired into `prism_calc` as TWO actions:
- `sfc_hsmadvisor_compare` — READ-ONLY: reads HSMAdvisor's live settings_v2.xml state, translates enums → PRISM, runs NineAxisOrchestrator, diffs 5 axes (sfm/ipt/rpm/feed/mrr) + agreement_score. Accepts `state_override` for offline/test. Does NOT mutate L1.
- `sfc_hsmadvisor_calibrate` — runs the compare THEN folds its per-axis delta into the L1 loop.

New method `SpeedFeedVendorDeltaCalibrationBridgeEngine.calibrateFromHsmAdvisorCompare(result, opts)`: maps the comparator's axes (sfm→speed, ipt→feed; each axis has `prism`=predicted, `hsmadvisor`=actual, same unit) into the EXISTING `recordFeedback(jobId, predicted, actual)` — ONE call carrying both axes. **NOT a recordFeedback-contract change** (same shape the G-Wizard path uses; the per-segment calibration refactor is the separate deferred unit #47). Only sfm/ipt are folded — rpm/feed/mrr are derived from them and would double-count the same error signal.

**R12 safety gates (the load-bearing properties, both verified by scrutiny):** (1) `requireExactTranslation` (default true) — if the comparator GUESSED the material/tool/op (any translation source = "fallback-default"), the WHOLE feed is skipped (never train on a mistranslation); (2) per-axis outlier guard (|err%| > maxAbsErrorPct, default 60); (3) pos-finite denominator guard; (4) no-op guard — if no axis qualifies, recordFeedback is NOT called (an empty entry would pollute the L1 warmup window). UNITS: ft/min + in/tooth are passed into recordFeedback's speed_mpm/feed_mm keys — a metric misnomer, but recordFeedback computes only the dimensionless ratio (predicted-actual)/predicted and both sides of an axis share a unit → unit-invariant.

11 new tests (R9 derivation oracle: sfm 330/300→9.0909%, ipt 0.005/0.004→20%, both ride ONE recordFeedback → learning delta == 1; + gating/no-op/fail-loud + dispatcher round-trip via state_override through prism_calc). 25/25 file, 62/62 SFC-domain regression, tsc 0 errors, 2-arm per-file scrutiny PASS (both reviewers independently re-derived the oracle + confirmed read-only compare + fail-loud errors + no import cycle).

**FOLLOW-UPS (deferred, logged for a fresh-budget session):**
- **P2-1 (pre-existing, out of scope):** `SelfLearningSystem.feedbackHistory` only pushes, never trims — a long-lived process running calibrate repeatedly grows it unbounded. Calibration only reads the last 20, so it converges; the cost is memory. Fix belongs at the SelfLearningSystem layer (ring-buffer cap), best bundled with #47.
- **#47 U-OSC9-SEGMENTED-CALIBRATION** still the high-value next unit: per-(material-group × tool-type × regime[rough/semi/finish]) calibration factors instead of GLOBAL — a recordFeedback-CONTRACT change needing physics-grade scrutiny + fresh budget.

Relates to [[oscar-sfc-close-loop-2026-05-31]], [[oscar-sfc-db-auto-absorb-2026-05-31]]. Wiki: [[sfc-hsmadvisor-live-wire]].
