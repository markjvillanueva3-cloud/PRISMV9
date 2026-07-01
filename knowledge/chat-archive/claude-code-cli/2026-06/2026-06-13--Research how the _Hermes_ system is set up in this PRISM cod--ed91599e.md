---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Research how the \"Hermes\" system is set up in this PRISM codebase (repo root H:/"
date: "2026-06-13"
first_ts: "2026-06-13T14:33:14.617Z"
last_ts: "2026-06-13T15:09:30.178Z"
cwd: "H:\\prism-slot-sierra"
messages: 88
user_msgs: 38
assistant_msgs: 50
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/workflows/wf_71067519-f1f/agent-a8b2c43b32f08bdb2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Research how the "Hermes" system is set up in this PRISM codebase (repo root H:/

> **claude-code-cli** | 2026-06-13 | 88 msgs (38 user / 50 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/workflows/wf_71067519-f1f/agent-a8b2c43b32f08bdb2.jsonl`

## Transcript

### User | 2026-06-13T14:33:14.617Z

Research how the "Hermes" system is set up in this PRISM codebase (repo root H:/prism), focused on its Obsidian-vault + Qdrant + Ollama + agentic-loop + autonomous-build features. The operator wants to replicate Hermes's agentic-loop-building capability into Claude Code CLI / PRISM MCP WITHOUT launching the Hermes CLI or app.

READ IN FULL (use Glob to locate, then Read):
- The hermes-zulu galaxy dir: mcp-server/src/engines/hermes-zulu/ (CLAUDE.md, MEMORY.md, TOOLBELT.md, PATHS.md, and the most important engine .ts files there).
- Spec files: Glob state/shared/specs/*hermes* and *HERMES* (e.g. spec-hermes-obsidian-os-research-2026-05-20, HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23) and read them.
- Engines mcp-server/src/engines/AgenticLoopEngine.ts and mcp-server/src/engines/AgentWorkflowEngine.ts (full).
- Grep the wiki knowledge/wiki/ for "hermes" and read the top 2-3 hits.

PRODUCE a structured plain-text report:
(a) What Hermes IS (CLI? desktop app? agent-fleet orchestrator? a "Dreaming" loop?).
(b) HOW it utilizes the Obsidian vault: recall-before-act, persist-after-act, RAG patterns, what triggers recall, what gets persisted.
(c) How it uses Qdrant + Ollama specifically.
(d) Its agentic-loop / autonomous-build mechanics: the loop structure, how it decides next actions, how it "builds" autonomously, receipt/dream-apply gating.
(e) The SPECIFIC, concrete features/patterns we would need to replicate into Claude Code CLI / PRISM MCP to get Hermes's agentic-loop-building without launching Hermes.
Cite file:line for every claim. Mark anything you could NOT verify as UNVERIFIED. Plain text only.

### Assistant | 2026-06-13T14:33:17.831Z

I'll systematically explore the Hermes system in this codebase. Let me start by locating all the relevant files in parallel.

### Assistant | 2026-06-13T14:33:18.653Z

[tool_use: Glob]

### Assistant | 2026-06-13T14:33:19.034Z

[tool_use: Glob]

### Assistant | 2026-06-13T14:33:19.081Z

[tool_use: Glob]

### User | 2026-06-13T14:33:49.883Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T14:33:49.883Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T14:33:49.920Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T14:33:51.834Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:33:52.161Z

[tool_use: Bash]

### User | 2026-06-13T14:35:39.654Z

[tool_result] BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md
HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md
HERMES-AGI-ARCHITECTURE-RESEARCH-2026-05-24.md
HERMES-APP-INCORPORATION-PLAN-2026-06-02.md
HERMES-CAPABILITY-EXPANSION-RESEARCH-2026-05-23.md
HERMES-CONTROL-READINESS-2026-06-01.md
HERMES-DASH-DEEP-RESEARCH-2026-05-25.md
HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26.md
HERMES-EFFICIENCY-ROUTER-PLAN-2026-06-04.md
HERMES
... [+509 chars truncated]

### User | 2026-06-13T14:35:41.117Z

[tool_result] A2AProtocolEngine.ts
AGISafetyContainmentEngine.ts
AHPEngine.ts
AIAutoUtilizationEngine.ts
AICapabilityMaximizerEngine.ts
AIDecisionExplanationEngine.ts
AIDeepKnowledgeIntegrationEngine.ts
AIExtractionReasonerEngine.ts
AIFeatureAutoRegistryEngine.ts
AIGeneratedCodeApprovalGateEngine.ts
AIIntelligenceMaximizerEngine.ts
AIMLEngine.ts
AIMLFormulasEngine.ts
AIPhysicsOptimizationEngine.ts
AIProposalApp
... [+416 chars truncated]

### Assistant | 2026-06-13T14:35:44.931Z

Good, found the spec files. Let me now read the key files in parallel.

### Assistant | 2026-06-13T14:35:48.578Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:35:48.810Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:35:48.989Z

[tool_use: Bash]

### User | 2026-06-13T14:36:25.159Z

[tool_result] academy/
agent-orchestration/
ai-training/
architecture/
backend-helper/
blueprint-vision/
bug-hunting/
business/
cad/
cad-fusion-live/
cam/
code-tribal/
compliance-safety/
concepts/
consensus/
coordination/
corpus-aggregation/
database-expansion/
decisions/
discovery/
KNOWLEDGE_EXTRACTION_PROTOCOL.md
Materials/
PRISM Knowledge Vault.md
PRISM-System-Map.canvas
SYSTEM-MAP.md
Skills/
bases/
claude-m
... [+159 chars truncated]

### User | 2026-06-13T14:36:26.371Z

[tool_result] BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md
HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md
HERMES-AGI-ARCHITECTURE-RESEARCH-2026-05-24.md
HERMES-APP-INCORPORATION-PLAN-2026-06-02.md
HERMES-CAPABILITY-EXPANSION-RESEARCH-2026-05-23.md
HERMES-CONTROL-READINESS-2026-06-01.md
HERMES-DASH-DEEP-RESEARCH-2026-05-25.md
HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26.md
HERMES-EFFICIENCY-ROUTER-PLAN-2026-06-04.md
HERMES
... [+639 chars truncated]

### User | 2026-06-13T14:36:27.394Z

[tool_result] HermesFileScopePartitionerEngine.ts
HermesParallelBudgetEnvelopeEngine.ts
HermesParallelFanoutPlannerEngine.ts
HermesParallelVerdictAggregatorEngine.ts
HermesSelfCorrectionEngine.ts
hermes-zulu/

### Assistant | 2026-06-13T14:36:29.420Z

Now let me read the hermes-zulu directory and key spec files in parallel.

### Assistant | 2026-06-13T14:36:30.184Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:36:30.948Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:36:31.035Z

[tool_use: Bash]

### User | 2026-06-13T14:37:30.987Z

[tool_result] AWARENESS.md
CLAUDE.md
MEMORY.md
PATHS.md
SOUL.md
TOOLBELT.md

### User | 2026-06-13T14:37:33.574Z

[tool_result] MEMORY.md
USER.md

### User | 2026-06-13T14:37:33.585Z

[tool_result] 2026-06-13-charlie-quoting-maxed.md
2026-06-13-delta-cad-maxed.md
2026-06-13-echo-post-processors-maxed.md
2026-06-13-foxtrot-mill-maxed.md
2026-06-13-hotel-business-hr-maxed.md
2026-06-13-india-training-maxed.md
2026-06-13-juliett-database-maxed.md
2026-06-13-kilo-cam-maxed.md
2026-06-13-mike-wire-maxed.md
2026-06-13-oscar-speed-feed-maxed.md
2026-06-13-prism-agent-orchestration-population.md
202
... [+887 chars truncated]

### Assistant | 2026-06-13T14:37:37.570Z

Now let me read all the core hermes-zulu files and the AgenticLoopEngine in parallel.

### Assistant | 2026-06-13T14:37:37.960Z

[tool_use: Read]

### Assistant | 2026-06-13T14:37:38.380Z

[tool_use: Read]

### Assistant | 2026-06-13T14:37:38.737Z

[tool_use: Read]

### User | 2026-06-13T14:38:23.352Z

[tool_result] 1	# Hermes-Zulu Galaxy (BRAVO + ZULU slots)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> BRAVO - HERMES/ZULU BUILDING + STUB HUNTING
5	> ZULU - HERMES AGENT CHAT FLEET ORCHESTRATOR
6	
7	Bravo BUILDS hermes-zulu (engines, hooks, dispatchers, soul-files, dream cycle, self-reflect populater, stub-hunter audits). Zulu IS the live orchestrator running on top — cross-slot synthesis, fleet d
... [+10475 chars truncated]

### User | 2026-06-13T14:38:23.834Z

[tool_result] 1	# Hermes-Zulu TOOLBELT.md — tool-call efficiency for slot:bravo
2	
3	The exact patterns bravo reaches for, memoized so future sessions don't re-derive them. Each entry saves tokens or time vs. the naive alternative.
4	
5	## Glob patterns (narrow, path-scoped — NEVER bare-root recursive)
6	- `*{zulu,hermes,stub,slot-soul,slot-context,slot-task}*` | path `H:/prism/.claude/hooks` | ~9 hits | find g
... [+8267 chars truncated]

### User | 2026-06-13T14:38:24.204Z

[tool_result] 1	# BRAVO + ZULU Galaxy Memory — Hermes/Zulu Building + Stub Hunting + Fleet Orchestration
2	
3	Append-only cross-session memory for the hermes-zulu galaxy. Bravo owns the build side; zulu owns the runtime/orchestration side. Both share this file.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="
... [+39375 chars truncated]

### Assistant | 2026-06-13T14:38:32.159Z

Now let me read PATHS.md, SOUL.md, and the key engine files in parallel.

### Assistant | 2026-06-13T14:38:32.978Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:33.362Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:33.653Z

[tool_use: Read]

### User | 2026-06-13T14:40:25.341Z

[tool_result] 1	# Hermes-Zulu PATHS.md — H:/-wide path atlas (slot:bravo)
2	
3	Converts every future Grep/Glob from O(N) → O(1) for slot:bravo. All paths **glob-verified against canonical `H:/prism` on 2026-05-28** (the slot worktree carries only this session's touched files; verify against `H:/prism`). bravo writes the same relative paths in its slot worktree `H:/prism-slot-bravo`. Format: `<absolute-path> | <
... [+12487 chars truncated]

### User | 2026-06-13T14:40:25.822Z

[tool_result] 1	---
2	galaxy: hermes-zulu
3	slot: bravo
4	role: hermes-zulu-builder
5	voice: orchestration-first
6	tone: rigorous
7	domain_filter: engine|hook|dispatcher|stub-hunter|self-reflect|dream-cycle|slot-soul|orchestrator|fleet-bus|audit|zulu-runtime
8	ai_synergy_score: 1
9	ai_synergy_band: strong
10	schemaVersion: 1.1.0
11	generated_by: scripts/generate-galaxy-souls.mjs
12	generated_at: 2026-06-11T03:0
... [+2550 chars truncated]

### User | 2026-06-13T14:40:26.104Z

[tool_result] 1	# HERMES + Obsidian-as-automated-OS — deep research deliverable
2	
3	**Date:** 2026-05-20 · **Slot:** bravo (`claude-eca6e8bb`) · **Companion to:** [ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md](ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md)
4	
5	Closes the second half of the operator directive — *"do deep research on hermes and utilizing obsidian as an automated os"* — feeding the G5 (Hermes shipDraft staging) 
... [+21630 chars truncated]

### system

... [8 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-13T14:47:19.704Z

[tool_use: Read]

### Assistant | 2026-06-13T14:47:20.053Z

[tool_use: Read]

### Assistant | 2026-06-13T14:47:20.668Z

[tool_use: Bash]

### User | 2026-06-13T14:49:29.783Z

[tool_result] 1	/**
2	 * AgenticLoopEngine — Observe-Think-Act Orchestrator
3	 *
4	 * AGENT ROADMAP: U-AGT13 (MS4)
5	 *
6	 * Core agentic loop for autonomous manufacturing intelligence:
7	 * - OBSERVE: Parse input, extract intent, gather context
8	 * - THINK: Reason about approach, evaluate options
9	 * - ACT: Execute tools, apply decisions
10	 * - LEARN: Update memory from outcomes
11	 *
12	 * @module engines/
... [+29528 chars truncated]

### User | 2026-06-13T14:49:37.516Z

[tool_result] 1	/**
2	 * AgentWorkflowEngine — Autonomous Manufacturing Workflow Execution
3	 * ==================================================================
4	 * Implements Agent SDK-style autonomous workflow execution for PRISM.
5	 * Enables complex manufacturing tasks to run with minimal human intervention
6	 * while maintaining safety guardrails and audit trails.
7	 *
8	 * Features:
9	 *   - Autonomous
... [+35868 chars truncated]

### User | 2026-06-13T14:53:34.551Z

[tool_result] Command running in background with ID: bf904k4vq. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-sierra\ed91599e-19b8-4bdb-8ea8-87e47b6ee322\tasks\bf904k4vq.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-13T14:53:38.135Z

Good, the background commands finished. Let me check their output and read a few more key files in parallel.

### Assistant | 2026-06-13T14:53:38.527Z

[tool_use: Read]

### Assistant | 2026-06-13T14:53:39.671Z

[tool_use: Read]

### Assistant | 2026-06-13T14:53:40.283Z

[tool_use: Bash]

### User | 2026-06-13T14:53:48.683Z

[tool_result] EISDIR: illegal operation on a directory, read 'H:\prism\knowledge\wiki\hermes-zulu'

### User | 2026-06-13T14:53:57.044Z

[tool_result] 1	# Hermes App as PRISM Master Orchestrator — Architecture
2	
3	**Date:** 2026-06-02 · **Author:** slot:bravo (claude-5e210e4e) · **Source:** repo-verified Workflow recon (4 agents; 2 completed fully, synthesis hit session limit — synthesized here from the 2 complete recon agents + session ground truth).
4	**Supersedes** the "external agent #8 / no slot" framing in `HERMES-APP-INCORPORATION-PLAN-2
... [+6879 chars truncated]

### User | 2026-06-13T14:58:54.581Z

[tool_result] hermes-zulu-advanced-techniques.md
hermes-zulu-applied-practice.md
hermes-zulu-foundations.md
hermes-zulu-resource-atlas.md
hermes-zulu-source-atlas.md
hermes-app-viz-roost.md
hermes-evolving-skills-gap-2026-05-17.md
hermes-zulu-galaxy.md
hermes-zulu-integration.md
zulu-hermes-gap-audit-campaign.md

### Assistant | 2026-06-13T14:58:56.987Z

Now let me read the key wiki files on hermes to complete the picture.

### Assistant | 2026-06-13T14:58:57.422Z

[tool_use: Read]

### Assistant | 2026-06-13T14:58:57.855Z

[tool_use: Read]

### Assistant | 2026-06-13T14:58:58.879Z

[tool_use: Read]

### User | 2026-06-13T14:59:12.608Z

[tool_result] 1	---
2	title: Hermes-Zulu Foundations — fleet orchestration, slot leases, message buses, work allocation, membership and failure detection
3	galaxy: hermes-zulu
4	owner_slot: zebra
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-meta-create-workflow (2026-06-10)"
7	verification_method: CS/distributed-systems facts WebFetch-confirmed against primary + reputable-free sources (the MIT 6.5840/6.824 o
... [+17323 chars truncated]

### User | 2026-06-13T14:59:15.442Z

[tool_result] 1	# HERMES-AGI-ARCHITECTURE — deep research (2026-05-24)
2	
3	**Author:** claude-ea80ce2f slot bravo
4	**Sources:**
5	- Voxyz_ai (2026-05-23) "12 Layers Every AI User Should Understand in 2026" — https://x.com/Voxyz_ai/status/2058222816474919343
6	- kirillk_web3 (2026-05-21) "Kimi Agent Swarm: 300-Agent Parallel System" — https://x.com/kirillk_web3/status/2057497197638242362
7	- User directive 202
... [+6062 chars truncated]

### User | 2026-06-13T14:59:15.444Z

[tool_result] 1	---
2	name: hermes-zulu-integration
3	description: HERMES-MS0 — zulu designated as PRISM's orchestrator-Hermes; slot souls + observation lib + observation Stop hook + statusline MP bar redesigned to slot task-queue countdown
4	type: architecture
5	status: in-progress
6	mapped_units: U-HERMES02, U-HERMES03 (stage-1)
7	date: 2026-05-20
8	---
9	
10	# HERMES-MS0 — Zulu as the designated Hermes orche
... [+8292 chars truncated]

### Assistant | 2026-06-13T14:59:19.319Z

Now let me check the key Hermes-specific engine files and the dream cycle / self-reflect helpers.

### Assistant | 2026-06-13T14:59:20.020Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:59:20.791Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:59:21.649Z

[tool_use: Bash]

### User | 2026-06-13T15:00:31.430Z

[tool_result] Exit code 255

### User | 2026-06-13T15:00:31.928Z

[tool_result] Exit code 255

### User | 2026-06-13T15:01:05.970Z

[tool_result] dream-session-walk.mjs*
dream-stage-memory-receipt.mjs*
dream-stage-memory-receipt.test.mjs
dream-stage-wiki-stub.mjs*
dream-stage-wiki-stub.test.mjs
generate-dream-artifacts-features.mjs*
generate-hermes-features.mjs*
generate-hermes-features.test.mjs*
generate-hermes-zulu-ops-features.mjs*
hermes-cron-prewarm.mjs*
hermes-cron-prewarm.test.mjs
hermes-dream-cycle-synth.mjs*
hermes-dream-cycle-synt
... [+814 chars truncated]

### Assistant | 2026-06-13T15:01:17.367Z

Now let me read the key dream cycle and memory bridge scripts to understand the autonomous-build mechanics.

### Assistant | 2026-06-13T15:01:18.210Z

[tool_use: Read]

### Assistant | 2026-06-13T15:01:18.514Z

[tool_use: Read]

### Assistant | 2026-06-13T15:01:18.628Z

[tool_use: Read]

### User | 2026-06-13T15:01:37.975Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/hermes-dream-cycle-synth.mjs
3	// DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B1-HMEMV04 (2026-05-27, slot:alpha):
4	// Hermes dream-cycle synthesis (the cross-memo connection-discovery half of
5	// HMEMV04). The reverse-mirror H:→C: hook half shipped 2026-05-26 in commit
6	// 5bcf40f66f69 (.claude/hooks/h-to-c-obsidian-mirror.mjs).
7	//
8	// "Dreams" = nightly synth
... [+3878 chars truncated]

### User | 2026-06-13T15:01:40.189Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * hermes-obsidian-memory-bridge.mjs
4	 * ---------------------------------
5	 * Surfaces the Hermes desktop agent's SILOED memory store into the PRISM brain
6	 * vault that Obsidian indexes, closing the Hermes <-> Obsidian synergy gap.
7	 *
8	 * Hermes (C:/Users/<u>/AppData/Local/hermes/) keeps its own learning under
9	 * `memories/*.md` + state.db -- invisible to `H
... [+3437 chars truncated]

### User | 2026-06-13T15:01:40.966Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/hermes-self-reflect-populater.mjs
3	// DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B3-HMEMV06 (2026-05-27, slot:alpha):
4	// Weekly Hermes-reflects-on-own-memories populater. Reads past 7 days of
5	// memories from knowledge/memories/{feedback,reference,project}/*.md, groups
6	// by type, computes top-recurring keywords, writes a markdown digest at
7	// knowledge/mem
... [+2543 chars truncated]

### Assistant | 2026-06-13T15:01:44.160Z

I now have sufficient material to produce the full structured report. Let me also quickly verify the galaxy-reasoning-bridge and skill-loop-pipeline scripts exist.

### Assistant | 2026-06-13T15:01:45.693Z

[tool_use: Bash]

### Assistant | 2026-06-13T15:01:46.256Z

[tool_use: Bash]

### User | 2026-06-13T15:03:11.110Z

[tool_result] Exit code 255

### User | 2026-06-13T15:06:21.140Z

[tool_result] galaxy-reasoning-bridge.mjs
galaxy-reasoning-bridge.test.mjs
hermes-workflow-planner.mjs
hermes-workflow-planner.test.mjs
skill-candidate-detect.mjs
skill-candidate-detect.test.mjs
skill-loop-pipeline.mjs
skill-loop-pipeline.test.mjs

### Assistant | 2026-06-13T15:09:30.178Z

I now have all the material needed for the report. Here it is:

---

HERMES SYSTEM RESEARCH REPORT
Compiled from: H:/prism/mcp-server/src/engines/hermes-zulu/{CLAUDE.md,MEMORY.md,PATHS.md,TOOLBELT.md,SOUL.md}, state/shared/specs/HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md, HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md, HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md, HERMES-MASTER-ORCHESTRATOR-ARCHITECTURE-2026-06-02.md, HERMES-AGI-ARCHITECTURE-RESEARCH-2026-05-24.md, mcp-server/src/engines/AgenticLoopEngine.ts, mcp-server/src/engines/AgentWorkflowEngine.ts, knowledge/wiki/hermes-zulu/hermes-zulu-integration.md, knowledge/wiki/hermes-zulu/hermes-zulu-foundations.md, scripts/hermes-dream-cycle-synth.mjs, scripts/hermes-self-reflect-populater.mjs, scripts/hermes-obsidian-memory-bridge.mjs.

---

(a) WHAT HERMES IS
---

Hermes has two distinct meanings that overlap in this codebase. You must keep them separate.

LAYER 1: Hermes (NousResearch / external desktop app)
Hermes.exe is a third-party Electron-based desktop agent runtime installed at H:/hermes-agent/apps/desktop/release/win-unpacked/Hermes.exe. It exposes a Web UI at http://127.0.0.1:9120 and a WebSocket gateway. It runs its own LLM (configured in C:/Users/wompu/AppData/Local/hermes/config.yaml), keeps its own memory in %LOCALAPPDATA%/hermes/memories/*.md and state.db (SQLite), and has a kanban-style task bus. It was configured to use the same Claude Max / Anthropic OAuth subscription as the PRISM fleet (MEMORY.md lines 199-204: provider: anthropic, base_url: '', credential source: claude_code). It is NOT a shell script and NOT a PRISM MCP engine - it is a separate process.
Source: MEMORY.md:161-166, 199-204.

LAYER 2: Hermes-Zulu Galaxy (the PRISM internal orchestration galaxy)
The "Hermes-Zulu galaxy" is PRISM's own internal abstraction: the pair of NATO chat slots BRAVO (builder) and ZULU (runtime orchestrator), with galaxy doctrine living at H:/prism/mcp-server/src/engines/hermes-zulu/. ZULU is the master orchestr
... [+25368 chars truncated]
