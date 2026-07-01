---
name: reference_oscar_sfc_hss_overspeed_finding_2026_06_09
description: "SFC comparison FINDING (earned by the new HSS baseline): PRISM's HSS recommendations run hotter than published HSS practice -- cast iron +108% (~2x over-speed), steel +31%, aluminum -5% (agrees). Candidate SFC HSS speed-model review unit."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.706Z
aliases: reference_oscar_sfc_hss_overspeed_finding_2026_06_09
---


# SFC finding: PRISM over-speeds HSS (esp. cast iron) vs published HSS baseline (slot:oscar, 2026-06-09)

The moment the HSS comparison baseline shipped (commit `c78faa5a73`, U-OSC-COMPARE-HSS-BASELINE), the tri-vendor sweep (`scripts/sfc-full-sweep-compare.mjs`, tool_material axis) immediately surfaced a divergence the carbide-only comparison could never catch. This is the comparison-half doing exactly its job.

## The finding (live, 576-comparison sweep, 54 HSS baseline datapoints)
Per-ISO HSS PRISM-vs-published-baseline median Vc delta:
- **N aluminum: -5%** -- PRISM 85.8 vs baseline 90 m/min. EXCELLENT agreement (HSS aluminum is speed-capped by edge softening; PRISM respects that).
- **P steel: +31%** -- PRISM 31.5 vs baseline 24 m/min (103 vs 79 SFM). Mildly aggressive (PRISM slightly above the 75-90 SFM HSS-steel range).
- **K cast iron: +108%** -- PRISM 37.4 vs baseline 18 m/min (123 vs 59 SFM). PRISM runs ~2x the published HSS gray-iron speed (HSS gray iron should be ~50-80 SFM; 123 SFM rapidly wears the HSS tool against cast iron's abrasive graphite/carbides).

## Why this is a real SFC issue, not a baseline error (reviewer-confirmed)
The baseline vc=18 m/min for HSS gray iron is literature-correct (Machinery's Handbook / ASM HSS milling tables, ~50-80 SFM @ ~200 BHN; physics-reviewer-validated). Arm-B reviewer EXONERATED the baseline: "+108% is PRISM running hot, not the baseline running low." Root-cause hypothesis (UNVERIFIED -- needs the unit): PRISM's tool_material HSS derate is insufficient for cast iron. Carbide cast iron ~170 m/min -> PRISM HSS cast iron ~37 (0.22x derate); but real HSS/carbide cast-iron speed ratio is ~0.1x (HSS 50-80 SFM vs carbide 500-800 SFM). So PRISM's HSS derate (~0.22x) is too shallow for K-group abrasive wear -> over-speed. Aluminum is fine because PRISM caps HSS aluminum at the edge-softening ceiling.

## FIXED 2026-06-09 (commit `907e74acab`, U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC)
Root cause: `CANONICAL_TOOL_MATERIAL_SPEED_FACTOR` (constants.ts) was a UNIFORM per-tool-material multiplier (hss 0.35, ceramic/cbn 2.5), but the real tool/carbide speed RATIO is workpiece-ISO-specific. The `[0.3,3.0]` clamp also BLOCKED the correct values (HSS-K ~0.13 floored; ceramic-S ~6.5 ceiled). Fix: new sibling module `src/physics/tool-material-speed-override.ts` (kept OUT of edit-guarded constants.ts -- adds no Kienzle/Taylor value) layers a per-(tool,ISO) override (hss x K 0.13, cbn x H 1.4, ceramic x K 3.8 / S 6.5) + widened clamp [0.1,8.0] on the canonical base table; `getMaterialSpecificToolSpeedFactor(toolMat, isoGroup)` wired into the UltimateSpeedFeedEngine Vc path (passes effectiveIso). physics-reviewer-validated values. EMPIRICAL RESULT (sweep): HSS cast iron **+108% -> -23%** (over-speed ELIMINATED, now safe/conservative); CBN hardened +49% -> conservative; ceramic -49% -> -7.1%; carbide -25.9% UNCHANGED (no regression); HSS steel/alum +31%/-5% unchanged. 20 tests. RESIDUAL (safe-direction, follow-up): ceramic-S/cbn-H now slightly conservative (n=6/12 small sample) -- reflects PRISM's internal CARBIDE-BASE Vc differing from literature carbide (the override ratios are literature-carbide-relative). A carbide-base calibration review per H/S group is the next non-safety tune.

## SUPERSEDED CANDIDATE: U-OSC-HSS-SPEED-MODEL-REVIEW (physics-reviewer-gated, SFC-core)
Investigate whether the orchestrator's HSS tool_material derate should be MATERIAL-SPECIFIC (more aggressive for K cast iron + abrasive groups) vs the current ~uniform derate. SAFETY-RELEVANT (over-speeding HSS = rapid tool failure, economic not catastrophic). MUST be physics-reviewer-gated + no-regression (it's the saleable SFC's core recommendation; touching the HSS speed path affects every HSS recommendation). Verify against the published HSS/carbide speed ratios per ISO group. Do NOT lower carbide speeds (those compare -25.9% safe). This is the highest-value SFC follow-up the comparison earned.

Pairs with [[reference_oscar_sfc_live_vendor_compare_2026_06_09]] (the HSS baseline that surfaced it) and [[reference_oscar_sfc_axis_liveness_map_2026_06_09]] (tool_material is LIVE on the PRISM side, 2.17-111x).
