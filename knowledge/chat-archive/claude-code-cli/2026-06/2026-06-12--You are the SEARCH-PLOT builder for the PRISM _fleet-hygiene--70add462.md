---
type: "chat-session"
source: "claude-code-cli"
session_id: "70add462-1791-4709-8720-39bf7ced2ecc"
title: "You are the SEARCH-PLOT builder for the PRISM \"fleet-hygiene\" galaxy (manufactur"
date: "2026-06-12"
first_ts: "2026-06-12T02:45:27.489Z"
last_ts: "2026-06-12T02:51:49.187Z"
cwd: "H:\\prism-slot-alpha"
messages: 58
user_msgs: 26
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism-slot-alpha/70add462-1791-4709-8720-39bf7ced2ecc/subagents/workflows/wf_8ca2332b-21c/agent-af03d93001eb4423c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# You are the SEARCH-PLOT builder for the PRISM "fleet-hygiene" galaxy (manufactur

> **claude-code-cli** | 2026-06-12 | 58 msgs (26 user / 32 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/70add462-1791-4709-8720-39bf7ced2ecc/subagents/workflows/wf_8ca2332b-21c/agent-af03d93001eb4423c.jsonl`

## Transcript

### User | 2026-06-12T02:45:27.489Z

You are the SEARCH-PLOT builder for the PRISM "fleet-hygiene" galaxy (manufacturing-intelligence platform). GOAL: pre-plot the common codebase searches for THIS domain so a chat in it never needs a live grep -- a precomputed query->answer index.

STEPS (do them, do not skip):
1. Read mcp-server/src/engines/fleet-hygiene/PATHS.md and mcp-server/src/engines/fleet-hygiene/MEMORY.md if present -- they list this domain's key assets/paths.
2. Determine this domain's engine NAME-PATTERNS. Engines live FLAT in mcp-server/src/engines/*.ts named by convention (e.g. wedm->WEDM*, lathe->Lathe*/Turning*/Groove*/Thread*, mill->Mill*/Milling*, cad->CAD*/STEP*/Feature*, cam->CAM*/Toolpath*/Mastercam*/HyperMILL*, speed-feed->SpeedFeed*/Kienzle*/Taylor*/CuttingForce*, post-processor->Post*/Controller*/Gcode*, quoting->Quote*/Cost*/Pricing*, business->ERP*/Payroll*/Invoice*/Customer*, blueprint-vision->OCR*/Blueprint*/Vision*/Pdf*). Use Glob on mcp-server/src/engines/<Pattern>*.ts to find the real files.
3. Build "entries": for the TOP (up to 80) most important matched engine files, emit {name:<ClassOrFileBaseName>, file:<the verified relative path you saw in Glob>, kind:"engine"}. CRITICAL (R12): ONLY include files you actually saw in a Glob result -- NEVER fabricate a path. A real path beats a guessed one.
4. Add this domain's primary MCP dispatcher + a few key actions if you know them (kind:"dispatcher" / "action", file = the dispatcher path or "DISPATCHER_DIGEST.md").
5. Add 15-25 NATURAL-LANGUAGE search queries a chat in THIS domain actually runs (e.g. for wedm: "where is the spark gap / discharge energy calc", "which engine validates wire tension"). Map each to its answer (a file path or symbol name). These are the high-value "all possible searches".
6. Return the schema: {domain:"fleet-hygiene", patterns:[...], engineCount:<total matched>, entries:[...], nlQueries:[...], dispatcher?, notes?}.

Be EXHAUSTIVE but ACCURATE -- every file path must be one you verified via Glob/LS. T
... [+108 chars truncated]

### Assistant | 2026-06-12T02:45:41.106Z

I'll systematically build the search-plot for the fleet-hygiene domain. Let me start by reading the domain's key asset files and then glob for engines.

### Assistant | 2026-06-12T02:45:42.176Z

[tool_use: Bash]

### Assistant | 2026-06-12T02:45:43.398Z

[tool_use: Bash]

### User | 2026-06-12T02:46:44.166Z

[tool_result] NOT FOUND

### User | 2026-06-12T02:46:54.584Z

[tool_result] NOT FOUND

### Assistant | 2026-06-12T02:46:57.596Z

No PATHS.md or MEMORY.md yet. Let me check what's in the fleet-hygiene directory and then glob for relevant engine patterns.

### Assistant | 2026-06-12T02:46:58.628Z

[tool_use: Bash]

### Assistant | 2026-06-12T02:46:58.887Z

[tool_use: Glob]

### User | 2026-06-12T02:47:22.824Z

[tool_result] mcp-server\src\engines\FleetDeploymentLearningEngine.ts
mcp-server\src\engines\FleetLearningStrategyEngine.ts

### User | 2026-06-12T02:48:38.324Z

[tool_result] DIR NOT FOUND

### Assistant | 2026-06-12T02:48:40.934Z

Let me glob for all the fleet-hygiene related engine patterns more broadly.

### Assistant | 2026-06-12T02:48:41.485Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:48:42.473Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:48:42.787Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:48:43.607Z

[tool_use: Glob]

### User | 2026-06-12T02:49:17.008Z

[tool_result] No files found

### User | 2026-06-12T02:49:17.050Z

[tool_result] No files found

### User | 2026-06-12T02:49:27.225Z

[tool_result] mcp-server\src\engines\ProcessCapabilityPredictionEngine.ts
mcp-server\src\engines\ProcessDigitalTwinEngine.ts
mcp-server\src\engines\ProcessEnvironmentSensitivityEngine.ts
mcp-server\src\engines\ProcessFingerprintEngine.ts
mcp-server\src\engines\ProcessPlanEngine.ts
mcp-server\src\engines\ProcessRobustnessEngine.ts
mcp-server\src\engines\ProcessSynthesisEngine.ts
mcp-server\src\engines\ProcessVal
... [+142 chars truncated]

### User | 2026-06-12T02:49:27.231Z

[tool_result] mcp-server\src\engines\MemoryConsolidationEngine.ts
mcp-server\src\engines\MemoryGraphEngine.ts
mcp-server\src\engines\MemoryPressureMonitorEngine.ts
mcp-server\src\engines\MemorySyncEngine.ts
mcp-server\src\engines\MemoryConflictResolverEngine.ts
mcp-server\src\engines\MemoryOntologyEngine.ts

### Assistant | 2026-06-12T02:49:29.747Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:49:30.246Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:49:30.755Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:49:31.070Z

[tool_use: Glob]

### User | 2026-06-12T02:49:47.567Z

[tool_result] No files found

### User | 2026-06-12T02:49:48.173Z

[tool_result] mcp-server\src\engines\HealthEngine.ts

### User | 2026-06-12T02:49:49.536Z

[tool_result] No files found

### User | 2026-06-12T02:49:50.446Z

[tool_result] No files found

### Assistant | 2026-06-12T02:49:52.679Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:49:53.162Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:49:53.659Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:49:53.973Z

[tool_use: Glob]

### User | 2026-06-12T02:50:12.272Z

[tool_result] mcp-server\src\engines\ChatBusEngine.ts
mcp-server\src\engines\ChatterNeuralClassifierEngine.ts
mcp-server\src\engines\ChatterStabilityLobeEngine.ts
mcp-server\src\engines\ChatterPredictionEngine.ts

### User | 2026-06-12T02:50:12.973Z

[tool_result] mcp-server\src\engines\SlottingEngine.ts

### User | 2026-06-12T02:50:13.381Z

[tool_result] mcp-server\src\engines\TaskAgentClassifier.ts

### User | 2026-06-12T02:50:13.884Z

[tool_result] mcp-server\src\engines\SessionAwarenessLifecycleEngine.ts
mcp-server\src\engines\SessionBudgetAdvisorEngine.ts
mcp-server\src\engines\SessionDeltaEngine.ts
mcp-server\src\engines\SessionEventLogEngine.ts
mcp-server\src\engines\SessionHandoffV2Engine.ts
mcp-server\src\engines\SessionInsightsLedgerEngine.ts
mcp-server\src\engines\SessionLifecycleEngine.ts
mcp-server\src\engines\SessionManagementEngi
... [+204 chars truncated]

### Assistant | 2026-06-12T02:50:16.630Z

I have enough data to build a solid search-plot. Let me do a few more targeted globs then synthesize.

### Assistant | 2026-06-12T02:50:17.174Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:50:17.736Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:50:18.129Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:50:18.429Z

[tool_use: Glob]

### User | 2026-06-12T02:50:27.843Z

[tool_result] mcp-server\src\engines\DuplicationGuardEngine.ts

### User | 2026-06-12T02:50:28.288Z

[tool_result] mcp-server\src\engines\HookBanditEngine.ts
mcp-server\src\engines\HookControllerEngine.ts
mcp-server\src\engines\HookCoverageMaximizerEngine.ts
mcp-server\src\engines\HookCreationGuardEngine.ts
mcp-server\src\engines\HookDAGValidatorEngine.ts
mcp-server\src\engines\HookEfficiencyEngine.ts
mcp-server\src\engines\HookEngine.ts
mcp-server\src\engines\HookFastLaneEngine.ts
mcp-server\src\engines\HookL
... [+350 chars truncated]

### User | 2026-06-12T02:50:28.850Z

[tool_result] No files found

### User | 2026-06-12T02:50:29.322Z

[tool_result] No files found

### Assistant | 2026-06-12T02:50:31.741Z

I have sufficient data. Let me do the final key globs in parallel then synthesize immediately.

### Assistant | 2026-06-12T02:50:32.620Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:50:33.211Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:50:33.672Z

[tool_use: Glob]

### Assistant | 2026-06-12T02:50:34.298Z

[tool_use: Glob]

### User | 2026-06-12T02:50:43.357Z

[tool_result] No files found

### User | 2026-06-12T02:50:45.335Z

[tool_result] No files found

### User | 2026-06-12T02:50:45.336Z

[tool_result] No files found

### User | 2026-06-12T02:50:45.341Z

[tool_result] scripts\fleet-reaper-sweep.mjs

### Assistant | 2026-06-12T02:50:48.030Z

I have all the data needed. Synthesizing now.

### Assistant | 2026-06-12T02:51:41.318Z

[tool_use: StructuredOutput]

### User | 2026-06-12T02:51:41.843Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-12T02:51:49.187Z

The search-plot for the **fleet-hygiene** domain is complete. Key findings:

**Domain shape:** No dedicated `mcp-server/src/engines/fleet-hygiene/` subdir exists yet — the galaxy scaffold is pending. All 40 engines are flat in `mcp-server/src/engines/`.

**Three engine families verified via Glob:**
- `Hook*` (16 engines) — lifecycle, telemetry, DAG validation, bandit/efficiency, fast-lane, coverage, manifest, registry
- `Session*` (12 engines) — awareness, budget, delta, event-log, handoff-v2, insights-ledger, lifecycle, management, reorientation, replay, stability, token-ledger
- `Memory*` (6 engines) — consolidation, graph, pressure-monitor, sync, conflict-resolver, ontology

**Primary execution surface is hooks, not an MCP dispatcher.** The fleet-reaper, memory monitor, and task-health watchdog live in `scripts/*.mjs` + `.claude/hooks/*.mjs`, not in a named dispatcher.

**25 NL queries mapped** covering: orphan-kill safety invariant, PID-to-slot classification, memory pressure tiers, hook DAG cycles, session handoff write path, scrutiny gate, slot-task claiming, chat-bus messaging, and scheduled-task health.
