---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Explore PRISM bravo-lane ENGINES + SCRIPTS for dormancy (zero-consumer / built-b"
date: "2026-06-10"
first_ts: "2026-06-10T14:19:48.438Z"
last_ts: "2026-06-10T14:33:31.064Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 22
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_4d625bda-f67/agent-acf394a6425c59efc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Explore PRISM bravo-lane ENGINES + SCRIPTS for dormancy (zero-consumer / built-b

> **claude-code-cli** | 2026-06-10 | 63 msgs (22 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_4d625bda-f67/agent-acf394a6425c59efc.jsonl`

## Transcript

### User | 2026-06-10T14:19:48.438Z

Explore PRISM bravo-lane ENGINES + SCRIPTS for dormancy (zero-consumer / built-but-unwired). Repo root H:/prism.
bravo domain_filter = hermes|zulu|orchestrat|fleet|slot-soul|stub-hunt|dream-cycle|self-reflect|consensus|octopus|moonshot|obsidian|collective|chat-bus|slot-brief. Stay in this lane; mark anything that is really another slot lane.
Look in: H:/prism/scripts/*.mjs + scripts/lib/*.mjs + mcp-server/src/engines/hermes-zulu/ + any mcp-server/src/engines/*Orchestrat*/*Consensus*/*Octopus*/*Hermes*/*Zulu*/*Dream*/*SelfReflect*/*Moonshot*/*Collective*.ts.
For each: is it CONSUMED (imported/referenced by a wired hook, a dispatcher, a scheduled task .ps1, or another consumed module)? ZERO consumers (besides its own test) = dormant. Use DIRECT grep.
EXCLUDE (already handled this session, do NOT re-flag): auto-consensus-critical-edit, auto-consensus-userprompt, stop-consensus-drain, slot-brief-inject, zulu-advisory-inject, cross-session-orchestrator, octopus-provider-probe, chat-bus-inject, auto-consensus-sync-bash, octopus-dispatch, octopus-record-lib, octopus-corpus-loader, octopus-input-curator, octopus-route-policy, octopus-live-brain, octopus-weekly-synthesis-loader, octopus-consumption-bridge, octopus-first-live-record, consensus-queue-drain, ask-ollama.
Return ONLY a structured markdown table: asset | path | consumer-count | dormancy-class (UNWIRED-ENGINE / NO-CONSUMER-LIB / ORPHAN-SCRIPT / HEALTHY) | 1-line activation. ONLY real gaps. Cap 15. End with a count summary.

### Assistant | 2026-06-10T14:19:55.766Z

I'll explore the PRISM bravo-lane for dormant engines and scripts. Let me start by understanding the directory structure and then searching for consumer references.

### Assistant | 2026-06-10T14:19:56.187Z

[tool_use: Bash]

### User | 2026-06-10T14:20:01.140Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-06-10T14:20:26.312Z

I'll use PowerShell instead for Windows environment navigation.

### Assistant | 2026-06-10T14:20:26.313Z

[tool_use: PowerShell]

### User | 2026-06-10T14:20:27.713Z

[tool_result] <persisted-output>
Output too large (38.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\001bd6c3-283f-428a-ab3f-66fd01309443\tool-results\b10totc8r.txt

Preview (first 2KB):
_audit-foxtrot-mill-cam.mjs
_classify-hooks.mjs
_emergency-unwire-yolo-25.mjs
_hook-audit-report.mjs
_oneshot-rename-last-night.mjs
_prep-hook-slices.mjs
_restore-3-critical-hooks.mjs
_restore-conti
... [+1795 chars truncated]

### Assistant | 2026-06-10T14:20:31.749Z

Now let me look at the engine directories for the bravo lane:

### Assistant | 2026-06-10T14:20:31.954Z

[tool_use: Bash]

### User | 2026-06-10T14:20:42.105Z

[tool_result] H:/prism/mcp-server/src/engines
H:/prism/mcp-server/src/engines/.claude
H:/prism/mcp-server/src/engines/academy
H:/prism/mcp-server/src/engines/agent-orchestration
H:/prism/mcp-server/src/engines/ai-training
H:/prism/mcp-server/src/engines/backend-helper
H:/prism/mcp-server/src/engines/blueprint-vision
H:/prism/mcp-server/src/engines/bug-hunting
H:/prism/mcp-server/src/engines/business
H:/prism/mc
... [+923 chars truncated]

### Assistant | 2026-06-10T14:20:53.360Z

Now let me search for the hermes-zulu and related bravo-lane engines:

### Assistant | 2026-06-10T14:20:53.361Z

[tool_use: Bash]

### User | 2026-06-10T14:21:00.046Z

[tool_result] H:/prism/mcp-server/src/engines/AlgorithmOrchestratorEngine.ts
H:/prism/mcp-server/src/engines/AutonomousAIOrchestrationEngine.ts
H:/prism/mcp-server/src/engines/AutoProgramOrchestratorEngine.ts
H:/prism/mcp-server/src/engines/AutoResearchOrchestratorEngine.ts
H:/prism/mcp-server/src/engines/BlueprintToAllCADsOrchestratorEngine.ts
H:/prism/mcp-server/src/engines/CADConsensusEngine.ts
H:/prism/mcp-
... [+8657 chars truncated]

### Assistant | 2026-06-10T14:21:05.516Z

Now let me search for consumer references in the codebase. I'll check for imports and references to these bravo-lane engines:

### Assistant | 2026-06-10T14:21:06.812Z

[tool_use: Grep]

### User | 2026-06-10T14:21:15.053Z

[tool_result] Found 49 files
knowledge\memories\reference\reference_bravo_verify_against_main_not_worktree_2026_05_29.md
knowledge\memories\reference\reference_bravo_hermes_zulu_engine_surface.md
mcp-server\data\state\cross-session-asset-registry.json
knowledge\wiki\architecture\engines\other\hermesparallelbudgetenvelopeengine.md
knowledge\wiki\architecture\engines\other\hermesparallelfanoutplannerengine.md
kno
... [+2573 chars truncated]

### Assistant | 2026-06-10T14:21:27.417Z

Let me now check the hermes-zulu directory for relevant files:

### Assistant | 2026-06-10T14:21:27.745Z

[tool_use: Bash]

### User | 2026-06-10T14:21:33.115Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-10T14:21:43.891Z

Let me check what's in the hermes-zulu directory:

### Assistant | 2026-06-10T14:21:44.532Z

[tool_use: PowerShell]

### User | 2026-06-10T14:21:46.446Z

[tool_result] [32;1mFullName[0m
[32;1m--------[0m
H:\PRISM\mcp-server\src\engines\hermes-zulu\CLAUDE.md
H:\PRISM\mcp-server\src\engines\hermes-zulu\MEMORY.md
H:\PRISM\mcp-server\src\engines\hermes-zulu\PATHS.md
H:\PRISM\mcp-server\src\engines\hermes-zulu\TOOLBELT.md

### Assistant | 2026-06-10T14:21:55.157Z

Now let me search for script files in the bravo-lane domain and check for consumers:

### Assistant | 2026-06-10T14:21:57.315Z

[tool_use: Bash]

### User | 2026-06-10T14:22:05.130Z

[tool_result] H:/prism/scripts/account-switch-restart-coordinator.mjs
H:/prism/scripts/adapt-router-thresholds.mjs
H:/prism/scripts/add-ollama-skill-policy-frontmatter.mjs
H:/prism/scripts/agents/spawned-agent-context-lib.mjs
H:/prism/scripts/ai-training-galaxy-audit.mjs
H:/prism/scripts/allocate-rgs-per-slot.mjs
H:/prism/scripts/append-closed-loop-india-section.mjs
H:/prism/scripts/apply-karpathy-doctrine-to-g
... [+1045 chars truncated]

### Assistant | 2026-06-10T14:22:09.404Z

Let me now search for consumer references to the specific bravo-lane engines more systematically:

### Assistant | 2026-06-10T14:22:10.194Z

[tool_use: Bash]

### User | 2026-06-10T14:22:21.251Z

[tool_result] H:/prism/mcp-server/src/engines/ChatBusEngine.ts
H:/prism/mcp-server/src/engines/CoordinationStoreEngine.ts
H:/prism/mcp-server/src/engines/MoonshotClientEngine.ts
H:/prism/mcp-server/src/engines/SlotBriefEngine.ts
H:/prism/mcp-server/src/engines/SlotSessionHistoryEngine.ts
H:/prism/mcp-server/src/engines/SlottingEngine.ts
H:/prism/mcp-server/src/engines/ZuluDashboardControlEngine.ts
H:/prism/mcp-
... [+1141 chars truncated]

### Assistant | 2026-06-10T14:22:31.283Z

Let me look at the actual content of key bravo-lane engines to check their consumer status:

### Assistant | 2026-06-10T14:22:31.284Z

[tool_use: Read]

### User | 2026-06-10T14:22:33.977Z

[tool_result] 1	/**
2	 * ZuluDashboardControlEngine — HZD-05 (HZP-DASH-MS0)
3	 *
4	 * MCP-callable wrapper around the hzp-dash-control HTTP server (:8767).
5	 * Lets zulu-the-agent issue fleet-control operations via `prism_session:
6	 * zulu_control_*` actions instead of the dashboard's POST form.
7	 *
8	 * The HTTP server enforces governor + audit; this engine is a thin client.
9	 * If the control server is do
... [+1482 chars truncated]

### Assistant | 2026-06-10T14:22:37.677Z

Now let me search for consumers of these engines across hooks, dispatchers, and scripts:

### Assistant | 2026-06-10T14:22:38.643Z

[tool_use: Bash]

### User | 2026-06-10T14:22:46.479Z

[tool_result] H:/prism/scripts/hzp-dash-control-server.mjs:3

### Assistant | 2026-06-10T14:22:55.938Z

Let me search for consumers in hooks and scheduled tasks:

### Assistant | 2026-06-10T14:22:56.258Z

[tool_use: Bash]

### User | 2026-06-10T14:23:02.105Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-10T14:23:09.137Z

Let me check for hook references more efficiently:

### Assistant | 2026-06-10T14:23:10.009Z

[tool_use: Bash]

### User | 2026-06-10T14:23:15.485Z

[tool_result] 0

### Assistant | 2026-06-10T14:23:24.599Z

Let me check the MCP server registry and consumer references more systematically:

### Assistant | 2026-06-10T14:23:25.261Z

[tool_use: Bash]

### User | 2026-06-10T14:23:32.489Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/cncOpsDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/contextDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/sessionDispatcher.ts

### Assistant | 2026-06-10T14:23:40.346Z

Let me now check for dormant bravo-lane scripts systematically:

### Assistant | 2026-06-10T14:23:41.456Z

[tool_use: Bash]

### User | 2026-06-10T14:23:47.597Z

[tool_result] 426

### Assistant | 2026-06-10T14:23:53.544Z

Let me refine my search to find truly dormant (zero-consumer) assets. Let me check specific bravo-lane engine files:

### Assistant | 2026-06-10T14:23:53.775Z

[tool_use: Read]

### User | 2026-06-10T14:23:55.631Z

[tool_result] 1	/**
2	 * MoonshotClientEngine — HTTP client for Moonshot AI's Kimi API.
3	 *
4	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS / MOONSHOT.
5	 *
6	 * Wraps the OpenAI-compatible /v1/chat/completions endpoint at api.moonshot.ai.
7	 * Default model: kimi-k2 (1T-param MoE, 32B activated, ~Sept 2025).
8	 *
9	 * Why this exists: Kimi-K2 is a ~1T-param MoE model — physically too large to
10
... [+2375 chars truncated]

### Assistant | 2026-06-10T14:24:01.548Z

Let me now systematically search for which bravo-lane engines have no consumers:

### Assistant | 2026-06-10T14:24:05.636Z

[tool_use: Bash]

### User | 2026-06-10T14:27:15.225Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-10T14:27:31.138Z

Let me take a more efficient approach using grep to count references directly:

### Assistant | 2026-06-10T14:27:31.178Z

[tool_use: Grep]

### User | 2026-06-10T14:27:37.620Z

[tool_result] Found 43 files
state\shared\.fleet-reaper-enum-cache-DESKTOP-N7MI1VB.json
knowledge\memories\reference\reference_post_ship_psn-octopus-fleet-synergy-ms0-u-dream-scanner-wire.md
knowledge\memories\reference\reference_post_ship_dream-receipt-ms0-u-dr07.md
knowledge\memories\reference\reference_post_ship_dream-receipt-ms0-u-dr08.md
knowledge\memories\reference\reference_bravo_unwired_hooks_audit_2026
... [+2085 chars truncated]

### Assistant | 2026-06-10T14:27:46.101Z

Let me check the ENGINE_DIGEST to get authoritative engine information:

### Assistant | 2026-06-10T14:27:46.304Z

[tool_use: Read]

### User | 2026-06-10T14:27:47.347Z

[tool_result] 1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries for TRAINING-LEARNING-MS0/U-TL-U5..U6)
4	
5	- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
6	- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
7	- **AbstractionHierarchyEngine**: Multi-level tip→principle→law generalization
8	- **AccessControlL
... [+7016 chars truncated]

### Assistant | 2026-06-10T14:27:50.351Z

Let me search the ENGINE_DIGEST for the specific bravo-lane engines:

### Assistant | 2026-06-10T14:27:55.114Z

[tool_use: Bash]

### User | 2026-06-10T14:28:03.199Z

[tool_result] - **ChatBusEngine**: Live instant chat + file-claim registry for concurrent Claude chats.
- **ConsensusAIBridgeEngine**: adapter that lets PRISM AI orchestration engines
- **ConsensusCoordinatorEngine**: concurrency-aware wrapper around MultiModelConsensusEngine.
- **MoonshotClientEngine**: HTTP client for Moonshot AI's Kimi API.
- **SlottingEngine**: Slot Milling Parameter Calculator

### Assistant | 2026-06-10T14:28:27.008Z

Let me now do a comprehensive search for actual consumers of each bravo-lane engine systematically:
[tool_use: Bash]

### User | 2026-06-10T14:33:31.064Z

[tool_result] Command running in background with ID: bhoc1s5zz. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\7f506c5d-f4df-44bb-9bbd-cfff0bce0dba\tasks\bhoc1s5zz.output. You will be notified when it completes. To check interim output, use Read on that file path.
