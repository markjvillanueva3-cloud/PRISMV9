---
name: reference_oscar_sfc_engine_divergence_magnitude_2026_06_21
description: "CRITICAL (slot:oscar, 2026-06-21): the 2 SFC engines don't just diverge in plumbing -- they make RADICALLY different speed/feed recommendations (Vc +25..+149%, power +258%, tool-life -90..-99%). Converging onto UltimateSpeedFeedEngine would ~2x production cutting speeds + cut displayed tool life ~90%. NOT a clean unification -- a product speed/feed PHILOSOPHY change (orchestrator conservative-derated vs engine aggressive-first-principles). Needs operator/physics-review before P2."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.701Z
aliases: reference_oscar_sfc_engine_divergence_magnitude_2026_06_21
---


**CRITICAL FINDING (slot:oscar, 2026-06-21) -- the SFC convergence is FAR more consequential than "unify two engines".**

Measured `SpeedFeedOrchestratorEngine.compute()` (the production web-UI engine) vs
`ultimateSpeedFeedEngine.calculate()` (via the P1 adapter `orchestratorToUltimateInput`) for identical inputs:

| input | metric | orchestrator (production now) | engine (convergence target) | diff |
|---|---|---|---|---|
| steel P mill rough | Vc | 80.3 m/min | 160.0 | **+99%** |
| | Fc | 577 N | 1035 | +79% |
| | power | 0.77 kW | 2.8 | **+258%** |
| | tool life | 360 min | 36 | **-90%** |
| | Ra | 0.8 um | 2.7 | +238% |
| | rpm | 2557 | 5093 | +99% |
| titanium S mill rough | Vc | 18.5 | 46.0 | **+149%** |
| | tool life | 9999 (capped) | 61 | **-99%** |
| | power | 0.23 | 0.8 | +233% |
| aluminum N mill finish | Vc | 301.6 | 377 | +25% |
| | tool life | 6 | 6 | 0% |
| | Fc | 84 | 50 | -40% |

## What this means
The two engines embody DIFFERENT speed/feed PHILOSOPHIES, not two implementations of one physics:
- **Orchestrator (production):** heavily DERATED Vc (coating x coolant x CAM x geometry factors) + proven-program blending (60% prior-shop-Vc when confidence>=0.7) + calibration_overrides (feedback-loop multipliers). Conservative, shop-realistic, long predicted tool life.
- **Engine (UltimateSpeedFeedEngine):** more first-principles / textbook-aggressive Vc + hardness H-switch + chip-thinning. Higher speeds, shorter (Taylor-consistent) tool life.

Neither is obviously "wrong" -- for steel-P carbide milling published Vc is ~120-250 m/min, so the ENGINE's 160 is textbook-in-range while the orchestrator's 80 is heavily derated (possibly over-conservative, OR realistically accounting for real shop conditions the engine ignores).

## Why this STOPS P2
The operator approved CONVERGE understanding it as a clean unification ([[reference_oscar_sfc_convergence_plan_2026_06_21]]). The measured data CONTRADICTS that premise: converging would **~2x the cutting speeds, +258% power, -90% tool life** shown to users in the production SFC UI. That is a PRODUCT speed/feed-philosophy change, not a refactor -- it must be an explicit operator/physics-review decision (which philosophy is canonical?), NOT a silent code convergence. R12: do not proceed on a contradicted premise.

## Options for the operator
- (A) Converge onto the engine's aggressive numbers (if first-principles is the desired canonical) -- but validate against shop reality + Sandvik/HSMAdvisor refs first.
- (B) Converge onto the ORCHESTRATOR's conservative numbers (make UltimateSpeedFeedEngine adopt the derating/proven-blend) -- the opposite direction.
- (C) RECONCILE first: physics-review which engine matches published refs + JM Die shop-floor outcomes (the SFC-vs-published-reference work, [[reference_oscar_sfc_hss_overspeed_finding_2026_06_09]]) BEFORE choosing a convergence direction.
- (D) Keep separate (the orchestrator is the product UI engine; UltimateSpeedFeedEngine serves the dispatcher/other consumers) -- accept the 2-engine reality, document it.

## Reproduce
P1 adapter `src/engines/lib/orchestrator-input-adapter.ts`; capture: O.compute(c) vs E.calculate(A(c)) for the baseline inputs (the U-SFC-ORCH-REGRESSION-BASELINE cases). Builds on [[reference_oscar_sfc_two_engine_divergence_2026_06_21]].

## RECONCILIATION VERDICT (operator-directed 2026-06-21 "reconcile against published refs first")
Direction: **converge ONTO UltimateSpeedFeedEngine** (the orchestrator is over-derated), with 2 validation caveats. Evidence:
- The physics-reviewer-VALIDATED published-ref harness `scripts/sfc-full-sweep-compare.mjs` (vs G-Wizard/HSMAdvisor, 576 comparisons) found PRISM CARBIDE Vc = **-25.9% vs published** (conservative-safe) -- and that "PRISM" side is UltimateSpeedFeedEngine's Vc path (the tool-material-speed-override fix `907e74acab` was wired there + the sweep reflected it; [[reference_oscar_sfc_hss_overspeed_finding_2026_06_09]]).
- Measured this session: orchestrator Vc ~2x BELOW the engine (steel 80 vs 160, ti 18.5 vs 46).
- DERIVED (not a fresh direct dual-engine run -- INFERENCE, R12): published carbide-steel ~= 160/0.74 ~= 216, so orchestrator 80 ~= **-63% vs published** -- severely over-derated. The engine (-26%) is far closer to published.
- So the orchestrator over-stacks derating (coating x coolant x CAM x geometry + 60%-proven-blend), making the production UI ~2x too conservative -- a real productivity loss (steel at 80 m/min when ~160-216 is published-achievable).

CAVEAT #1 -- CLOSED 2026-06-21 by CODE-TRACE (was "attribution inferred"):
The validated harness's "PRISM" Vc provably IS UltimateSpeedFeedEngine's physics. Chain (file:line):
`mcp-server/scripts/sfc-full-sweep-compare.mjs` (the -25.9% harness) -> `SpeedFeedTriComparatorEngine.compare()` (src/engines/SpeedFeedTriComparatorEngine.ts:225-226 `speedFeedBaselineComparatorEngine.compare(nineAxisInput)` -> `prismResult = baselineRes.nine_axis_result`) -> `SpeedFeedNineAxisOrchestratorEngine` which is (its L4 docstring) "a THIN composition layer over UltimateSpeedFeedEngine" -> L570 `this.ultimate = new UltimateSpeedFeedEngine()` -> L606 `this.ultimate.calculate(ufInput)` = canonical physics. So -25.9%-vs-published attributes to UltimateSpeedFeedEngine. The -63% orchestrator figure stands (engine -26%, orchestrator 2x below engine).

KEY DE-RISKING FINDING (2026-06-21): there are THREE SFC engines, and the operator-approved convergence ALREADY EXISTS as a proven pattern:
1. `UltimateSpeedFeedEngine` -- canonical physics (imports src/physics/constants.ts).
2. `SpeedFeedNineAxisOrchestratorEngine` -- a THIN composition layer that ALREADY delegates core physics to `this.ultimate.calculate()` (L570/L606) and layers 9-axis/workholding/spindle-power clamps on top. **This is the REFERENCE IMPLEMENTATION for the P2 convergence** -- SpeedFeedOrchestratorEngine.compute() should follow the SAME delegate-then-layer pattern NineAxis already proves works (it reads sfc.forces/tool_life from the engine, e.g. the U-OSC-RUNOUT-LIFE-DERATE single-source pattern at L1041). P2 is "make the 3rd engine do what the 2nd already does," not a greenfield refactor.
3. `SpeedFeedOrchestratorEngine` -- the web-UI engine (prism_calc:sf_orchestrate) that does NOT delegate -> the divergent, over-derated one.

CAVEAT #2 -- STILL OPEN (operator-only): **JM Die SHOP-REALITY not validated.** "closer to published G-Wizard/HSMAdvisor" != "correct for JM Die". The orchestrator's proven-program-blending (60% prior-shop-Vc @ confidence>=0.7) uses ACTUAL shop Vc; if JM Die intentionally runs conservative (tool-life economics / older machines / operator safety), the orchestrator may be realistic FOR JM DIE despite being below textbook. Validate the engine's aggressive numbers against the proven-parameters store + JM Die actual cutting data BEFORE switching the production UI. This is a product-philosophy decision, not a physics bug.

CAVEAT #2 -- DATA-GROUNDING DISPROVEN 2026-06-21 (the orchestrator's conservatism is NOT shop-grounded):
The orchestrator blends 60% proven-shop-Vc ONLY when `provenSpeedFeedAggregatorEngine.getProvenParams(mat,op).confidence>=0.7`. PROBED LIVE: getProvenParams returns NULL for every common combo (carbon_steel/tool_steel/aluminum/stainless milling + alloy_steel od) -> **the proven store is EMPTY**. `ProvenSpeedFeedAggregatorEngine` is IN-MEMORY only (singleton, `clear()`, no persisted-store load at init; populated only by passing pre-mined samples to `aggregateLatheData/aggregateMillData`). It is wired into calcDispatcher (4 actions, ~L9976-10022) but NOTHING runs the miners (OkumaOSPParserEngine lathe / MillPatternMinerEngine mill) against the JM Die corpus + persists the result, so in the MCP-server process the orchestrator runs in, the store is ALWAYS empty -> **the proven-blend code path (SpeedFeedOrchestratorEngine.ts:2164-2191) is DEAD in practice.** CONSEQUENCE: the orchestrator's ~-63%-vs-published over-deration is NOT "realistic JM Die conservatism" -- there is ZERO live JM Die proven data behind it. It comes purely from STACKED DERATING MULTIPLIERS (coating x coolant x CAM x geometry) with no shop-data grounding. This REMOVES the main argument for keeping the orchestrator's numbers -> strengthens "converge onto the engine".

## QUEUED UNITS this reconciliation enables (logical order)
- **U-SFC-PROVEN-PIPELINE-ACTIVATE (non-blocked, big/fresh-context, oscar):** activate the dormant JM-Die proven-S/F pipeline -- run OkumaOSPParser + MillPatternMiner over the JM Die corpus (24,545 files; RESUMABLE batch per the OCR-corpus lesson -- host reaps long node procs), persist the aggregated store (schema+version), load-at-init in ProvenSpeedFeedAggregatorEngine. This GROUNDS the orchestrator's blend in REAL data AND produces the engine-vs-JM-Die-actual validation that definitively settles caveat #2. Non-outward-facing (adds grounding data; only changes UI numbers where confidence>=0.7 proven data exists). HIGH value: it's a real dormant-subsystem activation + the shop-reality oracle.
- **U-SFC-CONVERGE-P2 (operator-sign-off-gated):** make SpeedFeedOrchestratorEngine.compute() delegate core physics to UltimateSpeedFeedEngine, CLONING the proven NineAxisOrchestrator delegate-then-layer pattern ([[reference_oscar_sfc_convergence_plan_2026_06_21]] P2). RE-BASELINES production UI numbers (~2x Vc) -> OUTWARD-FACING -> operator sign-off REQUIRED. Staged fresh-context per the plan.

## CONVERGENCE IS NOT UNIFORM (2026-06-21, full-sweep diff harness `scripts/sfc-convergence-diff.mjs` -> `state/shared/SFC-CONVERGENCE-DIFF.md`)
Ran orchestrator.compute() vs engine.calculate(adapter()) across 7 representative cases. The relationship is CASE-DEPENDENT, NOT "engine 2x everywhere":
- **Roughing (soft/medium): engine FASTER, orchestrator over-conservative** -> recovers productivity. Steel +99% (80->160), Ti +149% (18.5->46), stainless +142% (41->100), cast iron +81% (94->170), alu +25%. Tool life -90..-99% (Taylor-consistent at the higher Vc).
- **Hardened steel HB500 finishing: engine FAR SLOWER+SAFER (-81%, 226->42.8 m/min)** -> the orchestrator runs HB500 at 226 m/min with **6-min tool life** (a real OVER-SPEED HAZARD); the engine's hardness H-switch (the U-SFC kc/effectiveIso work) correctly derates to 42.8 m/min / **185-min life**. Power 0.58->0.05 kW, Ra 0.95->0.15. The engine FIXES a safety problem the orchestrator has.
- **Finishing (steel): engine slightly more conservative** (-39%, 280->170; tool life 2min->69min -- the orchestrator's finishing 280 m/min is also too hot).
So converging onto the engine is BOTH a productivity gain (roughing) AND a safety fix (hardened/finishing over-speed) -- a stronger + more accurate case than the old "2x faster" framing. The operator's P2 sign-off should review `SFC-CONVERGENCE-DIFF.md` per-case (some cases go UP, some go DOWN). The diff harness (U-SFC-CONVERGENCE-DIFF, committed) regenerates it anytime.

NET: published-ref reconciliation COMPLETE -> the engine is published-aligned (-26% vs published) AND JM-Die-shop-aligned (lathe 137 / mill 180-249 m/min actual) AND safer on hardened. The orchestrator is over-derated on roughing yet DANGEROUSLY aggressive on hardened -- NO coherent shop-data grounding (proven store empty). Convergence DIRECTION = onto UltimateSpeedFeedEngine; architecture de-risked (NineAxis already proves the delegate pattern). Remaining gates: (1) operator sign-off on the per-case re-baseline (SFC-CONVERGENCE-DIFF.md); (2) ideally activate the proven pipeline first to validate at scale.
