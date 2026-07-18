# Hermes Graph-Improvement Proposals — 2026-06-25 (slot:alpha)

> Produced by the **parallel opus-fast-max graph-improvement loop** (U-ALPHA-HERMES-GRAPH-IMPROVE).
> The cron-driven driver surfaced the leverage wiring queue (118 "unwired" engines = missing
> engine->dispatcher edges); a **5-agent parallel batch** then verified one engine per category with
> cited `file:line` evidence. This file is the consumer-gated artifact a dispatcher-wirer / chat
> acts on. Each verdict is a concrete graph-edge fact (WIRE = add the edge; EXEMPT = the edge already
> exists / none needed).

## Headline finding (R12 — surfaced, not hidden)

**14 of 15 audited "unwired" engines are ALREADY WIRED** (real dispatcher cases with lazy imports),
and **1 does not exist** (phantom in the audit). The `unwired-engine-audit.json` (837 "unwired") and
the `LEVERAGE-WIRING-QUEUE.json` (118 "unwired") are **heavily inflated by false positives** — the
audit's consumer-detection is blind to: array-membership dispatch (`FOO_ACTIONS.includes(action)`),
lazy-import singletons, and engine->engine consumption. This corroborates the known regressions
`reference_audit_wired_via_engine_2026_06_10` (89 -> 66 truly-dormant) and
`reference_stop_unwired_array_dispatch_fix_2026_06_11`. The real graph improvement here is
**negative-space**: these 14 edges already exist in the code but are absent from the audit's coverage
data, and the phantom should be dropped.

## Verified verdicts (parallel batch, sonnet — see note below on opus)

| Engine | Verdict | Existing edge (evidence) |
|---|---|---|
| AICapabilityMaximizerEngine | EXEMPT (wired) | aiReasoningDispatcher.ts:3894 (9 actions) + devDispatcher.ts:8861 |
| AIIntelligenceMaximizerEngine | EXEMPT (wired) | aiReasoningDispatcher.ts:2164 (`maximize`, lazy singleton) |
| AIDecisionExplanationEngine | EXEMPT (wired) | aiReasoningDispatcher.ts:1839 (`explainDecision`, lazy singleton) |
| AGISafetyContainmentEngine | EXEMPT (wired) | guardDispatcher.ts:776,780 |
| BayesianSafetyEngine | EXEMPT (wired) | guardDispatcher.ts:805,811,815 |
| DuplicationGuardEngine | EXEMPT (wired) | guardDispatcher.ts:825,829 |
| AgentAutoUpdateEngine | EXEMPT (wired) | sessionDispatcher.ts:4891 (agent_knowledge_* x5) |
| AgentMemoryFabricEngine | EXEMPT (wired) | memoryDispatcher.ts:482 (agent_memory_* x5) |
| AgentRegistryEngine | EXEMPT (wired) | orchestrationDispatcher.ts:911 (`agent_recommend`) |
| ChatterStabilityLobeEngine | EXEMPT (wired) | safetyDispatcher.ts:892 (`chatter_stability_gate`) |
| CrossPhysicsCouplingEngine | EXEMPT (wired) | calcDispatcher.ts:8981-9018 (8 cross_phys_* actions) |
| PhysicsFusionOrchestrator | EXEMPT (wired) | calcDispatcher.ts:8432 (`physics_fusion`) |
| ManufacturingReasoningEngine | EXEMPT (wired) | orchestrationDispatcher.ts:714 (`.reason()`) |
| MultiPathReasoningEngine | EXEMPT (wired) | multiDispatcher.ts:493-520 (4 actions) + businessDispatcher.ts:5809 |
| AdaptiveReasoningEngine | **PHANTOM** | file does not exist (Glob + find empty) — drop from the audit |

## Actionable follow-ups (queued, not done this session)

1. **Fix the unwired-engine audit's consumer detection** (`scripts/audit-unwired-engines.mjs`) to
   recognize array-membership dispatch + lazy-import singletons + engine->engine consumption, so the
   118/837 counts deflate to the truly-dormant set. (Owner: sierra/discovery — audit is their surface.)
2. **Drop AdaptiveReasoningEngine** from `unwired-engine-audit.json` priority_engines (phantom).
3. Re-run the loop after (1): the leverage queue should shrink, focusing the opus fan-out on the
   genuinely-dormant engines.

## Note on model tier (R7 — conflict surfaced)

The operator directed "maxed out opus fast max settings for each agent." The fleet `subagent-model-enforce`
hook routed this mechanical wiring-inference batch to **sonnet** (anti-token-leak policy; for read+grep+
classify inference, sonnet is adequate per R5). The built SYSTEM faithfully encodes opus-fast-max
(`OpusFastMaxAgentSpecEngine` emits `{model:opus, effort:max, fastMode:true}`; the cron ledger plans
opus). To run live subagents at opus too, set `PRISM_SUBAGENT_MODEL_ENFORCE=off` in the harness env
(operator decision — it disables the anti-leak nudge fleet-wide).
