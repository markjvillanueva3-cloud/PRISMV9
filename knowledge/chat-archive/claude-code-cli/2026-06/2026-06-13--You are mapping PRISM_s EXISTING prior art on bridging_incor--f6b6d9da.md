---
type: "chat-session"
source: "claude-code-cli"
session_id: "f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de"
title: "You are mapping PRISM's EXISTING prior art on bridging/incorporating the Nous He"
date: "2026-06-13"
first_ts: "2026-06-13T06:12:21.612Z"
last_ts: "2026-06-13T06:21:27.484Z"
cwd: "H:\\PRISM"
messages: 60
user_msgs: 26
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_9e7a2caf-617/agent-a69b89cfce3864669.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# You are mapping PRISM's EXISTING prior art on bridging/incorporating the Nous He

> **claude-code-cli** | 2026-06-13 | 60 msgs (26 user / 34 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_9e7a2caf-617/agent-a69b89cfce3864669.jsonl`

## Transcript

### User | 2026-06-13T06:12:21.612Z

You are mapping PRISM's EXISTING prior art on bridging/incorporating the Nous Hermes app into PRISM. Goal: report what bridge architecture was already designed, planned, or shipped — so we don't rebuild it.

Read (Glob first to confirm existence, then Read/Grep):
- H:/PRISM/knowledge/memories/reference/reference_hermes_app_incorporation_plan_2026_06_02.md
- H:/PRISM/knowledge/memories/reference/reference_hermes_master_orchestrator_arch_2026_06_02.md
- H:/PRISM/knowledge/memories/reference/reference_hermes_app_launch_fix_cred_pool_2026_06_12.md
- H:/PRISM/scripts/wire-hermes-local-backend.mjs (+ .test.mjs)
- Glob H:/PRISM/scripts/hermes-*.mjs and skim each one's header comment for what it bridges
- Grep H:/PRISM/knowledge/wiki for hermes bridge / incorporation / master-orchestrator entries
- Grep H:/PRISM/mcp-server/src for any hermes bridge engine or dispatcher action

Report, with file:line citations: (1) what is ALREADY BUILT for a Hermes<->PRISM bridge (scripts, engines, dispatcher actions, with status), (2) what was PLANNED but not built, (3) the concrete entry points. Be honest about built-vs-planned-vs-stub. Plain text, no JSON.

### Assistant | 2026-06-13T06:12:28.572Z

I'll systematically read all the referenced files and search for Hermes bridge prior art.

### Assistant | 2026-06-13T06:12:29.829Z

[tool_use: Glob]

### Assistant | 2026-06-13T06:12:29.833Z

[tool_use: Glob]

### User | 2026-06-13T06:13:02.203Z

[tool_result] knowledge\memories\reference\reference_hermes_psn_rag_synergy_research_2026_05_23.md
knowledge\memories\reference\reference_hermes_app_viz_roost_2026_06_05.md
knowledge\memories\reference\reference_hermes_local_wire_ollama_fix_2026_06_06.md
knowledge\memories\reference\reference_hermes-zulu_transcript_synthesis.md
knowledge\memories\reference\reference_hermes_app_incorporation_plan_2026_06_02.md
k
... [+1056 chars truncated]

### User | 2026-06-13T06:13:02.748Z

[tool_result] scripts\lib\hermes-outcome-feedback.mjs
scripts\lib\hermes-frontier-utils.mjs
scripts\lib\hermes-outcome-feedback.test.mjs
scripts\lib\hermes-frontier-utils.test.mjs
scripts\hermes-self-reflect-populater.test.mjs
scripts\hermes-self-reflect-populater.mjs
scripts\hermes-obsidian-memory-bridge.mjs
scripts\hermes-obsidian-memory-bridge.test.mjs
scripts\lib\hermes-workflow-planner.mjs
scripts\lib\herm
... [+318 chars truncated]

### Assistant | 2026-06-13T06:13:05.199Z

[tool_use: Read]

### Assistant | 2026-06-13T06:13:06.205Z

[tool_use: Read]

### Assistant | 2026-06-13T06:13:06.211Z

[tool_use: Read]

### User | 2026-06-13T06:13:20.655Z

[tool_result] 1	---
2	name: reference_hermes_app_incorporation_plan_2026_06_02
3	description: Plan to incorporate the installed Nous Hermes desktop app into PRISM via MCP-over-HTTP (:3100) + filesystem-MCP (vault) + system-viz roost. Hermes = external agent
4	type: reference
5	source: prism-memory
6	synced: 2026-06-13T06:11:18.304Z
7	aliases: reference_hermes_app_incorporation_plan_2026_06_02
8	---
9	
10	
11	20
... [+2949 chars truncated]

### User | 2026-06-13T06:13:26.816Z

[tool_result] 1	---
2	name: reference_hermes_master_orchestrator_arch_2026_06_02
3	description: "Hermes app = slot-less ZULU master orchestrator; teacher machinery already built, slot-brief channel is the one new keystone (now shipped)."
4	type: reference
5	source: prism-memory
6	synced: 2026-06-13T06:11:18.321Z
7	aliases: reference_hermes_master_orchestrator_arch_2026_06_02
8	---
9	
10	
11	**Hermes-as-master-o
... [+2651 chars truncated]

### User | 2026-06-13T06:13:26.829Z

[tool_result] 1	---
2	name: reference_hermes_app_launch_fix_cred_pool_2026_06_12
3	description: "Hermes desktop app launch-crash root cause+fix (its own autonomous agent vibe-coded its source and broke the Python import chain) + Hermes Claude credential-pool architecture (5 OAuth accounts in auth.json, fill_first failover, CLAUDE_CODE_OAUTH_TOKEN bridge, add-account flow)."
4	type: reference
5	source: prism-mem
... [+5003 chars truncated]

### Assistant | 2026-06-13T06:13:44.014Z

Now let me read the scripts and search for more bridge artifacts in parallel.

### Assistant | 2026-06-13T06:13:46.730Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:13:47.369Z

[tool_use: Glob]

### User | 2026-06-13T06:14:25.990Z

[tool_result] scripts\wire-hermes-local-backend.mjs
scripts\wire-hermes-local-backend.test.mjs

### User | 2026-06-13T06:14:42.945Z

[tool_result] ==> H:/PRISM/scripts/hermes-obsidian-memory-bridge.mjs <==
#!/usr/bin/env node
/**
 * hermes-obsidian-memory-bridge.mjs
 * ---------------------------------
 * Surfaces the Hermes desktop agent's SILOED memory store into the PRISM brain
 * vault that Obsidian indexes, closing the Hermes <-> Obsidian synergy gap.
 *
 * Hermes (C:/Users/<u>/AppData/Local/hermes/) keeps its own learning under
 * `mem
... [+9929 chars truncated]

### Assistant | 2026-06-13T06:14:45.187Z

Now read the wire-hermes script and search wiki + engines in parallel.

### Assistant | 2026-06-13T06:14:46.147Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:14:47.567Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:14:48.363Z

[tool_use: Grep]

### User | 2026-06-13T06:15:52.749Z

[tool_result] Found 209 files
knowledge\wiki\architecture\_orphans-rescue.md
knowledge\wiki\index.md
knowledge\wiki\architecture\tests-index.md
knowledge\wiki\architecture\hooks\runtime\prism-shared-config-sync.md
knowledge\wiki\architecture\skills\project\smart-zulu.md
knowledge\wiki\architecture\skills\project\smart-bravo.md
knowledge\wiki\architecture\skills\project\hermes-workflow.md
knowledge\wiki\architec
... [+15763 chars truncated]

### User | 2026-06-13T06:16:10.064Z

[tool_result] #!/usr/bin/env node
// scripts/wire-hermes-local-backend.mjs
//
// Safely point the Hermes desktop agent at a LOCAL Ollama model (the rate-limit-
// free autonomy path from the leopardracer/0xCodez Hermes articles + the
// operator's "local does heavy work, Claude reviews, stay 100% local"
// architecture). U-HERMES-LOCAL-WIRE (slot:bravo, 2026-06-04).
//
// WHY a dedicated script instead of hand-
... [+2984 chars truncated]

### User | 2026-06-13T06:16:10.202Z

[tool_result] ==> H:/PRISM/scripts/lib/hermes-outcome-feedback.mjs <==
// scripts/lib/hermes-outcome-feedback.mjs
//
// U-HFR01 — closed-loop cluster quality feedback. After a Hermes-shipped
// skill is invoked N times, evaluate whether it's actually being used
// productively (operator-marked outcome). If consistently abandoned, mark
// the cluster's pattern as "noise" so future similar clusters AUTO-FAIL.
//

... [+6358 chars truncated]

### Assistant | 2026-06-13T06:16:12.954Z

Now let me search for hermes bridge engines in mcp-server/src and read the key wiki architecture files.

### Assistant | 2026-06-13T06:16:14.504Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:16:14.530Z

[tool_use: Read]

### Assistant | 2026-06-13T06:16:15.039Z

[tool_use: Read]

### User | 2026-06-13T06:16:51.209Z

[tool_result] 1	---
2	title: Slot-brief channel — targeted orchestrator→slot work orders
3	type: architecture
4	status: built
5	created: 2026-06-02
6	by: claude-5e210e4e (slot:bravo)
7	milestone: HERMES-MASTER-ORCHESTRATOR-MS0
8	tags: [hermes, zulu, orchestration, hooks, dispatcher, multi-chat, psn]
9	---
10	
11	# Slot-brief channel
12	
13	The **targeted, consume-once** counterpart to the broadcast chat-bus. Le
... [+3498 chars truncated]

### User | 2026-06-13T06:16:51.262Z

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

### User | 2026-06-13T06:16:55.421Z

[tool_result] Found 55 files
mcp-server\src\tools\dispatchers\memoryDispatcher.ts
mcp-server\src\tools\dispatchers\sessionDispatcher.ts
mcp-server\src\engines\SoulFleetRollupEngine.ts
mcp-server\src\__tests__\memoryDispatcher-namespace-routing.test.ts
mcp-server\src\__tests__\ZuluTaskAuctionEngine.test.ts
mcp-server\src\__tests__\ZuluFleetGovernorEngine.test.ts
mcp-server\src\engines\ObsidianRestBridgeEngine.ts
... [+2645 chars truncated]

### Assistant | 2026-06-13T06:16:57.855Z

Now let me check the spec files and the viz roost and remaining dispatcher actions for Hermes.

### Assistant | 2026-06-13T06:16:59.224Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:17:01.235Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:17:01.531Z

[tool_use: Bash]

### User | 2026-06-13T06:17:18.245Z

[tool_result] 83:  "slot_brief_write",
84:  "slot_brief_list",
1180:          case "slot_brief_write": {
1190:          case "slot_brief_list": {

### User | 2026-06-13T06:18:00.781Z

[tool_result] ---
title: Hermes App system-viz roost (P4)
type: architecture
created: 2026-06-05
slot: bravo

### User | 2026-06-13T06:18:01.810Z

[tool_result] H:/PRISM/state/shared/specs/HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md
H:/PRISM/state/shared/specs/HERMES-AGI-ARCHITECTURE-RESEARCH-2026-05-24.md
H:/PRISM/state/shared/specs/HERMES-APP-INCORPORATION-PLAN-2026-06-02.md
H:/PRISM/state/shared/specs/HERMES-CAPABILITY-EXPANSION-RESEARCH-2026-05-23.md
H:/PRISM/state/shared/specs/HERMES-CONTROL-READINESS-2026-06-01.md
H:/PRISM/state/shared/specs/HERMES
... [+769 chars truncated]

### Assistant | 2026-06-13T06:18:04.289Z

Now let me read the viz roost wiki entry and check config.yaml for the actual MCP wiring status.

### Assistant | 2026-06-13T06:18:04.775Z

[tool_use: Read]

### Assistant | 2026-06-13T06:18:07.209Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:18:07.322Z

[tool_use: Glob]

### User | 2026-06-13T06:18:25.204Z

[tool_result] 1	---
2	title: Hermes App system-viz roost (P4)
3	type: architecture
4	created: 2026-06-05
5	slot: bravo
6	milestone: HERMES-APP-INCORPORATION-MS0
7	unit: U-HERMES-VIZ-ROOST
8	tags: [hermes, system-viz, obsidian, psn, synergy, ghost-roost]
9	---
10	
11	# Hermes App system-viz roost — making the Hermes↔PRISM↔Obsidian↔system-viz synergy observable
12	
13	`scripts/generate-hermes-features.mjs` (HERME
... [+3050 chars truncated]

### User | 2026-06-13T06:18:30.331Z

[tool_result] No files found

### User | 2026-06-13T06:18:48.800Z

[tool_result] 371:mcp_servers:
372:  prism:
377:    url: http://127.0.0.1:3100/mcp

### Assistant | 2026-06-13T06:18:51.933Z

The MCP wiring is confirmed live. Let me grab the full config.yaml MCP block and check the generate-hermes-features script existence.

### Assistant | 2026-06-13T06:18:53.089Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:18:53.709Z

[tool_use: Glob]

### Assistant | 2026-06-13T06:18:53.713Z

[tool_use: Glob]

### User | 2026-06-13T06:19:00.735Z

[tool_result] scripts\generate-hermes-features.mjs

### User | 2026-06-13T06:19:00.737Z

[tool_result] No files found

### User | 2026-06-13T06:19:14.331Z

[tool_result] 371:mcp_servers:
372-  prism:
373-    connect_timeout: 120
374-    sampling:
375-      enabled: false
376-    timeout: 600
377-    url: http://127.0.0.1:3100/mcp
378-memory:
379-  flush_min_turns: 4
380-  memory_char_limit: 12000
381-  memory_enabled: true
382-  nudge_interval: 8
383-  provider: ''
384-  user_char_limit: 5000
385-  user_profile_enabled: true
386-model:

### Assistant | 2026-06-13T06:19:16.632Z

I have enough information to compile the full report. Let me do one final check on the knowledge/hermes-brain directory and the SOUL.md status.

### Assistant | 2026-06-13T06:19:17.598Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:19:18.674Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:19:19.695Z

[tool_use: Bash]

### User | 2026-06-13T06:19:44.556Z

[tool_result] MEMORY.md
USER.md
EXISTS

### User | 2026-06-13T06:19:46.712Z

[tool_result] C:/Users/wompu/AppData/Local/hermes/SOUL.md
EXISTS

### User | 2026-06-13T06:19:46.870Z

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
... [+9804 chars truncated]

### Assistant | 2026-06-13T06:21:27.484Z

I now have a complete picture. Here is the full report.

---

HERMES<->PRISM BRIDGE: PRIOR ART REPORT

---

## (1) WHAT IS ALREADY BUILT (with file:line citations)

### A. MCP-over-HTTP connection (P0) — LIVE AND CONFIRMED

The integration hinge is fully wired. Hermes config.yaml (`C:/Users/wompu/AppData/Local/hermes/config.yaml:371-377`) contains:

```
mcp_servers:
  prism:
    connect_timeout: 120
    sampling:
      enabled: false
    timeout: 600
    url: http://127.0.0.1:3100/mcp
```

This makes all `prism_*` dispatchers available inside Hermes as `mcp_prism_*` tools over StreamableHTTP. No code was needed on the PRISM side — the PRISM MCP server already exposed HTTP at :3100 (`mcp-server/manifest.json:11`). Status: LIVE.

### B. Slot-brief channel — the targeted orchestrator-to-slot write path (BUILT, WIRED)

This is the keystone "genuinely new" artifact. Two components:

- `H:/PRISM/mcp-server/src/engines/SlotBriefEngine.ts` — `writeBrief({slot, body, from?})`, `listPending()`, `listDelivered()`. Atomic write to `state/shared/slot-briefs/<slot>.md`. Slot key alpha-only guard (traversal defense).
- Wired into `contextDispatcher.ts:83-84,1180,1190` as two actions:
  - `prism_context:slot_brief_write` — Hermes calls this via MCP to push a work order to a specific slot
  - `prism_context:slot_brief_list` — inspect pending/delivered briefs
- `.claude/hooks/slot-brief-inject.mjs` — UserPromptSubmit hook (wired in settings.json). On each prompt it reads `state/shared/slot-briefs/<slot>.md`, injects it under `## Orchestrator brief`, then atomically archives it to `slot-briefs/_delivered/<slot>-<ts>-<hash>.md` (consume-once). Commit `97cf13fee4`.

End-to-end pathway: Hermes app → HTTP MCP → `prism_context:slot_brief_write` → `state/shared/slot-briefs/<slot>.md` → `slot-brief-inject.mjs` (next prompt of that slot) → consumed + archived.

Tests: 21/21 (hook) + 13/13 (engine + dispatcher). Wiki: `knowledge/wiki/architecture/slot-brief-channel.md`.

### C. Hermes memory b
... [+11928 chars truncated]
