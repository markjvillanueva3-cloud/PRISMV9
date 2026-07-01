---
name: oscar-op-cuttype-map-2026-06-02
description: "SHIPPED: speed_feed dispatcher now reroutes a legacy cut-type-valued `operation` (roughing/semi/finishing) to UltimateSpeedFeedInput.cut_type (process->milling), so finishing Vc > roughing Vc is honored again. Canonical cut_type/real-process untouched. NOT a lathe regression (pre-fix already fell back to milling)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.692Z
aliases: reference_oscar_op_cuttype_map_2026_06_02
---


Commit `2340717fd6` on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-SPEEDFEED-OP-CUTTYPE-MAP (task #56). Split-off from [[reference_oscar_speedfeed_param_passthrough_2026_06_02]] (#53).

**The defect:** the legacy `prism_calc:speed_feed` `operation` param frequently carries a CUT-TYPE value (`roughing`/`semi`/`finishing`), but `UltimateSpeedFeedInput.operation` is the PROCESS enum (milling/turning/...) with `cut_type` separate. Pre-fix, `operation:"finishing"` was an invalid Operation → the engine's dataKey `{iso}_finishing_finishing` missed → fell back to `{iso}_milling_roughing`, so the cut_type was NOT honored and **finishing and roughing returned the SAME Vc**.

**The fix (dispatcher normalization, additive to the #53 block):** a `CUT_TYPE_ALIASES` map reroutes a cut-type-valued `operation` to `cut_type` (defaulting process → milling, or `operation_process` if the caller supplies it). A real process value (milling/turning/etc.) or an explicit `cut_type` is left untouched (`== null` canonical-wins guard). The alias keys ({roughing,rough,semi,semi_finishing,finishing,finish}) have ZERO overlap with the Operation enum, so a real process is never falsely rerouted.

**Why NOT a lathe regression (the load-bearing review point):** pre-fix, a lathe caller passing `operation:"roughing"` was ALREADY degraded to `milling_roughing` (invalid enum → fallback) — it never honored turning either. The fix preserves that exact process resolution and ADDS cut_type honoring; `operation_process` is the new escape hatch for a turning caller. Strictly better, zero new regression. Both reviewers independently traced the engine fallback (`UltimateSpeedFeedEngine.ts:~1998`) to confirm.

**Proof (R9):** tsc 0; 16/16 PASS — finishing Vc > roughing Vc through the dispatcher (data table: P milling 170 vs 140; FAILS pre-fix where both collapse to 140), semi→semi_finishing, canonical cut_type wins, real-process untouched, material-aware regression intact (+#52 4/4, #53 6/6). Per-file scrutiny 2/2 PASS, zero P0/P1. P3: `operation_process` not enum-validated (fail-soft). Lesson (tooling): backticks in a bash `-m "..."` double-quoted commit message trigger command substitution — one word got eaten; use single-quote here-strings or avoid backticks.

**Session tally:** 7 SFC units shipped (#52/#54/#53/#55/#57/#58/#56) + launch-readiness deliverable. The 4-lane comparison is structurally complete + JM cohort frozen; only the #59 FULL-SWEEP-RUN capstone (fresh-budget) + #50/ALUMINUM-DIVERGENCE/BASELINE-EXPAND/SF-AI remain. Relates to [[reference_oscar_quad_lane_comparator_2026_06_02]], [[reference_oscar_jm_first_cohort_2026_06_02]].
