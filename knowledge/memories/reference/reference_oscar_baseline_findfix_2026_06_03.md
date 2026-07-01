---
name: oscar-baseline-findfix-2026-06-03
description: "SHIPPED #61 U-OSC9-BASELINE-FINDFIX (commit 16ac5b40c8): AXIS B findBaseline() fallback dropped diameter AND cut_type -> a 9.5mm turning insert snapped onto the 25mm baseline -> the live JM sweep's 6/18 matches were ALL falsely divergent. Fix: fallback keeps op+cut_type, only accepts entries within MAX_FALLBACK_DIAMETER_RATIO (2.0x) of the tool; else not-found. Prerequisite for all baseline densification."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.688Z
aliases: reference_oscar_baseline_findfix_2026_06_03
---


Commit `16ac5b40c8` on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-BASELINE-FINDFIX (task #61). The **top unit** from the vendor-fairness recon workflow ([[reference_oscar_vendor_fairness_plan_2026_06_03]]) + a soundness fix.

**The bug (SpeedFeedBaselineComparatorEngine.findBaseline):** the fallback matched `(iso + tool_material + op)` while DROPPING diameter AND cut_type. A D9.53mm turning insert (bucket 6, no exact entry) fell through to the only P turning entry (25mm) → the live JM sweep's 6/18 baseline matches were ALL falsely `verdict=divergent` (the 25mm insert S/F is meaninglessly different from a 9.5mm tool's). Material-blind too (keyed iso only).

**The fix:** fallback now keeps `op + cut_type` and only accepts an entry whose `diameter_mm` is within `MAX_FALLBACK_DIAMETER_RATIO = 2.0` of the actual tool (`Math.max(e.dia/d, d/e.dia) <= 2.0`); otherwise returns undefined → `prism_only` (an honest miss beats a false match). Added optional `materialName` soft-preference (tolerant substring, threaded from `input.material.name`) for a future multi-material ISO group. The exact-match path is unchanged.

**Why it's the foundation (R13 logical order):** every baseline densification unit (BORING, TURN-DRILL-ISO, DIA-BUCKETS) must build on a matcher that won't mask gaps with cross-bucket/cross-cut fallbacks — densifying atop the loose lookup would just feed a lying lookup. FINDFIX first.

**Proof (R9):** tsc 0; 34/34 (rewrote the test that ENCODED the loose-fallback bug — it asserted a 100mm semi_finishing request falls back to a 12mm roughing entry; now asserts honest not-found; +6 differential guard tests: 9.5mm turning→undefined WHILE 20mm→25mm, cut_type kept, exact unaffected). per-file scrutiny 2/2 PASS. P3 (deferred): material soft-pref substring is weak for "AISI 1018" vs "1018_steel" (no shared substring) — falls to cands[0], harmless today (1 material/ISO). Relates to [[reference_oscar_full_sweep_run_2026_06_03]].
