---
name: agent-orchestration-engines
description: Strategic engine digest for the agent-orchestration galaxy -- multi-agent swarm orchestration, per-task model routing, multi-model consensus (octopus), 26-slot fleet coordination, ATCS autonomous task completion, and the Zulu fleet-governor family. Engines live FLAT in mcp-server/src/engines/*.ts; the galaxy subdir holds doctrine + corpus only.
type: reference
galaxy: agent-orchestration
node_type: memory
---

# agent-orchestration galaxy -- engine digest

## Overview

The agent-orchestration galaxy is PRISM's fleet brain: it coordinates WHICH slot/agent/model does WHICH work across the up-to-26-chat NATO fleet (`alpha..zulu`), runs multi-agent swarm + consensus topologies, routes each task to the right backend model (Ollama-first -> Sonnet -> Opus ladder), and drives autonomous task completion (ATCS state machine). Slot affinity is `zulu` (per ZULU-OMNISCIENT-MS0 + ZULU-ORCHESTRATOR-MS0), but any slot may orchestrate via `prism_orchestrate`. Primary dispatchers: `prism_orchestrate` (~71 actions, swarm/agent-spawn/roadmap-exec), `prism_atcs` (~12, file-system state machine behind `/loop` `/autopilot-full` `/yolo`), `prism_autopilot_d` (~7), `prism_autonomous` (~8, bridges ATCS), `prism_omega` (~6, quality gate).

STRUCTURAL FACT (verified this session): engine `.ts` files live FLAT under `mcp-server/src/engines/`, NOT in `mcp-server/src/engines/agent-orchestration/` (that subdir holds `CLAUDE.md` / `PATHS.md` / `MEMORY.md` / `TOOLBELT.md` / `AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md` doctrine only). Confirmed by CLAUDE.md:40-41 and MEMORY.md:53. Much of the actual fleet orchestration is ALSO file-system-native, running through hooks/helpers/scripts rather than in-process engines -- see the "Key hooks / helpers / scripts" section below; those are the load-bearing coordination substrate the `.ts` engines wrap.

Enumeration note (R12, honest count): a raw keyword grep for `Agent|Orchestrat|Fleet|Swarm|Slot|Coordinat|Router|Consensus|Autopilot|ATCS|Octopus` over the flat engine tree returns ~190 files, but the OVERWHELMING majority are DOMAIN orchestrators/routers that belong to OTHER galaxies (CAM/CAD/Lathe/Mill/WEDM/PostProcessor/SpeedFeed LoRA + AGI orchestrators, e.g. `LatheLoRAMasterOrchestratorEngine`, `CAMKernelOrchestratorEngine`, `MillingAGIOrchestrationEngine`, `WireEDMNeuralOrchestrationEngine`, `SpeedFeedOrchestratorEngine`). Those are EXCLUDED here (CLAUDE.md sec 1 EXCLUDES). After refining against the doctrine's sec 2 verified list + sec 12 known assets, **57 engines** are true agent-orchestration citizens -- the set below. Domain LoRA-orchestrators + per-CAM AGI-orchestrators are deliberately NOT padded in.

## Strategic categories

1. **Multi-agent orchestration + task queue** -- `AgentExecutor`, `MultiAgentCoordinatorEngine`, `AgentWorkflowEngine`, `HybridAgentDispatchEngine`, `MultiToolOrchestratorEngine`, `MultiAgentAIInterfaceEngine`, `MultiAgentCostTelemetryEngine`. Agent lifecycle, priority task queue, parallel/sequential/consensus/hierarchical coordination patterns, result synthesis.
2. **Swarm topologies** -- `SwarmExecutor`, `SwarmGroupExecutor`, `SwarmAlgorithmsEngine`, `SwarmNeuralHybridEngine`, `CoordinatorSwarmEngine`. Parallel / pipeline / map-reduce / consensus / hierarchical / ensemble / competition / collaboration swarm patterns.
3. **Multi-model consensus (octopus)** -- `MultiModelConsensusEngine`, `ConsensusCoordinatorEngine`, plus the consensus support family (`SoulConsensusEngine` for slot-soul-weighted panels). Fan a prompt to Claude + Codex/GPT + a local Ollama voice, score agreement (Jaccard/cosine, compare/vote modes), surface disagreement as the gap signal.
4. **Per-task model routing** -- `LocalModelOrchestratorEngine`, `TaskAgentClassifier`, `SoulSubagentRouterEngine`, `OpusFastMaxAgentSpecEngine`. Route each request to ollama/anthropic/openai backend with fallback chains; classify tasks -> recommended agent + swarm pattern + tier (opus/sonnet/haiku).
5. **Fleet + cross-terminal coordination** -- `CrossTerminalCoordinationEngine`, `CrossTerminalBroadcastEngine`, `CrossSessionOrchestratorEngine`, `MultiSessionHandoffCoordinatorEngine`, `CoordinationStoreEngine` (SQLite-WAL claim store), `CoordinationLedgerEngine`, `PeerLearningCoordinatorEngine`, `OperatingSystemCoordinationEngine`. Multi-terminal work distribution, dedup, claim stores, cross-session continuity.
6. **Zulu fleet-governor family** -- `ZuluFleetGovernorEngine` (authority gate), `ZuluTaskAuctionEngine` (soul-weighted sealed-bid task assignment), `ZuluWaveSchedulerEngine`, `ZuluAdaptiveBackPressureEngine`, `ZuluCapabilityRegistryEngine`, `ZuluCapabilityAttestationEngine`, `ZuluDelegationContractEngine`, `ZuluTaskContinuityEngine`, `ZuluDashboardControlEngine`, `ZuluFleetHealthSynthesisEngine`, `ZuluSoulEvolutionAdvisorEngine`. The zulu-owned governance layer over the 26-slot fleet (HZP-DASH-MS0 / HZP family).
7. **Slot / soul management** -- `SlotBriefEngine`, `SlotSessionHistoryEngine`, `SoulFrontmatterReaderEngine`, `SoulFleetRollupEngine`, `SoulAwareFanoutExtenderEngine`, `SoulEscalationCheckerEngine`, `SoulHtmlRenderEngine`. Per-slot brief/history + slot-soul frontmatter reads that drive routing/authority.
8. **Autonomous execution + agent memory/registry** -- `AutonomousAIOrchestrationEngine`, `MetaAIOrchestrationEngine`, `FullSystemAICoordinatorEngine`, `AgenticLoopEngine` (Observe-Think-Act), `ManusATCSBridge` (ATCS -> background AI), `AgentRegistryEngine`, `AgentMemoryFabricEngine`, `AgentSelfAwarenessEngine`, `AgentSpecializationProfileEngine`, `AgentAutoUpdateEngine`, `HardenedAgentCapabilitiesEngine`, `CrossDomainOrchestratorEngine`, `FleetDeploymentLearningEngine`, `FleetLearningStrategyEngine`.

## Key engines (detailed)

### MultiModelConsensusEngine.ts
The "octopus" -- fans a prompt out to Claude + Codex/GPT-5.5-xhigh + the strongest RUNNABLE local Ollama voice (selected by `OllamaCapabilityProbeEngine`, not hardcoded) in parallel, scores agreement, and recommends an answer. Two modes: `compare` (independent answers, Jaccard token-overlap + normalized cosine) and `vote` (each model chooses from N options, majority wins). Each underlying call has its own timeout so one slow model can't block; returns even if only 1 of 3 succeeds (low confidence). Pure orchestrator -- the caller drives the prompt. Path: `mcp-server/src/engines/MultiModelConsensusEngine.ts` (1554 lines, largest in galaxy). Milestone INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS; `includeClaude` flag gates the `claude -p` subprocess.

### ConsensusCoordinatorEngine.ts
Concurrency-aware wrapper around `MultiModelConsensusEngine`, built for the 6+-simultaneous-terminal reality where naive fan-out from every terminal would saturate the shared Codex/Ollama/Claude resources and exhaust the daily token budget. Adds a file-backed prompt+taskType-hash cache (1h TTL, JSONL), file-locked in-flight tracking (`data/state/consensus-inflight.json`), and quorum/throttle so a fleet of terminals dedups identical consensus calls. Path: `mcp-server/src/engines/ConsensusCoordinatorEngine.ts` (500 lines). Milestone INTEL-OLLAMA-OBSIDIAN-MS0 / AUTO-CONSENSUS.

### AgentExecutor.ts
Multi-agent orchestration core: agent lifecycle (create/execute/monitor/terminate), priority task queue, parallel + sequential execution, result aggregation/synthesis, retry-on-error, agent communication/handoff, execution history/analytics. Marked SAFETY CRITICAL (agents may drive manufacturing -- all executions logged/traceable). Consumes `agentRegistry`, `hookRegistry`, `hookEngine`, effort tiers. Notable exports: `TaskStatus`, `TaskPriority`, `TaskResult`, `agentExecutor` singleton. Path: `mcp-server/src/engines/AgentExecutor.ts` (978 lines). It is the substrate `SwarmExecutor` builds on.

### SwarmExecutor.ts
Advanced multi-agent coordination patterns layered over `AgentExecutor`: PARALLEL, PIPELINE, MAP_REDUCE, CONSENSUS (vote), HIERARCHICAL (refining layers), ENSEMBLE (weighted combo), COMPETITION (best-by-confidence), COLLABORATION (iterative shared result). Marked SAFETY CRITICAL -- consensus/validation prevent conflicting manufacturing recommendations. Notable export: `SwarmPattern` union type. Path: `mcp-server/src/engines/SwarmExecutor.ts` (1132 lines). Companion `SwarmGroupExecutor.ts` (365 lines) handles grouped swarm dispatch.

### AutonomousAIOrchestrationEngine.ts
Self-reliant AI orchestration: autonomous skill selection/execution, hook triggering/chaining, script auto-exec, multi-dispatcher orchestration, engine/algorithm/formula auto-selection, knowledge-source utilization, self-improvement feedback loops, GSD automation. Consumes `deepAIIntelligenceEngine`, `aiFeatureAutoRegistry`, `prismSelfAwarenessEngine`. Notable export: `ExecutionMode`. Path: `mcp-server/src/engines/AutonomousAIOrchestrationEngine.ts` (1206 lines). (Its docstring's inline counts are self-described and drift -- do not trust them; read PRISM-INVENTORY-LATEST.md.)

### MultiAgentCoordinatorEngine.ts
Domain-specialist coordinator: routes complex manufacturing tasks across typed specialist agents (Physics/Optimization/Quality/Safety/Tribal/Planning) and synthesizes their outputs into a unified recommendation. Coordination patterns: Parallel / Sequential (dependency order) / Consensus (vote) / Hierarchical (lead delegates). Path: `mcp-server/src/engines/MultiAgentCoordinatorEngine.ts` (1159 lines). Distinct from `AgentExecutor` -- this one is manufacturing-domain-aware, the executor is generic.

### AgenticLoopEngine.ts
The Observe-Think-Act(-Learn) core loop primitive (AGENT ROADMAP U-AGT13 / MS4): OBSERVE (parse intent, gather context) -> THINK (reason, evaluate options via `ManufacturingReasoningEngine`) -> ACT (execute via `ToolExecutionEngine`) -> LEARN (update memory). Composes `IntentRouterEngine`, `ManufacturingReasoningEngine`, `ToolExecutionEngine`. Path: `mcp-server/src/engines/AgenticLoopEngine.ts` (932 lines).

### LocalModelOrchestratorEngine.ts
Per-task backend router (Phase 0.19 U-LLM1): asks `ModelRoutingEngine` which backend+model should service a request, then dispatches to `OllamaClientEngine` (local/free), `LLMEngine` (Claude API), or a structured openai-not-wired error. Walks `RoutingDecision.fallbacks` on failure until one succeeds; records backend/model/wall-time/outcome per attempt for downstream learning (U-LLM5). This is the code-side embodiment of the Ollama-first ladder (R5). Path: `mcp-server/src/engines/LocalModelOrchestratorEngine.ts` (306 lines).

### CrossTerminalCoordinationEngine.ts
Multi-terminal work distribution (U-AWR25): coordinates extraction/analysis work across multiple Claude terminals to avoid duplicate effort and maximize throughput. Path: `mcp-server/src/engines/CrossTerminalCoordinationEngine.ts` (648 lines). Sibling `CrossSessionOrchestratorEngine.ts` (525 lines, U-COORD04) handles cross-SESSION continuity; `CoordinationStoreEngine.ts` provides the SQLite-WAL work-claim store (HOOK-SYNERGY-MS0 / H8) that replaces the contention-heavy single-JSON `WORK_CLAIMS.json`.

### TaskAgentClassifier.ts
Automatic agent + swarm-pattern + tier recommender (D1.3): maps an incoming task (dispatcher+action, complexity, domain keywords) to recommended agent(s) from `AgentRegistry`, a recommended swarm pattern (if multi-agent helps), and a recommended tier (opus/sonnet/haiku). Used by `autoAgentRecommend`, `autoPreTaskRecon`, context injection. Path: `mcp-server/src/engines/TaskAgentClassifier.ts` (636 lines).

### ZuluFleetGovernorEngine.ts
Pure-core authority gate (HZD-02 / HZP-DASH-MS0): given `(slot, soul, task_text)` returns `{ authorized, reason }` from the slot's hermes_role / domain_filter / refuse_list. The dashboard control server consults this BEFORE any state-changing op (assign/veto/promote-refuse). Deterministic + side-effect-free. Path: `mcp-server/src/engines/ZuluFleetGovernorEngine.ts` (143 lines). Companion `ZuluTaskAuctionEngine.ts` (168 lines, HZP06) runs a soul-weighted single-round sealed-bid auction to pick which slot takes a contested task (bid = domain_filter match + refuse-veto + queue-depth penalty + success-rate prior; ties break by success rate then slot name).

### SoulSubagentRouterEngine.ts
Pure-core `subagent_type` router (HSE02): given a `SlotSoul` + task descriptor, returns the subagent_type the slot prefers (or null when no preference or the task's domain falls outside the slot's `domain_filter` regex). Wires the `preferred_subagent_type` soul frontmatter field (declared since U-HERMES02 but previously unread by Agent-tool callers). Consumes `SlotSoul` from `SoulFrontmatterReaderEngine`. Path: `mcp-server/src/engines/SoulSubagentRouterEngine.ts` (77 lines).

### ManusATCSBridge.ts
Bridges ATCS work units to background AI execution (F2.3): lets ATCS delegate individual units to background LLM calls (FREE Ollama-first via `llmEngine`, Claude as adaptive backup), then poll results back for `unit_complete` integration. A unit that resolves to an offline stub (no provider) is marked FAILED, never completed (R12). Path: `mcp-server/src/engines/ManusATCSBridge.ts` (347 lines).

## Key hooks / helpers / scripts (orchestration is FILE-SYSTEM-native)

Per CLAUDE.md sec 3, fleet coordination is largely file-system-native, not in-process. These are load-bearing (verified in doctrine):
- `.claude/helpers/chat-slots.mjs` + `chat-slots.json` -- 26-slot NATO registry + liveness API (`golf-liveness`); `SLOT_NAMES.length` is the source of truth for the slot count (NEVER inline).
- `.claude/helpers/slot-task-claim.mjs` + `state/shared/slot-task-claims.json` -- per-slot `MILESTONE::U-ID` locks (PER-SLOT-CLAIM-MS0); lockfile-guarded atomic RMW, CLI only.
- `.claude/hooks/slot-context-bundle-inject.mjs` -- per-prompt fleet-enrichment hook.
- `scripts/lib/zulu-context-bundle.mjs` -- PSN aggregator for fleet-precheck (a lib, NOT a dispatcher action, NOT a hook).
- `state/shared/AGENT_CHAT.jsonl` (inter-agent chat bus, append-only) + `state/shared/AGENT_WORKBOARD.md` (task workboard).
- `scripts/ai-systems-fleet-state.mjs` -> `knowledge/memories/patterns/ai-systems-fleet-state.md` (live AI-systems fleet state).

## Full engine index

| Engine | Category | One-line |
|--------|----------|----------|
| AgentExecutor.ts | multi-agent-orchestration | Multi-agent lifecycle + priority task queue + parallel/sequential exec (SAFETY CRITICAL) |
| MultiAgentCoordinatorEngine.ts | multi-agent-orchestration | Domain-specialist coordinator (Physics/Opt/Quality/Safety/Tribal/Planning) -> unified rec |
| AgentWorkflowEngine.ts | multi-agent-orchestration | Agent workflow definition + execution (name-derived) |
| HybridAgentDispatchEngine.ts | multi-agent-orchestration | Hybrid agent dispatch across execution modes (name-derived) |
| MultiToolOrchestratorEngine.ts | multi-agent-orchestration | Orchestrates multi-tool agent runs (name-derived) |
| MultiAgentAIInterfaceEngine.ts | multi-agent-orchestration | Multi-agent AI interface surface (name-derived) |
| MultiAgentCostTelemetryEngine.ts | multi-agent-orchestration | Per-agent token/cost telemetry (name-derived) |
| SwarmExecutor.ts | swarm-topologies | 8 swarm patterns over AgentExecutor (parallel/pipeline/map-reduce/consensus/...) (SAFETY CRITICAL) |
| SwarmGroupExecutor.ts | swarm-topologies | Grouped swarm dispatch (name-derived) |
| SwarmAlgorithmsEngine.ts | swarm-topologies | Swarm coordination algorithms (name-derived) |
| SwarmNeuralHybridEngine.ts | swarm-topologies | Neural-hybrid swarm coordination (name-derived) |
| CoordinatorSwarmEngine.ts | swarm-topologies | Coordinator-driven swarm (PATHS.md only; flagged not-in-DIGEST per CLAUDE.md sec 12) (name-derived) |
| MultiModelConsensusEngine.ts | multi-model-consensus | Octopus -- fan prompt to Claude+Codex+Ollama, score agreement, recommend |
| ConsensusCoordinatorEngine.ts | multi-model-consensus | Concurrency-aware cache+in-flight wrapper around the octopus (fleet-safe) |
| SoulConsensusEngine.ts | multi-model-consensus | Slot-soul-weighted consensus panel (name-derived) |
| LocalModelOrchestratorEngine.ts | model-routing | Per-task backend router: ollama/anthropic/openai + fallback chain (U-LLM1) |
| TaskAgentClassifier.ts | model-routing | Task -> recommended agent + swarm pattern + tier (opus/sonnet/haiku) (D1.3) |
| SoulSubagentRouterEngine.ts | model-routing | Soul-frontmatter subagent_type router (HSE02) |
| OpusFastMaxAgentSpecEngine.ts | model-routing | Opus fast-max agent spec / tier selection (name-derived) |
| CrossTerminalCoordinationEngine.ts | fleet-coordination | Multi-terminal work distribution + dedup (U-AWR25) |
| CrossTerminalBroadcastEngine.ts | fleet-coordination | Broadcast messages across terminals (name-derived) |
| CrossSessionOrchestratorEngine.ts | fleet-coordination | Cross-session orchestration/continuity (U-COORD04) |
| MultiSessionHandoffCoordinatorEngine.ts | fleet-coordination | Coordinates handoffs across sessions (name-derived) |
| CoordinationStoreEngine.ts | fleet-coordination | SQLite-WAL work-claim store replacing WORK_CLAIMS.json (H8) |
| CoordinationLedgerEngine.ts | fleet-coordination | Coordination event ledger (name-derived) |
| PeerLearningCoordinatorEngine.ts | fleet-coordination | Coordinates peer-learning across slots (name-derived) |
| OperatingSystemCoordinationEngine.ts | fleet-coordination | OS-level coordination surface (name-derived) |
| CrossDomainOrchestratorEngine.ts | fleet-coordination | Cross-galaxy orchestration (PATHS.md only per CLAUDE.md sec 12) (name-derived) |
| ZuluFleetGovernorEngine.ts | zulu-fleet-governor | Pure-core authority gate {authorized,reason} from soul (HZD-02) |
| ZuluTaskAuctionEngine.ts | zulu-fleet-governor | Soul-weighted sealed-bid task auction across slots (HZP06) |
| ZuluWaveSchedulerEngine.ts | zulu-fleet-governor | Wave/barrier scheduler for fleet fan-out (name-derived) |
| ZuluAdaptiveBackPressureEngine.ts | zulu-fleet-governor | Adaptive back-pressure on fleet load (name-derived) |
| ZuluCapabilityRegistryEngine.ts | zulu-fleet-governor | Slot capability registry (name-derived) |
| ZuluCapabilityAttestationEngine.ts | zulu-fleet-governor | Capability attestation for slots (name-derived) |
| ZuluDelegationContractEngine.ts | zulu-fleet-governor | Delegation contract between slots (name-derived) |
| ZuluTaskContinuityEngine.ts | zulu-fleet-governor | Task continuity across compact/restart (name-derived) |
| ZuluDashboardControlEngine.ts | zulu-fleet-governor | Dashboard control-server authority ops (name-derived) |
| ZuluFleetHealthSynthesisEngine.ts | zulu-fleet-governor | Synthesizes fleet health signal (name-derived) |
| ZuluSoulEvolutionAdvisorEngine.ts | zulu-fleet-governor | Advises slot-soul evolution (name-derived) |
| SlotBriefEngine.ts | slot-soul-management | Per-slot brief generation (name-derived) |
| SlotSessionHistoryEngine.ts | slot-soul-management | Per-slot session history (name-derived) |
| SoulFrontmatterReaderEngine.ts | slot-soul-management | Reads SlotSoul frontmatter (source of SlotSoul type) |
| SoulFleetRollupEngine.ts | slot-soul-management | Rolls up soul state across the fleet (name-derived) |
| SoulAwareFanoutExtenderEngine.ts | slot-soul-management | Extends fan-out using soul awareness (name-derived) |
| SoulEscalationCheckerEngine.ts | slot-soul-management | Checks soul escalation rules (name-derived) |
| SoulHtmlRenderEngine.ts | slot-soul-management | Renders soul state to HTML (name-derived) |
| AutonomousAIOrchestrationEngine.ts | autonomous-execution | Self-reliant AI orchestration (skills/hooks/scripts/dispatchers/GSD) |
| AgenticLoopEngine.ts | autonomous-execution | Observe-Think-Act(-Learn) core loop primitive (U-AGT13) |
| ManusATCSBridge.ts | autonomous-execution | Bridges ATCS units -> background AI (Ollama-first, R12 fail-loud) |
| MetaAIOrchestrationEngine.ts | autonomous-execution | Meta-level AI orchestration over sub-orchestrators (name-derived) |
| FullSystemAICoordinatorEngine.ts | autonomous-execution | Full-system AI coordinator (PATHS.md only; flagged UNWIRED per CLAUDE.md sec 12) (name-derived) |
| AgentRegistryEngine.ts | agent-registry-memory | Inventory of Task-tool agents + trigger keywords |
| AgentMemoryFabricEngine.ts | agent-registry-memory | Cross-session memory fabric for PRISM agents |
| AgentSelfAwarenessEngine.ts | agent-registry-memory | Unified PRISM self-awareness surface |
| AgentSpecializationProfileEngine.ts | agent-registry-memory | Per-agent specialization profiles (name-derived) |
| AgentAutoUpdateEngine.ts | agent-registry-memory | Auto-updates agent definitions (name-derived) |
| HardenedAgentCapabilitiesEngine.ts | agent-registry-memory | Hardened/gated agent capabilities (name-derived) |
| FleetDeploymentLearningEngine.ts | agent-registry-memory | Learns from fleet deployment outcomes (name-derived) |
| FleetLearningStrategyEngine.ts | agent-registry-memory | Fleet-level learning strategy (name-derived) |

_Count: 57 engines. Header-verified (read this session): MultiModelConsensusEngine, ConsensusCoordinatorEngine, AgentExecutor, SwarmExecutor, AutonomousAIOrchestrationEngine, MultiAgentCoordinatorEngine, AgenticLoopEngine, LocalModelOrchestratorEngine, CrossTerminalCoordinationEngine, TaskAgentClassifier, ZuluFleetGovernorEngine, ZuluTaskAuctionEngine, SoulSubagentRouterEngine, CoordinationStoreEngine, ManusATCSBridge. Rows marked "(name-derived)" are enumerated from the flat tree + doctrine category but their bodies were NOT read this session -- treat the one-liner as inferred, verify header before building a consumer (R12). `CoordinatorSwarmEngine` / `FullSystemAICoordinatorEngine` / `CrossDomainOrchestratorEngine` are in PATHS.md but flagged not-in-ENGINE_DIGEST / UNWIRED per CLAUDE.md sec 12 -- do NOT build consumers until verified._
