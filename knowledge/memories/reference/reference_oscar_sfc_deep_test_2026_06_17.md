---
name: reference_oscar_sfc_deep_test_2026_06_17
description: "SFC billions-scale deep test — full live-axis enumerator (1.46B) + validity sweep (0 nonphysical/21M) FOUND+FIXED an rpm-cap over-speed bug (rigidity premium past the cap, 1.29M cells); closed-loop training RUNS but full-space auto-calibration is correctly GATED (tool-agnostic sweep + divergent low-confidence OEM + no ground-truth actuals) — the vendor-cited path DID train (matches prior U-OSC-CALIB-TRAIN-RESULTS) (slot:oscar, 2026-06-17)"
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.700Z
aliases: reference_oscar_sfc_deep_test_2026_06_17
---


# SFC deep test + closed-loop training run (2026-06-17, slot:oscar)

Operator directive (repeated, kept getting forgotten): "calculations for varying cutting parameters for
all tool paths ... billions if not hundreds of billions of logical combinations for mill and lathe ...
run the closed loop training on all those and check the outcomes of each one to ensure they're truly
accurate." Anchors: `state/shared/specs/SFC-DEEP-TEST-FULLSPACE-PLAN.md` + `SFC-DEEP-TEST-RESULTS-2026-06-17.md`.

## The forgetting-loop root cause (closed)
The 2026-06-08 axis-gap memo said "model the inert axes first, THEN sweep." Chats modeled coating /
rigidity / goal into `UltimateSpeedFeedEngine` but NEVER expanded the enumerator. The FULLTUNE cron kept
re-running the SAME 10-axis 20.3M grid. FIX: `sfc-fullspace-enumerator.ts` adds the 3 live-but-unswept
Vc-factor axes as mixed-radix digits -> **SFC_FULLSPACE_SIZE = 20,321,280 x coating8 x rigidity3 x goal3
= 1,463,132,160** (~1.46B). Index-addressable, validity-aware, base enumerator untouched. (U-DT-ENUMERATE)

## The bug the deep test FOUND + FIXED (U-DT-RPMCAP-RIGIDITY)
Full-space validity sweep (`sfc-fullspace-sweep.mjs`, real engine fast_bulk, streaming O(1) reduction)
scanned 21M cells: **0 nonphysical / 0 errors**, but a 20M strided sample (all 72 overlays) found
**1,286,122 rpm-cap violations (~6.4%)** — `spindle_rpm = 15000 x 1.1 = 16500`, ABOVE machine max. Root
cause `UltimateSpeedFeedEngine.ts:2788`: the machine-rigidity Vc premium (high->x1.1) is applied AFTER
the STEP-4 RPM cap + recomputes rpm WITHOUT re-capping (also used Dc for turning, not Dw). FIX mirrors the
STEP-4 cap (recompute rpm with Dw-for-turning, re-apply maxRPM, back-calc capped Vc, re-derive Vf AND MRR
— MRR was also stale, physics-review FINDING 1). HARDENING. 6 regression tests; 52 gauntlet + 106
variability unaffected; post-fix re-sweep = 0 violations. **Lesson:** the RPM cap erases ALL pre-cap
factors (coating/hardness/strategy/toolmat/coolant at :2232 before the cap; only rigidity at :2790
survives) — a single-config test never hits it; the billions-scale sweep over high-rigidity cap-bound
cells did.

## Closed-loop training: it RUNS; full-space auto-calibration correctly GATED (honest verdict)
Ran `sfc-closed-loop-cron.mjs` live end-to-end, all `ok=true`, but **0 vendor_corroborated** from the
FULL-SPACE path — CORRECT by design:
1. The full-space sweep is **tool-agnostic -> all 20,321,280 cells `uncited`** -> 0 comparable. Loop's own
   diagnostic: "densify the sweep with vendor context."
2. OEM catalog comparison (`sfc-catalog-compare.mjs`, **395 OEM milling tools -> 1,185 cited cells**:
   match 157 / divergent 507) shows PRISM genuinely diverges -> all 18 regimes `low_confidence` -> the
   baseline-guard REFUSES to feed calibration (anti-poisoning; oscar soul).
3. **No high-confidence ground truth**: `state/outcomes/speed_feed.jsonl` (96.8MB) is `recommendation_emitted`
   (PRISM's OWN output), NOT measured actuals.

**BUT the vendor-CITED path HAS trained before** — `U-OSC-CALIB-TRAIN-RESULTS` built a 12-regime
calibration model from an 86-cell vendor-cited sweep (62 usable), finding PRISM systematically conservative
(P -33% M -26% N -37%, SAFE direction), 8/12 regimes would increase Vc -> operator-gated apply. My
bias-report reproduces this at scale (395 tools): **P/N/M finishing -26 to -36% PRISM-LOW (productivity
gap); H +55% & S-roughing +37% PRISM-HIGH (heat-sensitive over-speed REVIEW).** So the loop trains when the
sweep carries vendor citations; the full-space sweep deliberately does not (it's a validity scan, not a
parity scan).

## Making the full loop TRAIN (all physics-review-gated, NOT auto)
(A) capture real JM-Die measured `outcome_observed` actuals (only true signal; absent today);
(B) physics-review the flagged regimes (H/S over-speed = SAFETY; P/N/M finishing = productivity);
(C) tool-specific catalog densification (pass each OEM row's flutes/coating, not carbide/flutes=4) — lifts
near-match regimes only (K:rough +4.9, M:rough -0.5, S:finish +8.4), won't corroborate the 50%+ divergent.

## Throughput correction
Measured **0.026 ms/call** fast_bulk (full 1.46B ~10.5h single-thread, ~44min/30-shards). The "2.5 s/call"
driver doc is the NON-bulk per-call-ledger path. Session tsx runs >~7-13min get fleet-reaper-killed —
shard or use the scheduled task.

Commits: U-DT-ENUMERATE 8bd5fa3aac, U-DT-RPMCAP-RIGIDITY + U-DT-SWEEP (this session, slot/oscar).
See [[reference_oscar_sfc_axis_impact_gap_2026_06_08]] · [[reference_oscar_sfc_cron_oom_fix_2026_06_16]] ·
[[feedback_oscar_css_g50_cap_mandatory]] · [[reference_tapping_feed_pitch_locked_2026_06_01]] ·
[[reference_post_ship_oscar-sfc-9axis-ms0-u-osc-calib-train-results]].
