---
name: reference_cam_optimization_verified_2026_06_01
description: "8-family adversarial audit of CAM-OPTIMIZATION-RULES.json found 2 P0 + 16 P1 completeness gaps (missing safety guards in the consumed rule object) — all applied; the lessons (G50-under-G96, deflection-not-torque, guards-in-prose != guards-in-object)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.504Z
aliases: reference_cam_optimization_verified_2026_06_01
---


# CAM optimization rules adversarially verified — 2 P0 + 16 P1 fixed (U-CAM-OPT-VERIFIED, slot:kilo, 2026-06-01)

An ultracode background workflow (17 agents: 8 profile + 8 adversarial-refute + synthesis, run wf_f12b10c0-36c) stress-tested `CAM-OPTIMIZATION-RULES.json` against the real JM corpus + `physics/constants.ts`. Verdict: **2 PASS (OD_finishing, parting_cutoff) / 6 FAIL — 2 P0, 16 P1**. Every FAIL was a **completeness gap (missing guard / missing rule), NOT a physics error** — SFM/feed/DOC correct per ISO group, no constant inlined. All applied (rules v1.0.0→1.1.0); 22/22 resolver + 9/9 planner tests. Full KB: `state/shared/cam-drive/CAM-OPTIMIZATION-VERIFIED.md`.

## The 2 P0s
- **thr-rpm** offered G96 CSS but omitted the mandatory **G50 max-rpm cap** — ID/decreasing-pitch-dia threading spikes rpm as effective dia→0 on a spindle-synced pass (crash). Added G50 + ID-thread L/D.
- **odr-doc** gated deep DOC only on torque; **deflection δ=FL³/3EI** is the binding constraint on slender shafts. Added L/D radial-deflection gate; dropped the hardcoded 1.5mm (it came from the single-material ISO-H run). **grv-sfm** raised SFM unbounded with no grooving derate + dropped insert_width → added `groove_derate` (Vc_groove=0.70-0.80×Vc_turn, physics-delegated) + insert_width driver + ceiling.

## 5 new rules added: idb-peck, idb-finish-feed, grv-feed, grv-width-step, grv-finish.

## Cross-cutting lessons (the durable ones)
- **L5 (root cause): guards-in-prose ≠ guards-in-the-consumed-object.** A guard in CAM-OP-TEMPLATE-MATRIX.json prose or analysis is NOT load-bearing — `applyOptimizationRules` reads the rules JSON object. **A guard is only "present" if it is in the rules JSON rule object.** Verification rule going forward.
- **L2: G50-under-G96 is the most-violated invariant** (4 families). Every rule offering G96 MUST carry a G50 cap (now a fleet-wide unit test).
- **L3: deflection (L/D), not torque/MRR, is the binding constraint on slender work** — systematically under-guarded; attach an L/D gate (→ whiskey `lathe_safety_predicate_evaluate`) to every aggressive radial/axial move.
- **L7: min-chip-load floor** — finish/light-feed moves can fall BELOW insert min chip load (rubbing) — the opposite failure to over-speed; floor the feed, switch to larger nose R/wiper rather than lowering.
- **L1 reaffirmed:** SFM material-dependent (ISO-H 80/130 → ISO-P 220/320 → ISO-N 400/600, ~17× range); resolver correctly emits `pending` (no silent tool_steel default) in all 8 families.

Pairs with [[reference_cam_optimal_reference_single_material_2026_06_01]] + [[reference_cam_feed_regex_broken_2026_06_01]] (the three CAM corpus/optimization findings this session). The adversarial-workflow pattern (per-family profile→refute→synthesize, plain-text agents) is reusable for any rule-set verification.
