---
name: reference-whiskey-kienzle-cost-wire-audit-2026-06-27
description: "Kienzle /goal continuation (slot:whiskey 2026-06-27): U-W-COST-WIRE shipped (real cost leg) + adversarial 5-agent audit's VERIFIED remaining closed-loop gaps (collision shallow/hardcoded geom, MRR/tool-life ungated, 0 .MIN pairings). The dependency-ordered next-unit list."
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.257Z
aliases: reference_whiskey_kienzle_cost_wire_audit_2026_06_27
---


# Kienzle /goal (cont.) — U-W-COST-WIRE + audit's remaining units (2026-06-27)

Operator re-issued the Kienzle /goal on slot:whiskey. Found it ~90% done (continuation of the
2026-06-26 30+-commit session, [[reference_whiskey_kienzle_session_2026_06_26]]). 4-gate status confirmed
live: G1 closed-loop DONE (`--all` over 34,993 .MIN; Rung B feed 96.3%/SFM 100% in-band; STEP geometry
leg `full_geometry_loop_closed=true`), G2 capability DONE, G3 tribal MAXED (694), G4 lathe-BE DONE +
FE=quebec's active lane (26-surface Kienzle app from today's design concept already being built).

## Shipped this session
- **U-W-COST-WIRE (commit `2b0bd34fc6`):** closed a real **R12 manifest fiction** — `lathe-closed-loop-full.mjs:138`
  claimed stage-4 "cost EXISTS (CostEfficiencyBridge/JobCosting)" but NO cost was ever computed (the scorer
  `lathe-safety-efficiency-score.mjs` emitted only cycle_time/MRR/tool_life). Now the STEP closed-loop computes
  a real per-part 7-bucket cost via the REAL `LathePartCostModelEngine`. New cited `scripts/lib/lathe-jm-cost-rates.mjs`
  (machine $85/hr, setup, material price/density by ISO, insert economics, batch=25) + pure tested
  `scripts/lib/lathe-part-cost-inputs.mjs` (11/11, builds the engine input + geometry-mass). Scorer surfaces
  injected `limits.partCost` -> `efficiency.cost_usd`/`cost_breakdown`/`cost_basis` (engine-free, stays node:test-pure,
  10/10 no-regress). **LIVE: 92/112 STEP parts carry cost, avg ~$13.5/pc, fastener -> $5.69/pc.** 2-arm scrutiny PASS (all P2).
- **EXHAUSTIVE STEP coverage (commit U-W-STEP-EXHAUSTIVE-COVERAGE):** ran the geometry leg over the FULL 2,307-file STEP
  corpus -> **1049 real JM turned parts scored** (was 1 at session start), 100% with real cost (avg $17.3/pc), 988 correctly
  skipped non-revolution. **VALIDATED: 772/1049 (~74%) uneconomical even by the COST-AWARE flag** -- the generator's short
  tool life is a REAL, widespread problem on actual JM parts (high tool-cost-share), strongly motivating U-W-GENERATOR-VC-ECONOMY.
- **STEP coverage pushed 1 -> 20+ scored parts** (corpus is electrode/mold-dominated; ~16% of attempts are turnable).
  `steps_paired_to_min=0` is HONEST ABSENCE — the 5+ Fusion-CAM STEP parts (9070219, A0525, 20-011-023, SS-CIP)
  have ZERO .MIN counterparts (different workflow), so cloud-relative scoring is the correct fallback, not a join bug.
- **U-W-TOOLLIFE-ECONOMY (commit `bdb07ac833`):** advisory machining-economy flag in the closed-loop scorer
  (`economical_tool_life_min=15` cited Trent&Wright/Armarego; `tool_life_economical` per part + `uneconomical_tool_life_parts`
  count in the STEP dashboard). NEVER-SOFTEN tested (an uneconomical flag must NOT change the SAFE verdict). scorer 13/13.
  **REAL FINDING the closed-loop surfaced: generated programs have SYSTEMATIC 1-2 min tool life** -- but see the correction below.
- **U-W-TOOLLIFE-ECONOMY-COSTAWARE (commit `effc5d3627`):** SELF-CORRECTION -- the fixed-15-min flag OVER-flagged
  machine-cost-dominated parts where an aggressive Vc / short tool life is genuinely COST-OPTIMAL (Boothroyd&Knight:
  optimal Vc rises as C_tool/C_machine falls). Now flags uneconomical ONLY when tool life is short AND tool-cost-share
  >= 20% of total cost (uses the cost breakdown the cost leg already computes -- no Taylor-n estimate, no generator change).
  So the earlier "4/4 uneconomical" was PARTLY over-flagging; the TRUE uneconomical set is the high-tool-cost-share parts.
  15/15. This is the MEASUREMENT-side of the same insight as U-W-GENERATOR-VC-ECONOMY (which APPLIES it to Vc selection).

## Adversarial audit (5-agent Workflow, 4 rate-limited) — VERIFIED remaining whiskey-lane closed-loop gaps
Dependency-ordered next units (each needs INDEPENDENT verification first — the audit ran 1 surviving dimension):
1. **U-W-COLLISION-GEOM (P1):** `TurningPrintToProgramEngine.ts:1722-1751` HARDCODES collision geometry
   (`turret_radius_mm:150, chuck_jaw_protrusion_mm:15, max_swing??400, holder_protrusion_mm:30`) instead of
   sourcing per-machine from `ShopConfigurationEngine.getMachines()` (JM LTH-01..07, 100% Okuma OSP). Loss-fn:
   collision inputs read from ShopConfig; an oversized-OD STEP produces a FAIL.
2. **U-W-COLLISION-DEPTH (P1):** `LatheCollisionZoneEngine.checkAll` runs only ~2 of ~14 hazards; `checkTurretIndex`
   (gated on `current_station`) + `checkRapidCorridor` NEVER fire because the pipeline supplies no
   `target_station`/`current_station`/`current_x_mm`. Thread those through -> >=4 check_types/row.
3. **U-W-MRR-SANITY — DONE/REFUTED (R12 correction):** VERIFIED the audit's "MRR ~100K non-physical" claim is WRONG
   (105 cm3/min is plausible for aggressive turning; tool_life_min is a real Taylor value, range 1-2241, NOT a floor).
   The real signal was uneconomical tool life -> shipped as U-W-TOOLLIFE-ECONOMY (above). NO MRR gate built (premise false).
3b. **U-W-GENERATOR-VC-ECONOMY (NEW, P1, physics-review, FRESH CONTEXT):** the closed-loop found generated programs
   SYSTEMATICALLY pick Vc so aggressive that Taylor tool life is 1-2 min (uneconomical). Root: `TurningPrintToProgramEngine`
   sets `Vc = speeds.rough` (line 757) x a `target` multiplier (762), then `taylorLifeTurning(C,n,actualVc)` (815) -> short life.
   **CRITICAL (verified this session, R8): a NAIVE "cap Vc at fixed T_econ=15-20min" is WRONG.** For small machine-cost-dominated
   parts (cycle ~40s, ~$4/pc) the machine bucket dominates, so halving Vc to extend tool life ~20x roughly DOUBLES machine cost ->
   could INCREASE total cost. The correct fix is the COST-RATIO economic cutting speed V_econ = C/T_econ^n where
   T_econ = (1/n - 1)(t_change + C_tool/C_machine) -- minimizes machine+tool TOTAL cost (Armarego&Brown / Boothroyd&Knight),
   using the cost-leg params now available (machine_rate, insert_cost from lathe-jm-cost-rates.mjs). Validate via the cost leg
   that total $/pc DROPS, not just tool life rises. Core-engine (affects ALL lathe generation) + safety-adjacent -> physics-reviewer
   MANDATORY + round-trip the closed-loop. U-W-TOOLLIFE-ECONOMY only MEASURES this; this unit FIXES it -- do NOT rush it.
4. **U-W-MIN-PAIR (P0 if feasible):** 0 generated programs paired to a specific source .MIN (94% suspect-skip + the
   turnable parts having no .MIN twin). Strengthening this needs parts that HAVE .MIN counterparts (the CNC-LATHE
   .MIN corpus parts, not the Fusion-CAM STEP set). Honest: may be data-limited, not a code fix.

## Operator-action blockers (cannot self-resolve)
- **Hermes proxy HUNG** (expired xAI OAuth) -> "parallel hermes agents / hermes /learn" path down all session;
  tribal-maxing used the Ollama-vision substitute instead. Fix: `hermes auth reset xai-oauth` (browser) then
  `Start-ScheduledTask 'PRISM Hermes Proxy'`.
- **G4 FE** = quebec's active lane (26-surface Kienzle app from `mcp-server/web/design-imports/kienzle-app-build/`).

Related: [[reference_whiskey_kienzle_session_2026_06_26]] · [[reference_whiskey_tribal_not_in_generation_gap_2026_06_26]] · [[feedback_safety_gate_veto_on_fail_flag_not_severity]]
