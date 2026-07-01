---
name: hermes-zulu-engines
description: Strategic engine digest for the hermes-zulu galaxy (Hermes agent-fleet orchestration, Zulu fleet-conductor, per-slot souls, multi-model consensus, model routing/escalation). ~40 flat .ts engines + ~49 scripts.
type: reference
galaxy: hermes-zulu
node_type: memory
---

# hermes-zulu galaxy -- engine digest

## Overview

hermes-zulu is PRISM's agent-fleet-ORCHESTRATION galaxy -- the conductor layer ABOVE the
25 NATO worker slots, not a machining domain (no physics constants apply). Two roles share
one galaxy dir: BRAVO builds (engines/hooks/souls/stub-hunts), ZULU is the live runtime
conductor (cross-slot synthesis, fleet directives, work-order distribution). Grounded in
`mcp-server/src/engines/hermes-zulu/{CLAUDE,MEMORY,PATHS}.md` (R12).

STRUCTURAL FACT: NO `.ts` engines live inside `mcp-server/src/engines/hermes-zulu/` -- that
dir is doctrine-only (`CLAUDE.md:36`). Every engine below lives FLAT in
`mcp-server/src/engines/*.ts` and is wired to `prism_session` / `prism_context` /
`memoryDispatcher` (there is NO named `hermes`/`zulu` dispatcher -- CLAUDE.md:61 confirms
`DISPATCHER_DIGEST.md` returns zero hits by design).

Core capability spine:
- Hermes proxy + managed-OAuth models: the Hermes desktop app runs as the ZULU master
  orchestrator. Per the 2026-06-30 operating doctrine (`MEMORY.md:14-15`), the desktop
  profile now runs LOCAL `gpt-oss:120b` on the Blackwell GPU; the earlier grok/nous/
  anthropic-proxy default was DROPPED. Provider clients (Grok/Moonshot/Ollama/etc.) remain
  as consensus voices, not the desktop default.
- Escalation ladder: model-tier routing (haiku -> sonnet -> opus) via `OpusCapabilityEngine`
  + backend routing (ollama -> anthropic/openai) via `ModelRoutingEngine`; safety-critical
  work always pins the highest-capability backend.
- Per-slot souls: 26 NATO soul frontmatter files (`state/shared/slot-souls/<nato>.md`) drive
  domain_filter / refuse_list / preferred_subagent_type; the auction + governor read them.
- Zulu fleet orchestration: soul-weighted task auction, read-only authority governor,
  wave/DAG scheduling, delegation contracts, capability attestation, back-pressure.
- Multi-model consensus (the "octopus"): fan a prompt to Claude + Codex + Grok + local
  Ollama voices in parallel, score agreement, surface disagreement as the gap signal.

## Strategic categories

1. **hermes-proxy-routing** -- provider clients + the model-backend router that decide
   which LLM (local Ollama vs paid frontier vs consensus panel) services a request.
2. **escalation-ladder / model-determinism** -- deterministic model-TIER complexity routing
   (haiku/sonnet/opus) + provenance ledger + cost-ratio single-source-of-truth.
3. **consensus-fanout (octopus)** -- multi-model parallel consensus + its supporting
   fact-check / quorum / audit / persistence / neural-feedback sub-engines.
4. **hermes-parallel-fanout** -- decompose a parent task into a subtask DAG, partition file
   scope (no-collide), budget per-fanout tokens, aggregate verdicts, self-correct.
5. **hermes-autonomous-drive** -- pure state-machine driver + goal decomposer + work-source
   feeder that chain the fan-out engines into a self-driving (gated) build loop.
6. **zulu-fleet-governance** -- read-only authority governor + delegation contracts +
   capability attestation/registry + task-continuity + fleet-health synthesis.
7. **zulu-task-scheduling** -- soul-weighted sealed-bid task auction + multi-wave DAG
   scheduler + adaptive back-pressure + dashboard control.
8. **per-slot-souls / slot-brief** -- targeted consume-once brief channel + soul-aware
   fanout extension + agent-specialization profiling + soul-evolution advisory.

## Key engines (detailed)

### MultiModelConsensusEngine.ts
The "octopus" -- fans a prompt to Claude + Codex + Grok + Gemini/DeepSeek/GLM + the strongest
runnable local Ollama voice in parallel, scores agreement (Jaccard + bag-of-words cosine for
`compare`, majority for `vote`), and treats disagreement as the gap signal. Each call is
timeout-wrapped so one slow model can't block; returns even on 1-of-N success (low confidence).
Largest engine in the galaxy (~80KB). Path: `mcp-server/src/engines/MultiModelConsensusEngine.ts`.
Notable: `ask()` (bus-broadcasts every invocation), `includeClaude` / `includeCodex` flags;
consumes `ConsensusFactChecker/ModelPerformance/ObsidianPersistence/AuditLog` sub-engines.

### OpusCapabilityEngine.ts
The deterministic model-TIER complexity router: classifies query complexity and routes TIER_1
(Haiku, simple lookups) / TIER_2 (Sonnet, multi-step) / TIER_3 (Opus, deep/novel/physics).
Token-budget-aware with a 1h TTL cache for expensive Opus queries. Exports the inter-tier cost
RATIO table (opus ~= 5x sonnet) as the single source of truth so downstream sizing derives from
it instead of inlining a multiplier. Path: `mcp-server/src/engines/OpusCapabilityEngine.ts`.
Wired `prism_session:opus_assess_complexity` + `opus_stats`. Notable: the pure `execute()` LLM
path is deferred (needs a live Anthropic client -- MEMORY.md:140-143).

### ModelRoutingEngine.ts
Pure scoring function that picks the LLM BACKEND (ollama / anthropic / openai) for a request from
its features + a live backend-availability snapshot -- no network I/O; execution is
`LocalModelOrchestratorEngine`'s job. Hard rules: safety-critical manufacturing decisions always
route to the highest-capability backend (never let a 3B model decide if a cut is safe); embeddings
always stay local; hard budgets win over scoring. Path: `mcp-server/src/engines/ModelRoutingEngine.ts`.
Notable: `TaskKind` / `Backend` / `HardwareProfile` types (incl `home_blackwell` RTX PRO 6000 96GB).

### MoonshotClientEngine.ts
HTTP client for Moonshot AI's Kimi API (OpenAI-compatible /v1/chat/completions), default
`kimi-k2` (~1T-param MoE, too large for local GPU) -- a 6th consensus voice with strong 200K+
long-context + tool-use. Also serves as zulu's heavy-reasoning lever per the fleet-synthesis
pattern (CLAUDE.md:165). Path: `mcp-server/src/engines/MoonshotClientEngine.ts`. Notable:
`MoonshotExecOptions`, requires `MOONSHOT_API_KEY`. (Doctrine also names it "Opus invocation" --
its runtime role is the hosted-Kimi voice + the heavy-reasoning escalation target.)

### GrokClientEngine.ts
HTTP client for xAI's Grok API (OpenAI-compatible endpoint at api.x.ai), default `grok-4` with
reasoning mode; requires `XAI_API_KEY`. Explicitly `// WIRE-EXEMPT`: a provider CLIENT consumed by
`MultiModelConsensusEngine` (the octopus, wired via `prism_ai:consensus`) and `GrokCLIClientEngine`,
never its own dispatcher case. Path: `mcp-server/src/engines/GrokClientEngine.ts`. Notable:
`GrokExecOptions`; sibling `GrokCLIClientEngine.ts` wraps the grok CLI path.

### ZuluWaveSchedulerEngine.ts
Pure deterministic multi-wave DAG scheduler that closes the gap in
`HermesParallelFanoutPlannerEngine` (which only ever emits WAVE 1). `computeWaveN(plan,completed)`
= the next ready wave; `allWaves(plan)` = the full Kahn level-by-level topological partition
(each subtask in exactly one wave). Cycle -> THROWS (never infinite-loops), naming the cycle
members. Path: `mcp-server/src/engines/ZuluWaveSchedulerEngine.ts`. Notable: reuses the canonical
`SubtaskSchema` so a plan flows planner -> scheduler with no re-hydration.

### ZuluTaskAuctionEngine.ts
Pure-core soul-weighted sealed-bid task auction: when N slots could claim a task, each bid is
deterministic from soul domain_filter match (weight 4.0), refuse_list hit (binary veto), queue
depth (penalty), and success-rate prior; ties break by success-rate then slot name. Path:
`mcp-server/src/engines/ZuluTaskAuctionEngine.ts`. Wired `prism_session:zulu_task_auction`.
Notable: `MAX_QUEUE_DEPTH=10000`, `BidderSchema`; reads `SlotSoul` from `SoulFrontmatterReaderEngine`.

### ZuluFleetGovernorEngine.ts
The pure, READ-ONLY authority gate: `checkAuthority(slot, task_text, operation) -> verdict` from
soul refuse_list / domain_filter / orchestrator-role, fail-CLOSED on malformed regex. Wired
READ-ONLY `prism_session:zulu_authority_check` (+ `_render`). CRITICAL: the `:8767` fleet-control
actuation path (veto/escalate/promote) is GOVERNANCE-GATED and dark -- zero slots have `zuluOptIn`
(readiness NO-GO). Path: `mcp-server/src/engines/ZuluFleetGovernorEngine.ts`. Notable: distinct
from the delegation pre-gate (below).

### ZuluDelegationContractEngine.ts
Time/token/galaxy-bounded authority DELEGATION contracts -- a PRE-GATE consulted BEFORE the
governor. `composeGatedAuthority()` is STRICTLY NARROWING: a delegation verdict can only turn a
governor ALLOW into a DENY (expired/revoked/over-cap), NEVER a DENY into an ALLOW; fail-CLOSED,
corrupt store -> governor base authority. Deliberately does NOT implement scope-WIDENING (the
dangerous direction). Path: `mcp-server/src/engines/ZuluDelegationContractEngine.ts`.

### ZuluCapabilityAttestationEngine.ts
Outcome-correlated capability trust: correlates a slot's SOUL-DECLARED domain affinity against
empirical success history and emits an advisory multiplicative `bid_modifier` (always > 0 --
ADVISORY, never a veto) the auction applies to `domain_match`. Uses the Wilson score interval
LOWER bound so n=1 success never yields overconfident 1.0; below MIN_SAMPLE_N -> neutral 1.0
(R12 honest -- no fabricated trust). Path: `mcp-server/src/engines/ZuluCapabilityAttestationEngine.ts`.

### HermesParallelFanoutPlannerEngine.ts
Decomposes a parent task into N subtasks and emits the initial parallelizable wave (leaf-filter
on `depends_on`). The canonical `SubtaskSchema` / `Subtask` type it defines is reused fleet-wide
by the wave scheduler + autonomous driver + work-source feeder. Path:
`mcp-server/src/engines/HermesParallelFanoutPlannerEngine.ts`. Wired `prism_session:hermes_fanout_plan`.

### HermesAutonomousDriverEngine.ts
The autonomous-build DRIVER: a PURE deterministic state machine (`start`/`nextBatch`/
`recordResults`/`isComplete`/`aggregate`) that chains the wave engines into a self-driving loop
WITHOUT any I/O or agent-spawning -- the risky spawn half stays in a gated consumer. Hard
`maxIterations`/`maxRetries` bounds guarantee termination (no unbounded /goal spiral). Path:
`mcp-server/src/engines/HermesAutonomousDriverEngine.ts`. Orchestrates over `ZuluWaveSchedulerEngine`.

### HermesWorkSourceFeederEngine.ts
The missing FEEDER: a pure adapter turning heterogeneous PRISM work-source rows (open roadmap
units, research/wiki tasks, unwired-engine gaps, galaxy-synthesis gaps) into the canonical
`Subtask[]` -- after deduping against live slot-task claims (so a Hermes agent never races a
worker) and risk-classifying each (read-only -> local Ollama plan-only; code -> cloud; safety
-> always plan-only). Path: `mcp-server/src/engines/HermesWorkSourceFeederEngine.ts`.

### AgentSpecializationProfileEngine.ts
Defines/manages agent specialization profiles (capabilities, knowledge domains, tool access,
coordination patterns) with task-to-profile scoring + multi-agent team composition + dynamic
adaptation. Integrates with `OpusCapabilityEngine` (tier routing) + `MultiAgentAIInterfaceEngine`.
Path: `mcp-server/src/engines/AgentSpecializationProfileEngine.ts`. Notable: sibling
`SoulAwareFanoutExtenderEngine.ts` extends a fanout plan with per-slot soul awareness.

### SlotBriefEngine.ts
The secure lane-confined WRITE side of the targeted consume-once slot-brief channel (Hermes ->
a specific slot's context). Wired `prism_context:slot_brief_{write,list}`; the READ side is the
`slot-brief-inject.mjs` hook. One of the three inter-chat channels (soul=persistent /
chat-bus=broadcast / slot-brief=targeted-once). Path: `mcp-server/src/engines/SlotBriefEngine.ts`.

### ModelAttributionEngine.ts
The fleet model-provenance ledger: records which model/provenance answered + a token/latency
badge (for the /aware skill). Pure in-memory. Wired
`prism_session:model_attribution_{record,summary,recent,find,badge}`. Path:
`mcp-server/src/engines/ModelAttributionEngine.ts`.

## Non-engine substrate

Hermes carries heavy SCRIPT/proxy/hook substrate (~49 non-test hermes/zulu/ask scripts) --
often more load-bearing at runtime than the engines. Key ones:
- `scripts/ask-hermes.mjs` -- fleet-facing Hermes-proxy query CLI (health-gated per the
  2026-06-29 live-probe fix in `reconcile-zulu-ledger.mjs`).
- `scripts/ask-ollama.mjs` -- local-Ollama offload CLI (viz/rerank/summarize/explain/triage/ask
  modes; warm qwen2.5-coder:32b) -- the $0 fallback voice; `ask-openrouter.mjs` = OpenRouter arm.
- `scripts/hermes-subscription-proxy.mjs` -- the Hermes -> Claude-Max subscription/OAuth proxy.
- `scripts/hermes-proxy-ensure.mjs` + `scripts/hermes-doctor.mjs` -- launch-readiness + config
  drift-guard (backing the `PRISM Hermes Doctor` scheduled task).
- `scripts/prism-mcp-for-hermes.mjs` -- the lean 6-tool Hermes->PRISM MCP facade (replaced the
  heavy :3100 that timed out launch).
- `scripts/hermes-model-router.mjs` -- runtime model-router glue for the proxy.
- `scripts/hermes-mcp-server.mjs` / `scripts/hermes-control-bridge.mjs` -- Hermes MCP surface +
  the (governance-gated) fleet-control bridge.
- `scripts/reconcile-zulu-ledger.mjs` -- context-regain FIRST step + the meta-health Hermes
  live-probe gate; `scripts/zulu-orchestrator-sweep.mjs` -- the `PRISM Zulu Orchestrator` task.
- `scripts/octopus-with-hermes-rag.mjs` -- octopus consensus + Hermes RAG entry point.
- `scripts/hermes-self-reflect-populater.mjs` + `scripts/hermes-dream-cycle-synth.mjs` -- weekly
  reflection + offline dream-cycle synth.
- Hooks (`.claude/hooks/`): `slot-context-bundle-inject.mjs`, `slot-soul-inject.mjs`,
  `zulu-advisory-inject.mjs`, `slot-brief-inject.mjs`, `auto-consensus-critical-edit` (PreToolUse
  Edit|Write gate), `stop-slot-task-claims-advisory.mjs`.

## OVERLAP CAVEAT (agent-orchestration galaxy)

This galaxy shares the flat engine dir with `engines/agent-orchestration/` (a symmetric C2 peer
per CLAUDE.md:195). Engines kept below are Hermes/Zulu-conductor + consensus/model-routing
(named in this galaxy's doctrine or its `Initial state`). The following name-matched the raw grep
but LEAN agent-orchestration / cross-galaxy and are listed for completeness, NOT claimed as
hermes-zulu-primary: the `Consensus*` sub-engine family (fact-checker/quorum/audit/recall-cache/
neural-feedback/coordinator/performance/obsidian-persistence -- support cast for the octopus),
the `Dream*` family (`DreamMarkerScanner` IS hermes-wired; consolidation/loop/artifact-bundle
lean broader), `Fleet*Learning`, `*Escalation` (Alarm/Safety/Gap/Soul -- safety+compliance
domains), and `AutodeskFusionMCPProxyEngine` / `JMDieFleetWideIngestEngine` / `CADConsensusEngine`
(other galaxies). Verify ownership before building a consumer on any of those (R12).

## Full engine index

Marked "(name-derived)" = header NOT read this pass; role inferred from doctrine + filename, treat
as UNVERIFIED until Read. "(overlap)" = leans agent-orchestration / another galaxy, not hermes-zulu-primary.

| Engine | Category | One-line |
|--------|----------|----------|
| MultiModelConsensusEngine.ts | consensus-fanout | Octopus: fan prompt to Claude+Codex+Grok+Ollama, score agreement, disagreement=gap signal. |
| OpusCapabilityEngine.ts | escalation-ladder | Deterministic haiku/sonnet/opus TIER router + cost-ratio source-of-truth + Opus cache. |
| ModelRoutingEngine.ts | hermes-proxy-routing | Pure scorer picking backend (ollama/anthropic/openai); safety-critical -> highest capability. |
| ModelAttributionEngine.ts | escalation-ladder | Fleet model-provenance ledger (which model answered + token/latency badge). |
| MoonshotClientEngine.ts | hermes-proxy-routing | HTTP client for Moonshot Kimi-K2 -- 6th consensus voice + heavy-reasoning lever. |
| GrokClientEngine.ts | hermes-proxy-routing | xAI Grok API client (grok-4); WIRE-EXEMPT consensus voice. |
| GrokCLIClientEngine.ts | hermes-proxy-routing | grok CLI wrapper client path (name-derived). |
| HermesParallelFanoutPlannerEngine.ts | hermes-parallel-fanout | Decompose parent task -> subtask DAG; emits wave-1; owns canonical SubtaskSchema. |
| HermesFileScopePartitionerEngine.ts | hermes-parallel-fanout | Partition file scope across a fanout so agents don't collide (name-derived). |
| HermesParallelBudgetEnvelopeEngine.ts | hermes-parallel-fanout | Per-fanout token/turn budget envelope (name-derived). |
| HermesParallelVerdictAggregatorEngine.ts | hermes-parallel-fanout | Merge parallel-agent verdicts into one (name-derived). |
| HermesSelfCorrectionEngine.ts | hermes-parallel-fanout | Self-correction/retry loop for a fanout wave (name-derived). |
| HermesAutonomousDriverEngine.ts | hermes-autonomous-drive | Pure state-machine driver chaining wave engines into a self-driving (gated) loop. |
| HermesAutonomousDriveRunnerEngine.ts | hermes-autonomous-drive | Gated runner that spawns agents per driver batch (name-derived). |
| HermesGoalDecomposerEngine.ts | hermes-autonomous-drive | Decompose a high-level goal into a fanout plan (name-derived). |
| HermesWorkSourceFeederEngine.ts | hermes-autonomous-drive | Pure adapter: PRISM work-source rows -> Subtask[], claim-deduped + risk-classified. |
| HermesWorkSourceFeederEngine (feeder) | hermes-autonomous-drive | (see above) |
| HermesSubstrateHealthEngine.ts | zulu-fleet-governance | Hermes substrate/backend health rollup (name-derived; cf. hermes-substrate-health.mjs). |
| HermesAutomationBridge.ts | hermes-proxy-routing | Bridge to Hermes desktop automation surface (name-derived). |
| ZuluTaskAuctionEngine.ts | zulu-task-scheduling | Soul-weighted sealed-bid task auction across slots. |
| ZuluWaveSchedulerEngine.ts | zulu-task-scheduling | Pure Kahn multi-wave DAG scheduler; cycle -> throws. |
| ZuluAdaptiveBackPressureEngine.ts | zulu-task-scheduling | Adaptive back-pressure on fleet fanout under load (name-derived). |
| ZuluDashboardControlEngine.ts | zulu-task-scheduling | Fleet dashboard control surface (name-derived). |
| ZuluFleetGovernorEngine.ts | zulu-fleet-governance | READ-ONLY authority gate; :8767 actuation governance-gated (dark). |
| ZuluDelegationContractEngine.ts | zulu-fleet-governance | Bounded authority delegation pre-gate; strictly NARROWING, fail-closed. |
| ZuluCapabilityAttestationEngine.ts | zulu-fleet-governance | Outcome-correlated capability trust; Wilson-CI advisory bid_modifier (>0, never veto). |
| ZuluCapabilityRegistryEngine.ts | zulu-fleet-governance | Registry of slot/agent capabilities (name-derived). |
| ZuluFleetHealthSynthesisEngine.ts | zulu-fleet-governance | Synthesize fleet health signals into a rollup (name-derived). |
| ZuluTaskContinuityEngine.ts | zulu-fleet-governance | Task continuity/resume across compact/restart (name-derived). |
| ZuluSoulEvolutionAdvisorEngine.ts | per-slot-souls | Advises soul-frontmatter evolution from outcomes (name-derived). |
| SlotBriefEngine.ts | per-slot-souls | Secure lane-confined WRITE side of the consume-once slot-brief channel. |
| SoulAwareFanoutExtenderEngine.ts | per-slot-souls | Extend a fanout plan with per-slot soul awareness (name-derived). |
| AgentSpecializationProfileEngine.ts | per-slot-souls | Agent specialization profiles + task-to-profile scoring + team composition. |
| OpusFastMaxAgentSpecEngine.ts | escalation-ladder | Opus-fast/max agent spec + budget table (name-derived; derives cost from OpusCapability). |
| DreamMarkerScannerEngine.ts | consensus-fanout | Parse offline DREAM: markers -> proposals; wired dream_scan (hermes-wired). |
| DreamConsolidationEngine.ts | consensus-fanout | (overlap) Offline dream consolidation (name-derived). |
| DreamLoopProposalEngine.ts | consensus-fanout | (overlap) Dream-loop proposal gen (name-derived). |
| DreamArtifactBundleEngine.ts | consensus-fanout | (overlap) Dream artifact receipt/bundle surface (name-derived). |
| ConsensusCoordinatorEngine.ts | consensus-fanout | (overlap) Coordinates a consensus round (name-derived). |
| ConsensusQuorumEngine.ts | consensus-fanout | (overlap) Quorum rule for consensus (name-derived). |
| ConsensusFactCheckerEngine.ts | consensus-fanout | Fact-check pass over consensus answers (octopus sub-engine). |
| ConsensusAuditLogEngine.ts | consensus-fanout | Audit log of consensus rounds (octopus sub-engine). |
| ConsensusModelPerformanceEngine.ts | consensus-fanout | Per-model performance tracking (octopus sub-engine). |
| ConsensusObsidianPersistenceEngine.ts | consensus-fanout | Persist consensus outcomes to Obsidian (octopus sub-engine). |
| ConsensusRecallCacheEngine.ts | consensus-fanout | (overlap) Recall cache for consensus answers (name-derived). |
| ConsensusNeuralFeedbackEngine.ts | consensus-fanout | (overlap/AI) Neural feedback from consensus outcomes (name-derived). |
| ConsensusAIBridgeEngine.ts | consensus-fanout | (overlap/AI) Bridge consensus into the AI substrate (name-derived). |
| FleetDeploymentLearningEngine.ts | zulu-fleet-governance | (overlap) Learn from fleet deployments (name-derived). |
| FleetLearningStrategyEngine.ts | zulu-fleet-governance | (overlap) Fleet-learning strategy selection (name-derived). |
| AlarmEscalationEngine.ts | escalation-ladder | (overlap: compliance-safety) Alarm escalation ladder (name-derived). |
| SafetyEscalationEngine.ts | escalation-ladder | (overlap: compliance-safety) Safety escalation ladder (name-derived). |
| GapEscalationControllerEngine.ts | escalation-ladder | (overlap) Gap escalation controller (name-derived). |
| SoulEscalationCheckerEngine.ts | per-slot-souls | (overlap) Soul-based escalation check (name-derived). |
| SoulConsensusEngine.ts | per-slot-souls | (overlap) Soul-weighted consensus (name-derived). |
| SoulFleetRollupEngine.ts | per-slot-souls | (overlap) Roll up fleet soul state (name-derived). |
| AutodeskFusionMCPProxyEngine.ts | (overlap: cad-fusion-live) | Fusion MCP proxy -- NOT hermes-zulu (name-derived). |
| CADConsensusEngine.ts | (overlap: cad) | CAD-domain consensus -- NOT hermes-zulu (name-derived). |
| JMDieFleetWideIngestEngine.ts | (overlap: database/JM-Die) | JM-Die fleet-wide ingest -- NOT hermes-zulu (name-derived). |

_Digest by slot:sierra (system-viz). Grounded in hermes-zulu/{CLAUDE,MEMORY,PATHS}.md + read
headers of the 14 largest core engines. Name-derived + overlap rows are UNVERIFIED -- Read the
header before building a consumer (R12). Engines live FLAT in mcp-server/src/engines/; the galaxy
subdir is doctrine-only. Regenerate by re-running this enumeration when the flat engine set changes._
