# Lathe Wizard — VERIFIED Wiring + AI-Head State (2026-07-01, slot:whiskey)

> **Supersedes** the framing of `LATHE-WIZARD-WIRING-AIHEAD-PLAN-2026-06-29.md` (which estimated
> "~3% of lathe capability reachable / ~97% orphaned"). That estimate was a **direct-name-grep
> artifact** — a delta-audit workflow (7 agents, `wf_285a3f8f`) re-ran it, then DETERMINISTIC
> verification (`scripts/audit-unwired-engines.mjs` + direct greps) corrected the per-unit orphan
> claims. This file is the verified ground truth. Do NOT re-chase the "orphaned engine" list from
> the 06-29 plan — most of those engines are wired via `prism_calc`/`prism_turning`.

## Deterministic proof (not agent judgment)
`node scripts/audit-unwired-engines.mjs` (2026-07-01, `state/shared/UNWIRED-ENGINE-AUDIT-2026-07-01.json`):
- **3869 canonical engines · 3655 WIRED-DIRECT · 33 via-orch · 128 wire-exempt · UNWIRED = 4.**
- The **4 unwired engines are `SFCInferenceGateWireEngine`, `BlueprintOCRAdapter`,
  `RealActualsCorpusEngine`, `MaterialMarketPriceResolverEngine`** — SFC / blueprint / training /
  pricing domains. **ZERO are lathe/turning engines.** The lathe wizard's engine→dispatcher wiring
  is COMPLETE.
- False-orphan examples the 06-29 plan (and the re-audit's Sonnet finders) mis-flagged:
  `TurningForceEngine` → wired `calcDispatcher.ts:8061` (`turning_force`); `CuttingMechanicsEngine`
  → wired `calcDispatcher.ts:1540-1560` (`merchant_analysis`/`milling_forces`/`cutting_temperature`/
  `crater_wear`); `ChatterPredictionEngine` → wired `calcDispatcher.ts:2211-2241`. All reachable.

## Surface counts (verified)
- `prism_turning` = **448 actions** (was 440; +8 this session, U-LW-GROOVE-DISPATCH).
- `prism_turning_program` = 14 · `prism_thread` = 22 · lathe-relevant `prism_calc` cases (force,
  merchant, chatter, thermal, wear) all live.

## AI HEAD — `LatheAIOrchestrationEngine` (verified live imports + call sites)
The "AI system at the head" is BUILT and drives the spine. Verified imports (grep, this session):
| Operator-named subsystem | Status | Evidence |
|---|---|---|
| **spine → runPipeline** | ✅ WIRED | imports `latheOrchestrationEngine` (:79) → `runPipeline`; program_text sole-sourced from spine (U-AIHEAD-01/16) |
| **LoRA / QLoRA** | ✅ WIRED | 49-engine LoRA stack + `LatheLoRAInferenceGateway`; safety/reason evaluators on dispatcher |
| **NN / deep-learning** | ✅ WIRED | `LatheAGI*` engines (continuous-learning, safety-containment) imported (:80,82); 11 AGI actions on `businessDispatcher:5075-5129` |
| **RAG** | ✅ WIRED | `latheTribalIntegrationEngine` (:84) → real 3,700-tip corpus, advisory-only (U-LW-RAG-ADVISORY, non-mutating) |
| **deep-reasoning** | ✅ WIRED | `latheDeepReasoningEngine` (:87) deterministic FMEA advisory (U-LW-DEEP-REASON-ADVISORY) |
| **self-improving** | ✅ WIRED | `LatheAGIContinuousLearning` + predicted-outcome `emitP2POutcome` (`TurningPrintToProgramEngine:3024+`); `recordGenerationFeedback` API (:1401) awaits actuals-feed |
| **mill-turn / Swiss** | ✅ WIRED | `millTurnSwissPipelineEngine` (:89) + `swissTypeIntelligenceEngine` (:91) + `knurlingEngine` (:93); guide-bushing/sub-spindle/B-axis/Y-axis/polygon all dispatcher-reachable |
| **GNN** | ❌ GENUINE GAP | no `LatheGNNBridgeEngine`, no `lathe_gnn_classify`; india owns GraphSAGE — bridge (don't rebuild) |
| **CAG (runtime)** | ❌ GENUINE GAP | fleet `galaxy-reasoning-bridge.mjs` has CAG, but the head's RETRIEVE step does not consult it at engine runtime (chat-time only) |

**AI-head architecture note (corrects 06-29 plan):** live code is **spine-first, AI-advisory-AFTER**
(`LatheAIOrchestrationEngine:1275` spine → `:1282+` advisory), NOT "AI pre-pass before physics".
This is *safer* than the plan framed it — AI never mutates emitted G-code; AI-OFF is byte-identical.

## SHIPPED this session
- **U-LW-GROOVE-DISPATCH** (`c42eb4913c`) — registered the 8 MS4b grooving/parting dispatcher
  actions (`turning_groove_*` + `turning_partoff_*`); `GrooveClassificationEngine` +
  `GrooveDepthGateHook` were built+tested but had 0 dispatcher actions (5 red round-trip tests →
  green, 58/58). SAFE-ADDITIVE (advisory/classification; default emitted G-code byte-identical).

## GENUINE remaining work

### A. Safe-additive — ENUMERATED, and BOTH candidates are the wrong build right now (2026-07-01, verify-before-write)
The two "GNN + CAG gaps" from the AI-head table were enumerated before building. Neither is a valid unit today:
1. **CAG runtime for the head — NON-UNIT (do not build).** CAG (cache-augmented generation) caches
   EXPENSIVE LLM generations. The head performs ZERO LLM inference: `rag_advisory` is a deterministic
   tribal lookup, `deep_reasoning_advisory` is *deterministic* FMEA, mill-turn/swiss/knurl are physics
   (`LatheAIOrchestrationEngine.ts:1335-1350`). There is nothing expensive to cache. No `.ts`-callable
   CAG cache exists in `src/engines`/`src/utils` (grep clean); CAG already serves the lathe galaxy at the
   correct layer (`galaxy-reasoning-bridge` CLI + the SessionStart CAG cold-anchor). Wrapping deterministic
   engine calls in a cache = over-engineering. CLOSED as not-a-gap.
2. **`LatheGNNBridgeEngine` — BLOCKED UPSTREAM (defer to india, do not build now).** The GNN it would
   bridge to is BELOW the deploy gate (PSN-leg NN/GNN AUROC 0.752 < 0.78, tier-5 dormant, owner: india).
   Wiring an advisory consumer to a model india has not cleared for deploy is building atop an unproven
   foundation (R13). It is also cross-galaxy (subprocess to india's GraphSAGE) and heavy. DEFER until
   india clears the GNN gate; then a graceful-degrading advisory bridge (abstain below gate) is viable.

**Consequence:** there is NO remaining non-operator-gated, non-upstream-blocked safe-additive lathe-head
build. The lathe wizard (wiring) + AI head (5 live subsystems) are functionally COMPLETE for whiskey's
scope. The remaining work is the OPERATOR-GATED list (§B) + india's GNN deploy gate (not a whiskey unit).

### B. OPERATOR-GATED (change live 100%-Okuma-fleet emitted G-code — need operator sign-off)
- **W03** `MachiningKnowledgeBaseEngine` → `constants.ts` reconcile (changes runtime kc1.1/mc → Fc/feeds).
- **W05b** Wear→Offset **auto-G10 writeback** (advisory today; actuation needs shop-floor sign-off).
- **W05e** InsertLife as **pipeline-blocking** gate (advisory today; blocking is a policy call).
- **AIHEAD-02** 3 program-mutating stages (`stageTnrcResolve` G41/42, `stageCssOptimize` G96/G50,
  `stageControllerDialect`) — wire report-only first; gate any program-line mutation.
- **SELFIMPROVE-01d** ActualFeedbackTuning **auto-recal of Taylor C/kc** into emission (keep read-only).
- **W07** any orphan post (Hurco/PP-Okuma/Swiss) as **DEFAULT emitter** (new actions OK; default stays OkumaB250).
- **#15 U-LW-THREAD-POLISH** — thread-depth factor unification (0.61 vs ISO 0.6134) + emit items
  (multi-start/internal/NPT/angle/spring) all change live OSP thread geometry.

## Non-blocking findings (surface, don't auto-fix)
- **Stale test sentinel:** `dispatcher.turningBridgeWire.test.ts:~328` "KNOWN ENGINE BUG" pins
  `trials_feasible===0`, but the engine now computes 30 (the cascade it pinned was fixed elsewhere;
  the paired ROUTING-PROOF test confirms dispatcher==engine-direct). The sentinel has FIRED by design
  ("a future cascade fix fails this test loudly and forces a doc/test update"). Owner = whoever landed
  U-FIX-TURNING-CASCADE-API (turning-stochastic); update to `toBeGreaterThan(0)` + refresh the title.
- **Dangling doc pointer:** `whiskey-lathe-context-inject.mjs` references `engines/lathe/KNOWLEDGE.md`
  (and `GSD.md`) which don't exist — safe-additive doc build.
