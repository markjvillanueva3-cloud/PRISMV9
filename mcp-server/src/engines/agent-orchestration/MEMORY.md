# agent-orchestration Galaxy MEMORY.md

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="agent orchestration" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:agent-orchestration]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/agent-orchestration_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **CLEAR-NOT-COMPACT Doctrine**: Emphasis on clarity over compactness in ROI allocation, as seen in [reference/reference_juliett_12chat_allocation_2026_05_17].
- **Wiring Engines**: Importance of wiring engines to ensure they are functional within the system. Examples include [reference_u_wire_swarm_group_2026_05_18] and [reference_zulu_governor_wire_2026_06_01].
- **Model Integration**: Strategic integration of models like GPT-OSS and Gemma4 across PRISM routing, as detailed in [reference_blackwell_model_integration_ms0_2026_06].
- **Cost-aware Model Selection**: Implementation of cost-aware model selection to optimize resource usage, exemplified by [reference_ollama_cost_routing].
- **Swarm-based Execution**: Multiple memories reference using swarms of agents for various tasks such as inventory enumeration, devtools synergy mapping, and SFC domain mapping. Examples include [reference_juliett_devtools_synergy_map_2026_05_17], [reference_oscar_sfc_domain_map_2026_05_27].
- **Parallel Agent Execution**: Utilization of parallel agents for tasks like inventory enumeration and domain awareness surface creation. Notable in [reference_alpha_workflow_inventory_pattern] and [reference_alpha_token_awareness_surface].
- **Slot-based Orchestration**: Tasks are often executed within specific slots (alpha, bravo, charlie, etc.), indicating a structured approach to resource allocation and management. Examples include [reference_oscar_sfc_domain_map_2026_05_27], [reference_zulu_orchestrator_ms1_2026_05_22].

## Indexed memories
- **Domain corpus (live counts):** 11 curated memory file(s) · 52 wiki entr(y/ies) · 5 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 8 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="agent-orchestration" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Source-article knowledge (2026-06-10, slot:zulu):** [`AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md`](AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md) — operator-submitted agentic/loops/hermes/obsidian/cag/rag/lora/nn/gnn articles distilled into one R12-verified doc (Addy "Loop Engineering" keystone + 79 X-article URLs across 894 transcripts + 7 full-capture corpus). Built via ultracode Workflow wf_a5e7c1f0-e0e (8 agents). Raw per-topic memos: `state/shared/articles/_topic-memos-2026-06-10/`; full-capture articles: `state/shared/articles/`.
- **Sample memories:** `knowledge/memories/_legacy-root/reference_g2_agent_overlay_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_post_ship_checkin-upgrade-ms0-p4-subagent.md` · `knowledge/memories/_legacy-root/reference_subagent_per_task_presearch_2026_05_15.md` · `knowledge/memories/reference/reference_alpha_explore_agent_schema_incompat.md` · `knowledge/memories/reference/reference_g2_agent_overlay_2026_05_16.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/subagent-orchestration-discipline.md` · `knowledge/wiki/architecture/agent-orchestration-galaxy.md` · `knowledge/wiki/architecture/agent-status-overlay.md` · `knowledge/wiki/architecture/dispatcher-agent.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/llm-agent-loop-design.md` · `knowledge/wiki/code-tribal/subagent-dispatch-patterns.md` · `knowledge/wiki/code-tribal/learnings/checkin-upgrade-ms0-p4-subagent.md`

## Cross-galaxy bridges
- ↔ ALL galaxies — orchestrates everything (CLAUDE.md here §Scope)
- ↔ **discovery (tango)** (`engines/discovery/`) — CONSUMES ← findings → orchestrator routing
- ↔ **token-optimization (alpha)** (`engines/token-optimization/`) — multi-agent token-cost coordination
- ↔ **hermes-zulu (bravo/zulu)** (`engines/hermes-zulu/`) — agent-fleet orchestration peer
- → **ai-training (india)** (`engines/ai-training/`) — PRODUCES per-task model routing (GraphSAGE GNN tier-5 wiring inference)

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Inventory Enumeration Failures**: The failure of the parallel-agent fan-out for token optimization domain inventory needs further investigation. Mentioned in [reference_alpha_workflow_inventory_pattern].
- **Compatibility Fixes**: Ongoing issues with architectural compatibility, such as fixing HWND actuation for tabbed fleets, highlighted in [reference_zulu_hwnd_tabbed_fleet_2026_05_22].
- **Model Selection Enhancements**: Continuous improvement of model selection strategies to enhance cost efficiency and performance, as indicated by [reference_ollama_cost_routing].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Primary domain
Multi-agent + swarm orchestration and per-task model routing across the up-to-26-chat NATO fleet (`alpha..zulu`). This galaxy coordinates which slot/agent/model does which work, runs swarm + consensus topologies, and drives autonomous task completion. Canonical slot affinity is zulu (per `CLAUDE.md` here: ZULU-OMNISCIENT-MS0 + ZULU-ORCHESTRATOR-MS0); the primary action surface is the `prism_orchestrate` dispatcher.

## Key engines & paths
Galaxy brain docs live at `mcp-server/src/engines/agent-orchestration/{CLAUDE,PATHS,TOOLBELT,MEMORY}.md`. Engine `.ts` files are FLAT under `mcp-server/src/engines/` (not under this dir — per `reference_fleet_synergy_audit_2026_06_01.md`). Engines below are cited from `mcp-server/data/docs/ENGINE_DIGEST.md` unless marked (PATHS.md only):
- `AgentExecutor.ts` — multi-agent orchestration, task queue, and execution coordination
- `AgenticLoopEngine.ts` — Observe-Think-Act orchestrator
- `AgentRegistryEngine.ts` — inventory of Task-tool agents with trigger keywords
- `AgentMemoryFabricEngine.ts` — cross-session memory for PRISM agents
- `AgentSelfAwarenessEngine.ts` — unified PRISM self-awareness
- `CrossSessionOrchestratorEngine.ts` — cross-session orchestration (U-COORD04)
- `CrossTerminalCoordinationEngine.ts` — multi-terminal work distribution
- `ConsensusCoordinatorEngine.ts` — concurrency-aware wrapper around MultiModelConsensusEngine
- `LocalModelOrchestratorEngine.ts` — local-model routing (Phase 0.19 U-LLM1)
- `AutonomousAIOrchestrationEngine.ts` — self-reliant AI system orchestration
- `CoordinatorSwarmEngine.ts`, `FullSystemAICoordinatorEngine.ts`, `CrossDomainOrchestratorEngine.ts` — present in PATHS.md only (not in ENGINE_DIGEST.md; FullSystemAICoordinatorEngine flagged UNWIRED in the graph)

Dispatchers (from `mcp-server/data/docs/DISPATCHER_DIGEST.md`):
- `prism_orchestrate` — agent orchestration, swarm coordination, and roadmap execution (71 actions) — primary surface
- `prism_atcs` — Autonomous Task Completion System; file-system state machine (12 actions)
- `prism_autopilot_d` — AutoPilot workflow orchestration (7 actions)
- `prism_autonomous` — autonomous execution engine; bridges ATCS state machine (8 actions)
- `prism_omega` — Omega quality equation Ω(x) dispatcher (6 actions)

## Standing patterns / invariants
- **26-slot fleet, count never hard-coded.** Read `SLOT_NAMES.length` from `.claude/helpers/chat-slots.mjs`; current sequence `alpha..zulu` (CLAUDE.md §PER-CHAT HANDOFF, §FLEET-DESIGN). NEVER inline the slot count.
- **golf owns the fleet-reaper** — slot-aware orphan reaper for the fleet; doctrine moved alpha→golf 2026-05-16 (CLAUDE.md §GOLF SLOT, §FLEET-REAPER; `feedback_golf_owns_reaper.md`).
- **Model only for judgment calls (R5).** Route deterministic transforms to code, mechanical text ops to Ollama, only deep reasoning + safety to Claude (CLAUDE.md §AI SYSTEM ROUTING; `feedback_r5_thru_r12_doctrine.md`).
- **Per-task model routing / pre-search** — every spawned subagent gets master-index + tribal pre-search blocks (CLAUDE.md §SESSION CONTINUITY STACK).
- **Never inline physics constants** — import from `mcp-server/src/physics/constants.ts` (CLAUDE.md §SAFETY).
- **Never delete, only disable** — reversibility rule for hooks/assets (`feedback_never_delete_only_disable.md`).

## Known assets
- Wiki: `knowledge/wiki/architecture/galaxy-context-federation.md` — cross-galaxy context federation (CAG cold-anchor / per-session injection substrate)
- Wiki: `knowledge/wiki/architecture/psn-octopus-fleet-synergy-ms0.md` + `knowledge/wiki/code-tribal/learnings/psn-octopus-fleet-synergy-ms0-u-fleet-consume.md` — PSN/octopus fleet synergy
- Memory: `reference_fleet_synergy_audit_2026_06_01.md` — fleet master-brain wiring COMPLETE for all 34 galaxies on the 3 load-bearing legs; documents the `galaxy-verify.mjs` wiki-refs heuristic false-fail
- Memory: `reference_galaxy_context_federation_compact_2026_05_31.md`, `reference_galaxy_context_federation_viz_roost_2026_06_01.md` — context-federation surfaces
- Memory: `reference_octopus_consumption_substrate_2026_06_01.md` — octopus consensus consumption substrate
- DB intake (PATHS.md): WorkflowDB (Workflow Chains Database, 10 entries) via `prism_data:database_search`

## Cross-galaxy edges
- ↔ ALL galaxies — orchestrates everything (CLAUDE.md here §Scope)
- ↔ **discovery (tango)** (`engines/discovery/`) — CONSUMES ← findings → orchestrator routing
- ↔ **token-optimization (alpha)** (`engines/token-optimization/`) — multi-agent token-cost coordination
- ↔ **hermes-zulu (bravo/zulu)** (`engines/hermes-zulu/`) — agent-fleet orchestration peer
- → **ai-training (india)** (`engines/ai-training/`) — PRODUCES per-task model routing (GraphSAGE GNN tier-5 wiring inference)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Multi-agent orchestration + per-task model routing. Domain = agentic harness design (the operator's loop/harness articles land here).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/agent-orchestration/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**Authoritative free external sources (VERIFIED, papa AI/software domain):**
- [Anthropic Engineering - Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Anthropic Engineering - Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
