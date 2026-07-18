---
name: reference_mill_test_inventory_2026_05_30
description: "Full mill test inventory (foxtrot, 2026-05-30): 247 files / 465 fails / 33 failing files. Root-caused into FIXED (MillingForceEngine stub->real, AI-engine barrel), ROUTED (oscar material classifier, echo hyperMILL), and test-config (document/timeouts). The remaining-fix list before mill closed-loop training."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.659Z
aliases: reference_mill_test_inventory_2026_05_30
---


# Mill Wizard test inventory + triage (foxtrot, 2026-05-30)

Operator mandate: "fix all issues and fill all gaps for mill wizard before we start closed loop training." Ran the full mill suite BATCHED with the 16GB heap (`NODE_OPTIONS=--max-old-space-size=16384 npx vitest run mill Mill MILL --no-coverage`). The prior default-heap OOM (exit 255) was purely a heap-size problem — 16GB completes cleanly.

## Baseline (pre-fix full run)
**247 test files matched · 33 failed files · 465 failed / 10926 passed / 273 skipped.** Failures were NOT 465 independent bugs — they collapsed to a handful of root causes.

## ✅ FIXED this session (committed `U-MILL-FORCE-CORE`, slot/foxtrot, +416/−9)
1. **MillingForceEngine was a STUB** (`compute()` returned `{ok:false,stub:true}`, "WIRE-EXEMPT" comment claiming "real engine never existed") — on the cutting-FORCE surface, the foundation of all mill speed/feed safety. Replaced with the real engine per `STUB-FIX-MS0 U-STUB01` spec: `calculate` (Kienzle Fc=kc1.1·ap·fz^(1-mc)·teeth), `checkDeflection` (Euler-Bernoulli δ=FL³/3EI, I=πd⁴/64), `predictChatter` (Tlusty/Altintas 6 lobes n=60·fn/((k+1)·Z) + cantilever fn∝1/L²), `verifyPower` (Vc=πd·rpm/1000, P=Fc·Vc/60000, torque). All cutting constants imported from `physics/constants.ts` (`CANONICAL_KIENZLE`/`getToolModulus`/`kienzleForce`/`resolveMaterial`) — never inlined. **41/41 tests pass.** Cleared dispatcher `[NOT_WIRED] mill_force_calculate/mill_power_verify`.
2. **`engines/index.ts` barrel was empty** (`export {}` — emptied to escape the old 7000-line 359-collision explosion) but MILL-AI-MS1 + MILL-HARD-MS8 import `MillingAIUltraIntelligenceEngine`/`FiveAxisAIUltraIntelligenceEngine` from it → `undefined` → `clearAll()` in `beforeEach` threw → **150-failure cascade**. Both engines exist on disk; verified 0 cross-collisions (37+29 exports) → added scoped `export *`. **MILL-AI-MS1 71→0, MILL-HARD-MS8 79→0.**

Net: **191 failures cleared, 2 files, fully verified.**

## ✅ SpeedFeedOrchestratorEngine material classifier + ai_reasoning — IMPLEMENTED by foxtrot (2026-05-31)
Originally routed to oscar, but oscar was on OSCAR-SFC-9AXIS-MS0 (different work), so foxtrot implemented it (coordinated via chat-bus, all-slots-access). MILL-HARD-MS1 **97→3 fails**, zero regressions across 327 SFC-consumer tests, **full 3-of-3 PASS**.
- `U-SFC-TOOLSTEEL-CLASSIFY` — `classifyToolSteel()` grade-state gate (D2/A2/S7/M2/H13; no-hardness OR <45 HRC → `tool_steel_annealed`/ISO **P**; 'hardened' keyword OR ≥45 HRC → `hardened_steel`/**H**; boundary strict 44→P/45→H; HRC>HB). New `tool_steel_annealed` MATERIAL_DB entry (kc1.1/mc reconciled to CANONICAL_KIENZLE.P via the SFO_CANONICAL_MAP else-branch — NOT inlined; vc_base 150/210 < plain steel 200/280 to keep "tool steel slower than 1045"). Removed d2/a2/s7/m2/h13 aliases from `hardened_steel` (classifier-owned). Annealed playbook warning.
- `U-SFC-AI-REASONING` — `AiReasoning` interface + `buildAiReasoning()` (decision_trace/explanation/hypotheses/uncertainty_analysis/risk_assessment/cost_benefit/meta_confidence/counterfactual/optimization). Satisfies BOTH KAR test families (fam1 "defined" + fam2 numeric ≥0; `optimization.tool_cost` name is test-mandated at MILL-HARD-MS1.test.ts:17214 — do NOT rename).
- **Handed back to oscar (3 PRE-EXISTING calibration, not foxtrot's diff):** aluminum MQL Vc 126<150, aluminum HSM rpm 2980<3000, D2@58 hardened Taylor tool-life 1<3 min; PLUS `CANONICAL_KIENZLE.S.mc=0.27` vs test/comment expecting 0.28 (AutoProgramOrchestratorEngine.test.ts:287) — constants.ts↔test reconcile. Also pre-existing latent: `mapToProvenMaterial` (L~2263) naive `.includes` labels annealed D2 as "tool_steel" proven group.

## ➡️ ROUTED → echo: hyperMILL/post
- HurcoV11MillMasterPostEngine.postSingle missing (~25), hypermill-ms9-ac-bridge validateACScript missing (10), HyperMillPluginDLL+PrismBridge.cs ENOENT (host-absent, 17), HyperMillMetricCfgExtractor 33.0/Metric.cfg/*.CFG ENOENT (corpus-absent, ~27; operator runs v31 not v33). corpus-presence subset → juliett.

## ⏳ REMAINING in-domain (next foxtrot session — re-verify post-force-fix)
Smaller mill files possibly partially cleared by the force fix; re-run to confirm: `millDispatcher.test.ts` (3, NOT_WIRED routes: MillStrategyNeuralEngine.selectStrategy/recommend, MillProgramOptimizerEngine.optimizeStrategy, MillKinematicsCollisionEngine.simulate, CADFeatureRecognitionEngine, ProcessPlannerEngine), `MillingPhysicsKernelEngine.test.ts` (3), `MillMasterOrchestratorFacadeEngine.test.ts` (6), `MillTurnOrchestrationEngine.test.ts` (6), `mill-cohesion.smoke.test.ts` (3), `mill-turn-swiss-pipeline.test.ts` (3). Plus test-config (not logic): MillStudio `document is not defined` (jsdom env, 14 → quebec/test-config), JMDieMillProgramHarvest 30s timeouts (real-archive scan 1733s — mock corpus or raise timeout, 17).

## How-to (reusable)
Enumerate: `node -e "fs.readdirSync('mcp-server/src/__tests__').filter(x=>/mill/i.test(x)&&x.endsWith('.test.ts'))"`. Run batched: `NODE_OPTIONS=--max-old-space-size=16384 npx vitest run <files> --reporter=json --outputFile=.tmp.json`, then parse `testResults[].assertionResults[].failureMessages` by frequency — distinct error messages reveal shared root causes far faster than reading files. [[feedback_always_fill_gaps]] · [[reference_chatter_engine_regression_2026_05_24]] (sibling P0, fixed prior session).
