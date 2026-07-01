---
name: oscar-traditional-lane-2026-06-02
description: "SHIPPED: TraditionalSpeedFeedLaneEngine — the independent 4th SFC comparison lane (classic handbook RPM=3.82*SFM/D_in). Cited conservative Machinery's Handbook SFM, distinct from vendor-aggressive baseline. Wired prism_calc:sfc_traditional_lane. Unblocks the PRISM-vs-HSMAdvisor-vs-GWizard-vs-traditional 4-lane comparison (integration = FULL-SWEEP-RUN)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.718Z
aliases: reference_oscar_traditional_lane_2026_06_02
---


Commit `0f9d9e69df` on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-TRADITIONAL-LANE (task #55). Critical-path unlock from the launch-readiness assessment ([[reference_sfc_launch_readiness]] / `state/shared/specs/SFC-LAUNCH-READINESS-2026-06-02.md`): the operator's goal compares PRISM vs HSMAdvisor vs G-Wizard vs **traditional**, but the traditional lane did NOT exist — it was conflated with the cnccookbook/Sandvik rows inside `SpeedFeedBaselineComparatorEngine`.

**What shipped:** `TraditionalSpeedFeedLaneEngine` (`compute({iso_group, tool_material, operation, cut_type, tool_diameter_mm, flutes})` → `{sfm, vc_mpm, rpm, fz_mm, feed_rate_mmmin, source, notes}`). The classic shop formula: `RPM = 3.82·SFM/D_inch` (verified algebraically identical to `Vc·1000/(π·D_mm)` — the engine computes via the metric form so D stays mm; no 25.4× slip), `Vc = SFM·0.3048`, `Vf = rpm·fz·flutes`. Wired `prism_calc:sfc_traditional_lane` (enum + handler, lazy import, action count +1).

**Data discipline (R12 honesty):** the SFM + chip-load table holds CONSERVATIVE published handbook recommendations (Machinery's Handbook recommended cutting speeds, HSS & carbide), cited at **source-category level — NO fabricated precise page numbers** (over-claiming "MH 30th ed. p.1054" would be the R12 violation; both reviewers flagged the avoidance as correct). The values are intentionally LOWER/more conservative than the vendor-aggressive baseline lane (P-steel carbide 375 SFM vs Sandvik ~600-900+) — that contrast is the entire value of a separate traditional lane. These are advisory REFERENCE rows (same category as the baseline engine's vendor rows), NOT inlined physics constants (Kienzle/Taylor stay in `src/physics/constants.ts`). Types `ISOGroup/Operation/ToolMaterial/CutType` imported from `UltimateSpeedFeedEngine` (no redefinition/drift). Exhaustive `Record<Enum,number>` multipliers → no undefined lookup; Zod fail-loud on D≤0 / invalid ISO.

**Proof:** tsc 0; 13/13 PASS (material ordering N>P>S with spread, 1/D RPM scaling, HSS<carbide, finishing>roughing, drilling<milling, feed self-consistency, citations non-empty, fail-loud throws). Per-file scrutiny 2/2 PASS (UNITS-FIRST + data-honesty cleared), zero P0/P1. Test-tolerance lesson: the engine computes RPM/Vc from UN-rounded SFM while outputs are rounded (sfm 1dp, vc 2dp, rpm 0dp) — assert self-consistency on RELATIVE error / matched precision, not absolute `toBeCloseTo(,2)`.

**Next (critical path to full coverage):** U-OSC9-BASELINE-EXPAND (expand baseline to full ISO P/M/K/N/S/H — good parallel research-workflow candidate) + U-OSC9-JM-FIRST-SUBSET → U-OSC9-FULL-SWEEP-RUN (extend the TriVendor comparator 3→4 lanes adding this engine, run + archive the JM-first matrix reading the launched HSMAdvisor + G-Wizard live libs). P2 deferred: flutes default=4 for tapping/reaming/thread_milling. Relates to [[reference_oscar_gwizard_lane_honest_2026_06_02]], [[reference_sfc_speed_feed_bugs_2026_05_31]].
