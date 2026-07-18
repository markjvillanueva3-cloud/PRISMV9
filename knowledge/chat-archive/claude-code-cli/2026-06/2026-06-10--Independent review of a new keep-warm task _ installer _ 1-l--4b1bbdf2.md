---
type: "chat-session"
source: "claude-code-cli"
session_id: "4b1bbdf2-c878-441d-93bc-88ca59603734"
title: "Independent review of a new keep-warm task + installer + 1-line lib complement. "
date: "2026-06-10"
first_ts: "2026-06-10T19:03:52.463Z"
last_ts: "2026-06-10T19:05:52.748Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-aff1a1fd39eae0ed9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent review of a new keep-warm task + installer + 1-line lib complement. 

> **claude-code-cli** | 2026-06-10 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-aff1a1fd39eae0ed9.jsonl`

## Transcript

### User | 2026-06-10T19:03:52.463Z

Independent review of a new keep-warm task + installer + 1-line lib complement. Read:
- H:/prism/scripts/ollama-embed-keepalive.mjs (new)
- H:/prism/scripts/ollama-embed-keepalive.test.mjs (tests)
- H:/prism/.claude/helpers/install-ollama-embed-keepalive-task.ps1 (the scheduled-task installer)
- the 1-line keep_alive addition in H:/prism/scripts/lib/memory-index-search-lib.mjs (embedQueryViaOllamaSync payload + the RECALL_EMBED_KEEP_ALIVE const)

Purpose: keep nomic-embed-text (the memory-recall embed model) resident so the Obsidian dense-recall arm never goes dark on a cold-evicted model. The recall path has a 2.5s embed cap that cannot reload a cold ~5s nomic; this task (user-level scheduled task, every 4 min) pins it with keep_alive=30m and a 20s timeout that absorbs the cold load.

Weight toward what a code-analyzer misses:
1. DEDUP / CONFLICT (R7/R8): does this duplicate or conflict with existing warmers? Relevant existing assets: scripts/fleet-reaper-sweep.mjs (pressure-driven prewarm of the OFFLOAD model, DEFAULT_OLLAMA_KEEP_ALIVE=30m), .claude/hooks/ollama-prewarm-on-pipeline.mjs (warms nomic ONLY on /dedup keyword), scripts/lib/ollama-coresidency.mjs (documents RECOMMENDED_ENV: nomic is one of the intended resident models, keepAliveFor("embed")="5m"). Confirm this task fills a genuine gap (continuous nomic warmth for the recall path, which none of those provide) and does not re-pin large models or fight the fleet memory-pressure policy (cebde4fd9: keep_alive must be 30m not -1; pinned models cost host commit).
2. INSTALLER CORRECTNESS: the .ps1 registers a USER-LEVEL task (no UAC, no SYSTEM principal) -- confirm. Resolves repo root + node from $PSScriptRoot (host-portable). -Uninstall removes cleanly. RepetitionInterval every N min via -Once trigger. Any flaw that would make the task fail to register or fail at runtime (wrong working dir, quoting of the script path)?
3. POLICY COMPLIANCE: does keeping a model resident every 4 min add meaningful host-commit 
... [+568 chars truncated]

### Assistant | 2026-06-10T19:03:58.349Z

I'll review the four artifacts independently. Let me start by reading all of them in parallel.

### Assistant | 2026-06-10T19:03:58.810Z

[tool_use: Read]

### Assistant | 2026-06-10T19:03:59.295Z

[tool_use: Read]

### Assistant | 2026-06-10T19:03:59.497Z

[tool_use: Read]

### User | 2026-06-10T19:04:00.376Z

[tool_result] read-once-guard: 'H:\prism\scripts\ollama-embed-keepalive.mjs' was already read 13s ago in this session and is unchanged (mtime 1781117811687). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T19:04:01.096Z

[tool_result] 1	// Tests for ollama-embed-keepalive.mjs pure core (R9: real behavior).
2	// Run: node --test scripts/ollama-embed-keepalive.test.mjs
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { isModelWarm, buildWarmBody, classifyAction } from "./ollama-embed-keepalive.mjs";
6	
7	// ----- isModelWarm -----
8	test("isModelWarm: exact name match in /api/ps body", () =>
... [+3096 chars truncated]

### User | 2026-06-10T19:04:01.349Z

[tool_result] 1	param(
2	  # Cadence (minutes). nomic-embed-text is pinned with keep_alive=30m, so a 4-min
3	  # tick keeps the 30m residency window always well ahead -- and re-warms within
4	  # <=4 min of any LRU eviction, so the latency-capped recall embed path almost
5	  # never finds the model cold.
6	  [int]$EveryMinutes = 4,
7	  [switch]$RunNow,
8	  [switch]$Uninstall
9	)
10	
11	# install-ollama-embed-ke
... [+2110 chars truncated]

### Assistant | 2026-06-10T19:04:08.376Z

I have the test file and installer. I already read the main keepalive script (per the read-once guard). Let me retrieve the lib addition and check for dedup against existing warmers.

### Assistant | 2026-06-10T19:04:10.205Z

[tool_use: Grep]

### Assistant | 2026-06-10T19:04:10.245Z

[tool_use: Read]

### User | 2026-06-10T19:04:11.948Z

[tool_result] read-once-guard: 'H:\prism\scripts\ollama-embed-keepalive.mjs' was already read 25s ago in this session and is unchanged (mtime 1781117811687). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T19:04:15.788Z

[tool_result] 391-// its OWN model warm (and recently-used, so it is not the LRU evict victim when the
392-// fleet crowds OLLAMA_MAX_LOADED_MODELS with big models). 30m matches the established
393-// fleet policy (commit cebde4fd9 -- never "-1", which pins large models forever and
394-// trips the host-commit memory-pressure gate). Complements scripts/ollama-embed-keepalive.mjs
395-// (the proactive 4-min cold
... [+3319 chars truncated]

### Assistant | 2026-06-10T19:04:24.050Z

The read-once guard is blocking re-read of the main script. The guard says its content is in my context, but I need to see the actual implementation to review it properly. Let me disable the cache for this one read since I genuinely need the source.

### Assistant | 2026-06-10T19:04:26.513Z

[tool_use: Bash]

### User | 2026-06-10T19:04:33.787Z

[tool_result] #!/usr/bin/env node
// ollama-embed-keepalive.mjs -- keep nomic-embed-text RESIDENT so the Obsidian
// memory-recall dense arm never goes dark on a cold-evicted embed model.
//
// THE PROBLEM (observed live 2026-06-10): the recall embed in
// scripts/lib/memory-index-search-lib.mjs has a hard ~2.5s cap (it runs inside the
// 5s UserPromptSubmit budget), but a COLD nomic-embed-text load is ~5s on t
... [+5091 chars truncated]

### Assistant | 2026-06-10T19:04:40.304Z

I now have all four artifacts. Let me verify the dedup claims against the existing warmers and the cebde4fd9 lesson, plus check the install-hermes-tasks.ps1 sibling pattern.

### Assistant | 2026-06-10T19:04:41.782Z

[tool_use: Bash]

### Assistant | 2026-06-10T19:04:44.119Z

[tool_use: Grep]

### User | 2026-06-10T19:05:11.916Z

[tool_result] param(
  # Cadence for the cron-prewarm task (every N minutes). The prewarm reads
  # Hermes cron/jobs.json and warms the next-due local model so a cron tick
  # never pays the cold-load stall. 10 min comfortably covers the default
  # 15-min lead window the script selects on.
  [int]$PrewarmEveryMinutes = 10,
  # GEPA weekly anchor -- stages a Hermes skill-optimization candidate from
  # cron tra
... [+3655 chars truncated]

### User | 2026-06-10T19:05:14.221Z

[tool_result] 266-\ the Blackwell loads a 32B in seconds, not 40s. Override: env
267-// PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE="-1" to restore pin-forever.
268-// See reference_ollama_keepalive_commit_leak_2026_06_08 + 05-soft-config-tweaks.ps1 (blackwell tier).
269:export const DEFAULT_OLLAMA_KEEP_ALIVE = "30m";
270-export const DEFAULT_HINT_TTL_SEC = 300;          // hint validity == one sweep interval
271-expo
... [+2761 chars truncated]

### Assistant | 2026-06-10T19:05:22.276Z

I now have everything I need to evaluate all five dimensions. Let me verify the `ollama-prewarm-on-pipeline.mjs` and coresidency claims for completeness on dedup.

### Assistant | 2026-06-10T19:05:24.468Z

[tool_use: Grep]

### Assistant | 2026-06-10T19:05:25.547Z

[tool_use: Grep]

### User | 2026-06-10T19:05:36.202Z

[tool_result] 4- * ollama-prewarm-on-pipeline.mjs — UserPromptSubmit hook
5- *
6: * When a pipeline trigger fires (/forge*, /rgs, /scrutinize, /dedup,
7- * /deep-search, /pdf-learn, /close-out-audit, /precompact) AND the
8- * required Ollama model is NOT yet warm in VRAM, fire a tiny
--
45-  "scrutinize": "qwen2.5-coder:32b",
46-  "scrutiny-3way": "qwen2.5-coder:32b",
47:  "dedup": "nomic-embed-text",
48-  "pre
... [+420 chars truncated]

### User | 2026-06-10T19:05:36.205Z

[tool_result] 5-\ + qwen2.5-coder:32b(~37GB @16K) co-reside warm (~50GB), but gpt-oss:120b(~65GB) CANNOT co-reside
6-\ with the 32b (verified live). So:
7://   - RECOMMENDED_ENV : the Ollama service env that keeps the everyday pair warm without KV thrash.
8://   - keepAliveFor()  : per-task keep_alive -- everyday classes stay warm "30m"; hard-reason (120b)
9-//                       is "0s" (load-answer-EVICT, 
... [+1188 chars truncated]

### Assistant | 2026-06-10T19:05:52.748Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
