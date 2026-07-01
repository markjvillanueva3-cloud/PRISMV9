---
type: "chat-session"
source: "claude-code-cli"
session_id: "fba58390-8609-4dfb-be17-96afb0a4822f"
title: "I need to \"auto-ingest on SessionStart or via cron\" a pre-built index for a PRIS"
date: "2026-05-14"
first_ts: "2026-05-14T20:07:13.146Z"
last_ts: "2026-05-14T20:17:46.628Z"
cwd: "H:\\prism"
messages: 87
user_msgs: 37
assistant_msgs: 50
raw_file: "H:/.claude/projects/H--prism/fba58390-8609-4dfb-be17-96afb0a4822f/subagents/agent-aefde74cea2b7c9ad.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# I need to "auto-ingest on SessionStart or via cron" a pre-built index for a PRIS

> **claude-code-cli** | 2026-05-14 | 87 msgs (37 user / 50 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fba58390-8609-4dfb-be17-96afb0a4822f/subagents/agent-aefde74cea2b7c9ad.jsonl`

## Transcript

### User | 2026-05-14T20:07:13.146Z

I need to "auto-ingest on SessionStart or via cron" a pre-built index for a PRISM engine. The engine `mcp-server/src/engines/BlueprintProgramJoinEngine.ts` now has a lazy, mtime-guarded, single-flight singleton cache accessor `getJoinIndex()` that streams a ~60MB JSONL (`Docustrata/.index/blueprint-program-join-full-v6.jsonl`) into in-memory Maps. "Auto-ingest" means: make sure the index gets warmed/validated proactively rather than only lazy-loading on first dispatcher call.

I'm weighing two mechanisms and need to know the existing precedent + risk for each. Investigate and report:

1. **SessionStart hooks**: Look in `H:/prism/.claude/hooks/*.mjs` and `H:/.claude/settings.json` (the SessionStart hook chain). Are there existing SessionStart hooks that pre-warm an engine cache or read a large data file? Report any precedent. ALSO: the project has documented "harness hang prevention" concerns from SessionStart hook fork-storms (see CLAUDE.md and memory `reference_harness_hang_prevention`). Is there a `sessionstart-bundle.mjs`? How do lightweight SessionStart injectors avoid blocking? What would it cost to add a hook that warms a 60MB-JSONL streaming load on SessionStart?

2. **Cron**: Look in `H:/prism/scripts/` and any cron registry (`.claude/helpers/` for cron helpers, `scripts/system-health/*.ps1`, golf-cron-registry, scheduled-task installers like `install-*-task.ps1`). What's the existing pattern for a PRISM cron/scheduled task that touches `Docustrata/.index/` or refreshes an index? Is there a precedent for a "warm + validate an index file" cron script? How are new cron jobs registered?

3. Check whether `Docustrata/.index/` already has any refresh/regen automation, and whether `scripts/docustrata/` scripts (phase16-blueprint-program-join-v6.py, phase20-verified-prints-index.py) are invoked by anything automated.

4. Does `mcp-server/src/engines/BlueprintProgramJoinEngine.ts` get imported/initialized anywhere at server startup (search `mcp-server/src/index.ts` 
... [+250 chars truncated]

### Assistant | 2026-05-14T20:07:17.283Z

I'll investigate the precedents and risks for both mechanisms. Let me search systematically across the codebase.

### Assistant | 2026-05-14T20:07:17.486Z

[tool_use: Bash]

### User | 2026-05-14T20:07:22.052Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-05-14T20:07:23.718Z

Let me adjust the syntax for PowerShell.

### Assistant | 2026-05-14T20:07:24.275Z

[tool_use: Bash]

### User | 2026-05-14T20:07:38.416Z

[tool_result] /h/.claude/backups/sync-20260419-210038/settings.json
/h/.claude/hooks/ai-system-router-inject.mjs
/h/.claude/hooks/duplication-guard-stop.mjs
/h/.claude/hooks/plugin-path-fixer.mjs
/h/.claude/hooks/self-awareness-enforce.mjs
/h/.claude/hooks/wedm-tier6-geom-gate.mjs
/h/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/tests/opencode/test-bootstrap-caching.mjs
/h/.claude/plugins/cach
... [+428 chars truncated]

### Assistant | 2026-05-14T20:07:40.366Z

Now let me check the project-specific and global settings for SessionStart hooks:

### Assistant | 2026-05-14T20:07:40.575Z

[tool_use: Read]

### Assistant | 2026-05-14T20:07:40.840Z

[tool_use: Read]

### Assistant | 2026-05-14T20:07:41.015Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:07:41.612Z

[tool_use: Bash]

### User | 2026-05-14T20:07:45.227Z

[tool_result] 1	{
2	  "permissions": {
3	    "allow": [],
4	    "deny": []
5	  }
6	}
7	

### User | 2026-05-14T20:07:45.644Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
5	    "OLLAMA_MODELS": "H:/Tools/ollama/models",
6	    "NIM_URL": "http://127.0.0.1:8000/v1",
7	    "NIM_EMBED_URL":
... [+31493 chars truncated]

### User | 2026-05-14T20:08:11.945Z

[tool_result] <persisted-output>
Output too large (172.3KB). Full output saved to: C:\Users\Mark Villanueva\.claude\projects\H--prism\fba58390-8609-4dfb-be17-96afb0a4822f\tool-results\b1a0ai91a.txt

Preview (first 2KB):
/h/prism/.claude/cache/debug-reward.mjs
/h/prism/.claude/cache/merge-duplicates.mjs
/h/prism/.claude/cache/recover-from-transcripts.mjs
/h/prism/.claude/cache/tool-audit.mjs
/h/prism/.claude/cac
... [+1809 chars truncated]

### User | 2026-05-14T20:08:11.986Z

[tool_result] /h/prism/.claude/settings.json
/h/prism/.claude/settings.local.json
/h/prism/.claude/worktrees/brave-euclid/.claude/settings.json
/h/prism/.claude/worktrees/brave-euclid/.claude/settings.local.json
/h/prism/.claude/worktrees/brave-euclid/mcp-server/.claude/settings.json
/h/prism/.claude/worktrees/psau-sav2/state/shared/claude-user-mirror/settings.json
/h/prism/.claude/worktrees/psau-sav2/state/sha
... [+893 chars truncated]

### Assistant | 2026-05-14T20:08:17.341Z

Now let me search for the BlueprintProgramJoinEngine and check for any existing patterns in the codebase:

### Assistant | 2026-05-14T20:08:17.781Z

[tool_use: Read]

### Assistant | 2026-05-14T20:08:18.312Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:08:18.529Z

[tool_use: Bash]

### User | 2026-05-14T20:08:22.168Z

[tool_result] 1	/**
2	 * BlueprintProgramJoinEngine — Phase 8 → JM Die program join table
3	 *
4	 * Joins blueprint pages extracted by Phase 8 (cleaned JSONL with
5	 * part_numbers_clean) to JM Die program/CAD files indexed by:
6	 *   - program-labels.json   (mcp-server/data/state/program-labels.json,
7	 *                            real lathe labels with filePath/customer/etc)
8	 *   - master-index.json     (d
... [+3096 chars truncated]

### User | 2026-05-14T20:08:27.337Z

[tool_result] /h/prism/scripts/api_swarm_executor_v2.py
/h/prism/scripts/batch/enhance_127_params_swarm.py
/h/prism/scripts/batch/jc_enhancement_swarm.py
/h/prism/scripts/batch/jc_enhancement_swarm_v2.py
/h/prism/scripts/cognitive_formula_scrutiny_swarm.py
/h/prism/scripts/core/semantic_code_index.py
/h/prism/scripts/docustrata/phase20-verified-prints-index.py
/h/prism/scripts/extraction/monolith_indexer.py
/h/
... [+504 chars truncated]

### User | 2026-05-14T20:08:29.580Z

[tool_result] /h/prism/scripts/docustrata

### Assistant | 2026-05-14T20:08:32.971Z

Let me continue the investigation systematically. I'll look for existing cron patterns and SessionStart precedent:

### Assistant | 2026-05-14T20:08:33.396Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:08:33.561Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:08:33.696Z

[tool_use: Bash]

### User | 2026-05-14T20:08:42.211Z

[tool_result] /h/prism/scripts/coordination-db-health.ps1
/h/prism/scripts/disable_prism_node_cleaner.ps1
/h/prism/scripts/install-orphan-reaper-task.ps1
/h/prism/scripts/reap-orphan-procs.ps1
/h/prism/scripts/reaper-tick.ps1
/h/prism/scripts/system-health/00-defender-exclusion-bootstrap.ps1
/h/prism/scripts/system-health/04-prism-mcp-orphan-monitor.ps1
/h/prism/scripts/system-health/06-peer-audit-tick.ps1
/h/p
... [+96 chars truncated]

### User | 2026-05-14T20:08:57.716Z

[tool_result] total 172
drwxr-xr-x 1 Mark V 197608     0 May 14 14:11 .
drwxr-xr-x 1 Mark V 197608     0 May 14 14:26 ..
-rwxr-xr-x 1 Mark V 197608  4138 May 14 14:11 fix-part-json-join-source.py
-rw-r--r-- 1 Mark V 197608 20287 May 14 14:11 phase16-blueprint-program-join-v6.py
-rwxr-xr-x 1 Mark V 197608 14099 May 14 14:11 phase20-verified-prints-index.py

### User | 2026-05-14T20:10:50.480Z

[tool_result] Command running in background with ID: bhvvfaxtk. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\3038ceec-c857-47ee-845e-c8cfe437daa8\tasks\bhvvfaxtk.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-14T20:10:52.304Z

Let me check the existing system-health scripts and look for SessionStart hook patterns more directly:

### Assistant | 2026-05-14T20:10:52.735Z

[tool_use: Read]

### Assistant | 2026-05-14T20:10:53.229Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:10:54.105Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:10:54.112Z

[tool_use: Bash]

### User | 2026-05-14T20:11:00.170Z

[tool_result] 1	#!/usr/bin/env pwsh
2	<#
3	.SYNOPSIS
4	  CLEANUP-MS0/U-CLEANUP-F2 — Envelope drift cron (30-min cadence).
5	
6	.DESCRIPTION
7	  Thin Windows-Task-Scheduler wrapper around scripts/build-envelope-drift.mjs.
8	  Regenerates state/shared/MILESTONE_PROGRESS.json, computes a canonicalized
9	  hash + extracts totals.drift, compares against the previous snapshot at
10	  state/shared/envelope-drift-last.
... [+1883 chars truncated]

### User | 2026-05-14T20:11:06.980Z

[tool_result] 468

### User | 2026-05-14T20:11:09.096Z

[tool_result] /h/prism/.claude/hooks/bundles/sessionstart-bundle.mjs:// sessionstart-bundle.mjs — single SessionStart hook for the context-injector /
/h/prism/.claude/hooks/bundles/sessionstart-bundle.mjs:  try { process.stderr.write(`sessionstart-bundle error: ${err}\n`); } catch { /* */ }
/h/prism/.claude/hooks/ollama-context-aggregator.mjs:    re: /hook|userprompt|pretool|posttool|sessionstart/i,
/h/prism/.c
... [+245 chars truncated]

### User | 2026-05-14T20:11:09.118Z

[tool_result] /h/prism/.claude/hooks/_envelope.mjs
/h/prism/.claude/hooks/auto-lint-post-edit.mjs
/h/prism/.claude/hooks/embed-vault-on-save.mjs
/h/prism/.claude/hooks/enforce-roadmap-closeout.mjs
/h/prism/.claude/hooks/performance-pattern-detector.mjs
/h/prism/.claude/hooks/permission-denied-retry.mjs
/h/prism/.claude/hooks/precompact-auto-trigger.mjs
/h/prism/.claude/hooks/prism-intelligence-briefing.mjs
/h/p
... [+85 chars truncated]

### Assistant | 2026-05-14T20:11:11.701Z

Excellent! There IS a sessionstart-bundle. Let me examine it:

### system

... [7 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-14T20:11:24.416Z

[tool_use: Read]

### Assistant | 2026-05-14T20:11:24.748Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:11:25.732Z

[tool_use: Bash]

### User | 2026-05-14T20:11:27.862Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Main Entry Point
3	 * Manufacturing Intelligence MCP Server
4	 * 
5	 * Provides access to:
6	 * - 55 dispatchers, 1670+ verified actions
7	 * - 554 engine files (561 exported), 23 registries
8	 * - Materials Database (6,372+ materials x 127 parameters)
9	 * - Machines Database (1,015+ machines x 4 layers)
10	 * - Controller Alarms (10,033+ alarms x 12 families)
11	 * 
... [+8222 chars truncated]

### User | 2026-05-14T20:12:15.942Z

[tool_result] /h/prism/mcp-server/src/engines/BlueprintProgramJoinEngine.ts: * BlueprintProgramJoinEngine — Phase 8 → JM Die program join table
/h/prism/mcp-server/src/engines/BlueprintProgramJoinEngine.ts: * BlueprintProgramJoinEngine — class wrapper exposing static methods so
/h/prism/mcp-server/src/engines/BlueprintProgramJoinEngine.ts: *   BlueprintProgramJoinEngine.joinBlueprintsToPrograms(...)
/h/prism/mc
... [+1510 chars truncated]

### User | 2026-05-14T20:14:21.296Z

[tool_result] Command running in background with ID: bpcpe8s0u. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\3038ceec-c857-47ee-845e-c8cfe437daa8\tasks\bpcpe8s0u.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-14T20:14:25.563Z

Let me check the Docustrata index directory and look at how the existing phase16/phase20 scripts work:

### Assistant | 2026-05-14T20:14:25.802Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:14:26.238Z

[tool_use: Read]

### Assistant | 2026-05-14T20:14:26.571Z

[tool_use: Read]

### User | 2026-05-14T20:14:31.009Z

[tool_result] 1	"""
2	Phase 16 — Blueprint <-> Program/CAD join v6
3	
4	v6 = v5's proven join logic, re-pointed at the CLEANED, COMPLETE inputs:
5	  - v5 ran 2026-05-12 against a still-running phase-15 (673 huge PDFs deferred) and
6	    the RAW per-page part_numbers (which leak dates / phones / dimension callouts).
7	  - v6 reads `phase20-verified-prints.jsonl` — the consolidated verified-prints
8	    index bui
... [+2997 chars truncated]

### User | 2026-05-14T20:14:31.668Z

[tool_result] 150	 *   2. strip a leading L-/M-/G- operation prefix
151	 *   3. strip a trailing -OPn op-number suffix
152	 *   4. strip a trailing material/heat-treat code (-D2/-4140/-6061/...)
153	 *   5. strip a trailing single-letter -A/-B revision marker
154	 *   6. collapse whitespace
155	 *
156	 * Returns "" on falsy/whitespace-only input.
157	 */
158	export function normalizePartNumber(raw: string): str
... [+7085 chars truncated]

### User | 2026-05-14T20:14:37.509Z

[tool_result] total 782M
drwxr-xr-x 1 Mark V 197608    0 May 14 08:56 .
drwxr-xr-x 1 Mark V 197608    0 May  8 18:07 ..
drwxr-xr-x 1 Mark V 197608    0 May 12 22:12 __pycache__
drwxr-xr-x 1 Mark V 197608    0 May 10 00:13 _phase10_mineru_work
-rw-r--r-- 1 Mark V 197608 2.0M May  9 18:59 blueprint-program-join.jsonl
-rw-r--r-- 1 Mark V 197608 9.8M May  9 19:19 blueprint-program-join-full.jsonl
-rw-r--r-- 1 Mark 
... [+945 chars truncated]

### Assistant | 2026-05-14T20:14:41.546Z

Let me look at the getJoinIndex method more closely to understand the lazy-load pattern:

### Assistant | 2026-05-14T20:14:42.212Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:14:42.673Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:14:42.828Z

[tool_use: Bash]

### User | 2026-05-14T20:14:48.167Z

[tool_result] (Bash completed with no output)

### User | 2026-05-14T20:14:50.110Z

[tool_result] | `PRISM-INVENTORY-LATEST.md` | Live auto-updated counts (engines, dispatchers, actions, hooks, scripts). Regenerated on every SessionStart. |
| `mcp-server/data/docs/gsd/GSD_QUICK.md` | Session lifecycle — which hooks auto-fire on SessionStart / UserPromptSubmit / Stop. |
| `state/shared/BUILD_STATE.md` / `.json` | **Auto-injected** snapshot of BUILT vs NEEDS_WIRING vs NEEDS_BUILDING vs NEEDS_FRO
... [+1058 chars truncated]

### User | 2026-05-14T20:14:51.358Z

[tool_result] - 2026-05-14 | `build-tracker.mjs` PostToolUse:Write fires `/bin/bash: xmalloc: cannot allocate 8192 bytes` (fork-storm symptom under Windows hook load) | fix: not a code bug; run `node .claude/helpers/node-process-janitor.mjs --full` to reap orphan bash.exe + MCP procs | observed-by: claude-48450e3d /forge-audit-v2 | verify: subsequent Write hooks emit no xmalloc errors

### Assistant | 2026-05-14T20:14:56.957Z

Perfect! I found a critical reference to fork-storm. Let me search for more context on that and look at the reference_harness_hang_prevention memory:

### Assistant | 2026-05-14T20:14:57.439Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:14:57.826Z

[tool_use: Bash]

### User | 2026-05-14T20:16:02.544Z

[tool_result] /h/prism/.cache/temp/v2.md
/h/prism/.claude/commands/fleet-reaper.md
/h/prism/.claude/hooks/AGI_INFRA_PHASE_A_WIRING.md
/h/prism/.claude/memory/feedback_hook_process_hygiene.md
/h/prism/.claude/worktrees/brave-euclid/mcp-server/data/docs/roadmap/archive/old-monolithic/PRISM_ROADMAP_v15.2.md

### User | 2026-05-14T20:16:07.167Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T20:16:09.738Z

Let me do a final targeted check on the settings.json to understand the hook ordering and check for any cron registry:

### Assistant | 2026-05-14T20:16:10.408Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:16:11.158Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:16:11.295Z

[tool_use: Read]

### User | 2026-05-14T20:16:14.274Z

[tool_result] 1	/**
2	 * PartFolderOrganizerEngine — JM Die per-customer / per-part-number folder library
3	 *
4	 * Maintains the standardized intake folder for every part that enters the system:
5	 *
6	 *   <libraryRoot>/<CUSTOMER>/<PART NUMBER>/
7	 *     <PART NUMBER>__<srcpdf>__p<page>.pdf   ← the print(s) + related docs (folder root)
8	 *     part.json                               ← manifest (provenance, m
... [+4825 chars truncated]

### User | 2026-05-14T20:16:17.262Z

[tool_result] /h/prism/mcp-server/src/engines/PartFolderOrganizerEngine.ts:26: * Source of the matches: `Docustrata/.index/blueprint-program-join-full-v6.jsonl` (read directly;
/h/prism/mcp-server/src/engines/PartFolderOrganizerEngine.ts:734:  const joinPath = input?.joinJsonl || "H:/prism/Docustrata/.index/blueprint-program-join-full-v6.jsonl";

### User | 2026-05-14T20:17:04.842Z

[tool_result] /h/prism/.claude/commands/schedule.md
/h/prism/.claude/commands/shop-schedule.md
/h/prism/.claude/helpers/cron-registry-reconcile.mjs
/h/prism/.claude/helpers/golf-cron-lock.mjs
/h/prism/.claude/worktrees/brave-euclid/.claude/commands/shop-schedule.md
/h/prism/.claude/worktrees/brave-euclid/mcp-server/src/routes/schedule.ts
/h/prism/.claude/worktrees/brave-euclid/mcp-server/tests/r7/shop-scheduler
... [+1415 chars truncated]

### Assistant | 2026-05-14T20:17:07.555Z

Let me read the background task output and check the cron registry helper:

### Assistant | 2026-05-14T20:17:07.794Z

[tool_use: Read]

### Assistant | 2026-05-14T20:17:08.420Z

[tool_use: Read]

### Assistant | 2026-05-14T20:17:08.801Z

[tool_use: Bash]

### User | 2026-05-14T20:17:11.192Z

[tool_result] 1	/h/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/v3/@claude-flow/cli/dist/src/commands/swarm.d.ts
2	/h/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/v3/@claude-flow/cli/dist/src/mcp-tools/swarm-tools.d.ts
3	/h/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/v3/@claude-flow/shared/dist/types/swarm.types.d.ts
4	/h/prism/.cache/npm/_npx/65010bb6b8
... [+950 chars truncated]

### User | 2026-05-14T20:17:11.659Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * cron-registry-reconcile.mjs — CLEANUP-MS0 / U-CLEANUP-G8
4	 *
5	 * Drift watcher for the golf hygiene chat's daily cron schedule.
6	 *
7	 * The golf chat schedules 5 daily hygiene prompts via Claude's `CronCreate`
8	 * tool at session start. The canonical list — id, cron expression, prompt —
9	 * is checked into `state/shared/golf-cron-registry.json` (U-CLEANUP-E2 
... [+4207 chars truncated]

### User | 2026-05-14T20:17:14.736Z

[tool_result] /h/prism/scripts/register-revenue-roadmap-envelopes.mjs:      { id: "U-DOCU-03", title: "Join v5 — rejoin against the phase-15 deep-OCR PN list + the full 38,251-file JM-Die index → blueprint-program-join-full-v5.jsonl with final exact/loose/ambiguous counts" },
/h/prism/scripts/register-revenue-roadmap-envelopes.mjs:    brief: "U-DOCU-04 = persist blueprint-program-join-full-v5.jsonl + training-t
... [+1499 chars truncated]

### Assistant | 2026-05-14T20:17:46.628Z

Perfect! Now I have enough information to provide a comprehensive report. Let me compile my findings:

## Investigation Report: Auto-Ingest Mechanisms for BlueprintProgramJoinEngine Index

Based on a thorough examination of the PRISM codebase, here are my findings:

---

### 1. **SessionStart Hook Precedent & Risks**

**Current SessionStart Architecture:**
- **File**: `/h/.claude/projects/H--prism/settings.json` (lines 46-216)
- **Current state**: 32+ SessionStart hooks, INTENTIONALLY BUNDLED to prevent fork-storm
- **Critical precedent**: `/h/prism/.claude/hooks/bundles/sessionstart-bundle.mjs` (exists, T4 tier)

**The Bundle Pattern (Key Precedent):**
```javascript
// sessionstart-bundle.mjs — single SessionStart hook for ~19 non-critical context injectors
// Why: "SessionStart had ~32 hooks, each a fresh node.exe at session start (≈3-5 s 
// of cold-start fan-out before the session is usable)"
// Concurrency knob: PRISM_SESSIONSTART_BUNDLE_CONCURRENCY (default 6, 0 = unbounded)
// Critical hooks stay INDIVIDUAL: env guards, settings guards, git fetch, session-id-pin, etc.
```

**Harness Hang Prevention (Evidence):**
- Line in `/h/prism/CLAUDE.md`: `"fork-storm symptom under Windows hook load"` + xmalloc fork failure
- Commit ref: 2026-05-14 `build-tracker.mjs` fork-storm observation → fix: `node-process-janitor.mjs --full`
- The sessionstart-bundle limits concurrency to **6 parallel hooks by default** (configurable via `PRISM_SESSIONSTART_BUNDLE_CONCURRENCY`)

**Risk Assessment for 60MB JSONL Streaming:**
- **BLOCKING COST**: A 60MB file stream in a SessionStart hook = **500ms-2s** of sequential I/O
- **Risk Level**: **MEDIUM** — the bundling limits concurrency, but a single large-file operation still blocks the 6-worker pool for other context injectors
- **Precedent for heavy ops**: `tier1-context-pack.mjs` (3s timeout), `build-state-inject.mjs` (8s timeout), `session-handoff-load.mjs` (8s timeout) — these DO exist but are exceptions
- **Not ideal for 60MB**: Th
... [+6954 chars truncated]
