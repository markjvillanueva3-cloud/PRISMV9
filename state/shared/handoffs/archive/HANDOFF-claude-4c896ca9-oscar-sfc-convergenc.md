---
session: claude-4c896ca9
topic: oscar-sfc-convergence
slot: oscar
written_at: 2026-06-21T06:00:49.437Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-4c896ca9
status: active
---

# HANDOFF: claude-4c896ca9
Updated: 2026-06-21T06:00:49.437Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-4c896ca9

## STATE
Oscar SFC session (2026-06-20..21). SHIPPED: 6 backend SFC-WIRING units (session 2, see reference_oscar_sfc_wiring_session2_2026_06_20) all 2-3 arm scrutiny PASS + gap #10 R8-verified-existing. FRONTEND PHASE-1 RECON -> discovered 2-ENGINE DIVERGENCE: the web UI runs SpeedFeedOrchestratorEngine.compute() (via prism_calc:sf_orchestrate, NOT ultimate_speed_feed), a SEPARATE physics engine that does NOT consume UltimateSpeedFeedEngine -- so the 6 units (+ all SFC-WIRING-MS0) do NOT reach the production web UI ([[reference_oscar_sfc_two_engine_divergence_2026_06_21]]). Operator chose CONVERGE (orchestrator delegates to UltimateSpeedFeedEngine). Comprehensive line-cited convergence plan produced ([[reference_oscar_sfc_convergence_plan_2026_06_21]]): delegate core-physics block (Vc..deflection), RETAIN orchestrator-only layers (8 resolvers, proven-blend, MC/Sobol/Weibull, safety loop, 296 playbook rules, PSN, calibration). 4 HIGHEST-RISK: MC-uncertainty wrapping (engine=point-estimates not 500-trial), calibration double-deration, proven-blend, safety-loop re-entry. Major STAGED refactor -> fresh context, regression harness FIRST (compute() has 0 direct tests + MC non-determinism), physics+safety review per stage, P2 re-baselines production UI numbers (operator sign-off). NO orchestrator edits made (correctly -- planned, not rushed). Detail: the 3 reference memories above + this handoff.

## RESUME
/startup-oscar /loop [10m] /goal -- CONVERGE SFC engines (operator-approved 2026-06-21). Make SpeedFeedOrchestratorEngine.compute() (web-UI engine via prism_calc:sf_orchestrate) delegate CORE PHYSICS to UltimateSpeedFeedEngine.calculate(). FULL line-cited plan + 4 highest risks + staged phases in memory reference_oscar_sfc_convergence_plan_2026_06_21. START with P0: write a NUMERIC-REGRESSION HARNESS for compute() (it has NO direct test coverage) -- BUT compute() runs 500-trial Monte-Carlo (check Math.random determinism; seed or use tolerance bands). THEN P1 input adapter, P2 delegate core physics (RE-BASELINES production UI numbers -> operator sign-off on shifts + resolve calibration double-count + proven-blend-via-input), P3 MC uncertainty mapping, P4 safety-loop re-entry, P5 forward new fields + web/src/types/speedfeed.ts + SpeedFeedPage.tsx render (coordinate quebec). Physics+safety review EACH stage.

## CONTEXT

