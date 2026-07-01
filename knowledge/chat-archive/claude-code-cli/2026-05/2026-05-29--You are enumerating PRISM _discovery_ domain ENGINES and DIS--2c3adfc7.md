---
type: "chat-session"
source: "claude-code-cli"
session_id: "2c3adfc7-d056-43fd-9301-bf5fa366ceb8"
title: "You are enumerating PRISM \"discovery\" domain ENGINES and DISPATCHER ACTIONS for "
date: "2026-05-29"
first_ts: "2026-05-29T13:34:05.212Z"
last_ts: "2026-05-29T13:38:01.587Z"
cwd: "H:\\prism-slot-tango"
messages: 36
user_msgs: 14
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism-slot-tango/2c3adfc7-d056-43fd-9301-bf5fa366ceb8/subagents/agent-a8c7d5a3dffde8385.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# You are enumerating PRISM "discovery" domain ENGINES and DISPATCHER ACTIONS for 

> **claude-code-cli** | 2026-05-29 | 36 msgs (14 user / 22 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/2c3adfc7-d056-43fd-9301-bf5fa366ceb8/subagents/agent-a8c7d5a3dffde8385.jsonl`

## Transcript

### User | 2026-05-29T13:34:05.212Z

You are enumerating PRISM "discovery" domain ENGINES and DISPATCHER ACTIONS for the tango slot galaxy. The MCP server is DOWN (port 3100 ECONNREFUSED) so do NOT use any mcp__prism__* / prism_session:* tools — use Grep/Glob/Read against the filesystem only. Work in the shared tree H:/prism (it is current; do not use H:/prism-slot-tango which is stale).

Discovery domain = algorithm/engine/pipeline DISCOVERY + anti-duplication + audit/coverage scanning + master-index/search-first infrastructure. Keywords: discovery, duplication-guard, engine-digest, dispatcher-coverage, pipeline-coverage, audit, orphan, unwired, master-index, self-awareness, asset-registry, extraction-log.

Find and report:
1. ENGINES — Glob H:/prism/mcp-server/src/engines/*.ts (and subdirs) and Grep for these specific known engines + any siblings: DuplicationGuardEngine, AlgorithmOrchestratorEngine, AutoResearchOrchestratorEngine, PrismSelfAwarenessEngine, CodeSystemIndexEngine, WikiIndexMaintainerEngine, and any engine whose name contains Discovery/Audit/Orphan/Unwired/Coverage/Inventory/AssetRegistry. For each: absolute path + 1-line role (read the class doc comment / first 30 lines if unsure).
2. DISPATCHER ACTIONS — Grep H:/prism/mcp-server/src/tools/dispatchers/*.ts for action enum entries related to: master_index_query, master_index_node_status, dispatcher_map_compact, duplication, dedup, audit, orphan, coverage, engine_digest, inventory. Report dispatcher file : action-name pairs (e.g. prism_session:master_index_query).

Return a compact structured list: "## Engines" (path | role, ≤25 entries, most relevant first) then "## Dispatcher actions" (dispatcher:action | purpose, ≤20 entries). No prose preamble. This feeds a galaxy MEMORY.md baseline so accuracy of paths matters more than completeness.

### Assistant | 2026-05-29T13:34:22.453Z

I'll enumerate the discovery domain engines and dispatcher actions. Let me start with parallel searches.

### Assistant | 2026-05-29T13:34:23.143Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:34:23.739Z

[tool_use: Glob]

### User | 2026-05-29T13:34:38.744Z

[tool_result] mcp-server\src\engines\AlgorithmOrchestratorEngine.ts
mcp-server\src\engines\AutoResearchOrchestratorEngine.ts
mcp-server\src\engines\CodeSystemIndexEngine.ts
mcp-server\src\engines\DuplicationGuardEngine.ts
mcp-server\src\engines\PRISMSelfAwarenessEngine.ts
mcp-server\src\engines\WikiIndexMaintainerEngine.ts

### User | 2026-05-29T13:34:40.066Z

[tool_result] mcp-server\src\engines\AuditEngine.ts
mcp-server\src\engines\AuditLoggingEngine.ts
mcp-server\src\engines\AuditManagerEngine.ts
mcp-server\src\engines\BloomDedupEngine.ts
mcp-server\src\engines\BlueprintCoverageAuditEngine.ts
mcp-server\src\engines\CADPluginTamperAuditLogEngine.ts
mcp-server\src\engines\ConsensusAuditLogEngine.ts
mcp-server\src\engines\ContextInventoryEngine.ts
mcp-server\src\engi
... [+1616 chars truncated]

### Assistant | 2026-05-29T13:34:53.038Z

Let me search for more discovery-specific engines and read the role comments of the key ones.

### Assistant | 2026-05-29T13:34:54.100Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:34:56.362Z

[tool_use: Bash]

### User | 2026-05-29T13:35:04.667Z

[tool_result] mcp-server\src\engines\AICapabilityMaximizerEngine.ts
mcp-server\src\engines\AIExtractionReasonerEngine.ts
mcp-server\src\engines\AIFeatureAutoRegistryEngine.ts
mcp-server\src\engines\AgentRegistryEngine.ts
mcp-server\src\engines\AgentSelfAwarenessEngine.ts
mcp-server\src\engines\AlphacamFunctionIndexEngine.ts
mcp-server\src\engines\AwarenessBootstrapEngine.ts
mcp-server\src\engines\AwarenessQuery
... [+5000 chars truncated]

### User | 2026-05-29T13:35:21.614Z

[tool_result] === DuplicationGuardEngine ===
 * DuplicationGuardEngine — Prevent Duplicate Builds & Extractions
 *
=== AlgorithmOrchestratorEngine ===
 * AlgorithmOrchestratorEngine — Phase 0.23 U-UTL3
 *
=== AutoResearchOrchestratorEngine ===
 * AutoResearchOrchestratorEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL03
=== PRISMSelfAwarenessEngine ===
 * PRISMSelfAwarenessEngine — Core Infrastructure
 *
=== CodeSystemI
... [+589 chars truncated]

### Assistant | 2026-05-29T13:35:25.809Z

Now let me read role lines for the secondary discovery engines and grep dispatcher actions.

### Assistant | 2026-05-29T13:35:29.076Z

[tool_use: Bash]

### Assistant | 2026-05-29T13:35:31.202Z

[tool_use: Grep]

### User | 2026-05-29T13:35:52.991Z

[tool_result] === MasterIndexEngine ===
1 matches in 1 files:

MasterIndexEngine.ts:2:* MasterIndexEngine — Unified Master Search Across Obsidian Vault + System-Vi...
=== MasterIndexGenerator ===
1 matches in 1 files:

MasterIndexGenerator.ts:2:* MasterIndexGenerator.ts — Auto-scans MCP server source to produce MASTER_IN...
=== CapabilityIndexEngine ===
2 matches in 1 files:

CapabilityIndexEngine.ts:2:* Capabi
... [+1926 chars truncated]

### User | 2026-05-29T13:36:03.262Z

[tool_result] mcp-server\src\tools\dispatchers\agentDispatcher.ts:15: *   - self_awareness      — Build the agent's self-model snapshot
mcp-server\src\tools\dispatchers\agentDispatcher.ts:37:  "self_awareness",
mcp-server\src\tools\dispatchers\agentDispatcher.ts:329:          // ── self_awareness ─────────────────────────────────────────
mcp-server\src\tools\dispatchers\agentDispatcher.ts:330:          case "se
... [+10150 chars truncated]

### Assistant | 2026-05-29T13:36:08.161Z

Let me focus the dispatcher search on the most relevant discovery actions in session/dev/guard dispatchers.

### Assistant | 2026-05-29T13:36:10.954Z

[tool_use: Grep]

### User | 2026-05-29T13:36:25.495Z

[tool_result] mcp-server\src\tools\dispatchers\sessionDispatcher.ts:133:  "dispatcher_map",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:134:  "dispatcher_map_compact",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:164:  "master_index_query",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:165:  "master_index_node_status",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:167:  "maste
... [+543 chars truncated]

### Assistant | 2026-05-29T13:36:29.493Z

Let me grep guard and dev dispatchers for the discovery/dedup/audit actions specifically.

### Assistant | 2026-05-29T13:36:30.943Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:36:32.894Z

[tool_use: Grep]

### User | 2026-05-29T13:36:35.671Z

[tool_result] 32:  "collision_hazard_detect",
41:  "sem_sim_guard_compute",
411:    "prism_guard",
427:          "prism_guard"

### User | 2026-05-29T13:36:39.033Z

[tool_result] 30:[Omitted long matching line]
34:"program_print_link_lookup", "program_print_link_coverage",
35:[Omitted long matching line]
37:"roadmap_intel_assess_complexity", "roadmap_intel_optimize", "roadmap_intel_predict_effort", "roadmap_intel_record_outcome", "roadmap_intel_build_vs_integrate", "roadmap_intel_health", "roadmap_tool_plan_query", "roadmap_tool_plan_build", "roadmap_tool_plan_coverage",
4
... [+3405 chars truncated]

### Assistant | 2026-05-29T13:36:43.807Z

Let me find the guard dispatcher's dedup/duplication action names and the engine_digest action location.

### Assistant | 2026-05-29T13:36:45.300Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:36:48.575Z

[tool_use: Grep]

### User | 2026-05-29T13:36:52.048Z

[tool_result] 822-            return ok(fn ? fn.call(eng, params as any) : { error: "no public method found" });
823-          }
824:          case "dup_guard_check": {
825-            const { duplicationGuardEngine } = await import("../../engines/DuplicationGuardEngine.js");
826:            return ok((duplicationGuardEngine as any).checkBeforeCreating(params as any));
827-          }
828:          case "dup_gu
... [+214 chars truncated]

### User | 2026-05-29T13:36:56.201Z

[tool_result] mcp-server\src\tools\dispatchers\sessionDispatcher.ts:144:  "self_awareness_build",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:145:  "self_awareness_search",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:146:  "self_awareness_context_summary",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:147:  "self_awareness_health",
mcp-server\src\tools\dispatchers\sessionDispatcher.t
... [+2151 chars truncated]

### Assistant | 2026-05-29T13:37:00.890Z

I have enough to compile an accurate report. Let me verify a couple more dev dispatcher discovery actions (orphan/unwired analyze, capability census).

### Assistant | 2026-05-29T13:37:03.021Z

[tool_use: Grep]

### User | 2026-05-29T13:37:10.138Z

[tool_result] 35:[Omitted long matching line]
173:"svi_ranked_backlog",
209:"impact_find_orphans",
5900:          case "capability_census": {
9565:          case "svi_ranked_backlog": {
9804:          case "impact_find_orphans": {

### Assistant | 2026-05-29T13:37:17.725Z

Let me grab line 35 (the dev dispatcher unwired-analyze action names) and confirm.

### Assistant | 2026-05-29T13:37:18.519Z

[tool_use: Read]

### User | 2026-05-29T13:37:28.681Z

[tool_result] 86	// would never reach route() calls in the running server. Boot scripts
87	// + post-tuner cron should call this action.
88	"router_adaptation_apply",
89	// CLEANUP-MS0/U-CLEANUP-C2: WiringPotentialEngine (C1) — rank candidate
90	// dispatchers for orphan engines. Three modes: analyze (single engine),
91	// batch_unwired (scan BUILD_STATE.NEEDS_WIRING orphans), dashboard
92	// (aggregate top-can
... [+63 chars truncated]

### Assistant | 2026-05-29T13:38:01.587Z

I have all the data needed. Here is the compiled report.

## Engines

| Path | Role |
|------|------|
| `H:\prism\mcp-server\src\engines\DuplicationGuardEngine.ts` | Prevent duplicate builds & extractions; `checkBeforeCreating`/`mustCheckBeforeCreating` THROW on dups (core anti-dup gate) |
| `H:\prism\mcp-server\src\engines\MasterIndexEngine.ts` | Unified master search across Obsidian vault + system-viz graph + capability index + BUILD_STATE |
| `H:\prism\mcp-server\src\engines\MasterIndexGenerator.ts` | Auto-scans MCP server source to produce MASTER_INDEX (engine/dispatcher inventory generator) |
| `H:\prism\mcp-server\src\engines\PRISMSelfAwarenessEngine.ts` | Core self-awareness infrastructure; `findCapabilities`, `searchTribalKnowledge`, `recommendAIFeatures` |
| `H:\prism\mcp-server\src\engines\CodeSystemIndexEngine.ts` | DSL shortcode→path mapping (E####/D##/A##) for token-saving resolution |
| `H:\prism\mcp-server\src\engines\AlgorithmOrchestratorEngine.ts` | Phase 0.23 U-UTL3 — algorithm discovery/dispatch orchestration |
| `H:\prism\mcp-server\src\engines\AutoResearchOrchestratorEngine.ts` | AUTO-LEARNING-LOOP-MS0/U-ALL03 — auto-research orchestration loop |
| `H:\prism\mcp-server\src\engines\WikiIndexMaintainerEngine.ts` | KNOWLEDGE-WIKI-MS0/U-WIKI02 — maintains the 722-entry wiki index |
| `H:\prism\mcp-server\src\engines\CapabilityIndexEngine.ts` | Live dispatcher introspection — runtime action/capability index |
| `H:\prism\mcp-server\src\engines\CapabilityCensusEngine.ts` | MXU-MS0 U1-U6 — capability census/coverage enumeration |
| `H:\prism\mcp-server\src\engines\GlobalSearchEngine.ts` | Cross-entity fuzzy search across PRISM assets |
| `H:\prism\mcp-server\src\engines\AwarenessQueryEngine.ts` | Fast in-memory asset awareness cache (search-first) |
| `H:\prism\mcp-server\src\engines\AwarenessBootstrapEngine.ts` | Session awareness verification at boot |
| `H:\prism\mcp-server\src\engines\EngineUtilizationAuditorEngine.ts` | Phase 0.23 U-UTL1 — audits 
... [+4404 chars truncated]
