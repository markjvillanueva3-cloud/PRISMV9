---
type: "chat-session"
source: "claude-code-cli"
session_id: "00175b01-57de-45eb-953e-d6b540d69477"
title: "You are finding DORMANT feature flags — high-ROI PRISM features sitting behind a"
date: "2026-06-03"
first_ts: "2026-06-03T17:54:26.038Z"
last_ts: "2026-06-03T17:55:57.274Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 14
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/00175b01-57de-45eb-953e-d6b540d69477/subagents/workflows/wf_b5b2319b-0cb/agent-ac01c6dfbb6fa3cfc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:02"
---

# You are finding DORMANT feature flags — high-ROI PRISM features sitting behind a

> **claude-code-cli** | 2026-06-03 | 32 msgs (14 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/00175b01-57de-45eb-953e-d6b540d69477/subagents/workflows/wf_b5b2319b-0cb/agent-ac01c6dfbb6fa3cfc.jsonl`

## Transcript

### User | 2026-06-03T17:54:26.038Z

You are finding DORMANT feature flags — high-ROI PRISM features sitting behind an OFF env flag. Repo root: H:/prism.

Investigate (read-only):
1. Grep settings.json (H:/.claude/settings.json and C:/Users/wompu/.claude/settings.json) and .claude/hooks/*.mjs and scripts/*.mjs for env flags of the form PRISM_*_ENABLE / PRISM_*_DISABLE / *_LIVE / *_MIRROR_ENABLE / AUTOSTART.
2. Identify flags that gate a real feature and are currently in their DORMANT state. Known suspects to verify:
   - PRISM_OBSIDIAN_LIVE (fetchLiveBrain -> slot context; default OFF)
   - GALAXY_INDEX_MIRROR_ENABLE (galaxy MEMORY -> Obsidian mirror)
   - PRISM_WEEKLY_SYNTHESIS_OCTOPUS (octopus ledger -> weekly synthesis)
   - PRISM_LOCAL_COMPUTE_AUTOSTART (=0 per SessionStart — docker/ollama autostart disabled)
   - PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY (intentionally OFF for security — do NOT recommend flipping)
   - any leg-coverage / PSN dial, any nn-graph PRISM_NNG_* (india owns — flag but defer)
3. For each dormant flag: what does ON unlock, what's the risk of flipping it (especially multi-chat / security / token-cost), and is it safe to flip now given the work order (more VRAM, building backend, synergizing).

Return PLAIN TEXT: a ranked list of flags to FLIP ON now (high benefit, low risk) vs FLIP-WITH-CARE vs LEAVE-OFF (with reason). For each give the exact flag name, where it's read, and the one-line effect. Be conservative on anything touching security or peer-chat safety.

### Assistant | 2026-06-03T17:54:37.849Z

I'll systematically search for dormant PRISM feature flags and assess the risk/benefit of activating them.

### Assistant | 2026-06-03T17:54:38.136Z

[tool_use: Read]

### Assistant | 2026-06-03T17:54:38.285Z

[tool_use: Read]

### Assistant | 2026-06-03T17:54:38.529Z

[tool_use: Glob]

### Assistant | 2026-06-03T17:54:38.581Z

[tool_use: Glob]

### User | 2026-06-03T17:54:49.579Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1462 of 1745 total (25356 tokens, cap 25000). Call Read with offset=1463 limit=1462 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claud
... [+57977 chars truncated]

### User | 2026-06-03T17:54:50.461Z

[tool_result] .claude\hooks\agent-boundary-guard.mjs
.claude\hooks\agent-pid-tracker.mjs
.claude\hooks\agent-registry-load.mjs
.claude\hooks\agent-rules-inject.mjs
.claude\hooks\agent-util-log.mjs
.claude\hooks\agent-vs-direct.mjs
.claude\hooks\agent-worktree-stale-unlock.mjs
.claude\hooks\aggressive-killer-stop.mjs
.claude\hooks\agi-safety-envelope-guard.mjs
.claude\hooks\ai-auto-command-router.mjs
.claude\hoo
... [+3854 chars truncated]

### User | 2026-06-03T17:54:50.699Z

[tool_result] scripts\materials_rebuild\generate.mjs
scripts\convert_to_ts.mjs
scripts\fix_imports.mjs
scripts\_archive\materials-legacy\fix_and_build.mjs
scripts\_archive\materials-legacy\fix_buffer_zones.mjs
scripts\extract-machines.mjs
scripts\gap-analysis.mjs
scripts\regen-code-index.mjs
scripts\extract-core-machines.mjs
scripts\index\build-shared-index-surfaces.mjs
scripts\_archive\audit\build-hook-skill-c
... [+3636 chars truncated]

### User | 2026-06-03T17:54:50.722Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1462 of 1745 total (25356 tokens, cap 25000). Call Read with offset=1463 limit=1462 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claud
... [+57977 chars truncated]

### Assistant | 2026-06-03T17:54:56.144Z

I'll search more efficiently for PRISM_*_ENABLE / PRISM_*_DISABLE / AUTOSTART flags in the hook files.

### Assistant | 2026-06-03T17:54:57.346Z

[tool_use: Grep]

### Assistant | 2026-06-03T17:54:57.348Z

[tool_use: Grep]

### User | 2026-06-03T17:55:05.386Z

[tool_result] Found 316 files
.claude\hooks\psn-leg-state-inject.mjs
.claude\hooks\pre-write-graph-inject.mjs
.claude\hooks\pre-grep-graph-inject.mjs
.claude\hooks\pre-bash-graph-inject.mjs
.claude\hooks\nn-graph-health-inject.mjs
.claude\hooks\master-index-precheck-inject.mjs
.claude\hooks\stop-psn-savings-aggregate.mjs
.claude\hooks\cag-cold-cache-anchor.mjs
.claude\hooks\slot-brief-inject.mjs
.claude\hooks\v
... [+13210 chars truncated]

### User | 2026-06-03T17:55:05.859Z

[tool_result] <persisted-output>
Output too large (23KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\00175b01-57de-45eb-953e-d6b540d69477\tool-results\toolu_01PYqGqNmXxpx88JxHbxgrrH.txt

Preview (first 2KB):
Found 525 files
.claude\hooks\psn-leg-state-inject.test.mjs
.claude\hooks\psn-leg-state-inject.mjs
.claude\hooks\pre-write-graph-inject.mjs
.claude\hooks\pre-grep-graph-inject.mjs
.claud
... [+1832 chars truncated]

### Assistant | 2026-06-03T17:55:10.445Z

Let me search more specifically for the dormant flags in settings and hooks.

### Assistant | 2026-06-03T17:55:11.485Z

[tool_use: Grep]

### Assistant | 2026-06-03T17:55:12.375Z

[tool_use: Grep]

### Assistant | 2026-06-03T17:55:12.588Z

[tool_use: Read]

### User | 2026-06-03T17:55:18.983Z

[tool_result] Found 2 files
.claude\hooks\slot-context-bundle-inject.mjs
.claude\hooks\local-compute-intent.mjs

### User | 2026-06-03T17:55:19.331Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
5	    "OLLAMA_MODELS": "H:/Tools/ollama/models",
6	    "PRISM_OBSIDIAN_API_KEY": "17618a35131fb454a54c89853ccc75ee61
... [+2214 chars truncated]

### User | 2026-06-03T17:55:19.429Z

[tool_result] Found 11 files
scripts\lib\octopus-weekly-synthesis-loader.rollup.test.mjs
scripts\lib\octopus-weekly-synthesis-loader.mjs
scripts\lib\octopus-corpus-loader.test.mjs
scripts\lib\octopus-corpus-loader.mjs
scripts\obsidian-memory-sync.mjs
scripts\lib\octopus-live-brain.test.mjs
scripts\lib\octopus-live-brain.mjs
scripts\lib\slot-context-livebrain-integration.test.mjs
scripts\zulu-telegram-bridge.mjs
... [+76 chars truncated]

### Assistant | 2026-06-03T17:55:24.369Z

Now let me read the key hook files to understand what these flags control:

### Assistant | 2026-06-03T17:55:24.728Z

[tool_use: Read]

### Assistant | 2026-06-03T17:55:25.497Z

[tool_use: Read]

### Assistant | 2026-06-03T17:55:25.500Z

[tool_use: Read]

### Assistant | 2026-06-03T17:55:26.224Z

[tool_use: Read]

### User | 2026-06-03T17:55:28.528Z

[tool_result] 1	// tier: T4
2	/**
3	 * local-compute-intent.mjs — UserPromptSubmit hook
4	 * RE-ENABLED: 2026-04-26 (LOCAL-LLM-MS0 U-LLMH02)
5	 *
6	 * Detects prompts that would benefit from the local compute stack
7	 * (Ollama for local LLM inference / embeddings, Docker for service
8	 * containers like Qdrant / postgres / prometheus).
9	 *
10	 * When intent is detected and the relevant stack is not already ru
... [+17069 chars truncated]

### User | 2026-06-03T17:55:30.168Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// ZULU-OMNISCIENT-MS0/U-ZO-MS0-FLEET-PRECHECK — per-slot context-bundle precheck.
4	//
5	// UserPromptSubmit hook. For the slot bound to this chat, calls loadSlotContext
6	// from scripts/lib/zulu-context-bundle.mjs and injects a COMPACT summary of
7	// the slot's MS0 read-side state (soul refuse_list / loop running / token zone
8	// / bridge units available 
... [+14022 chars truncated]

### User | 2026-06-03T17:55:30.477Z

[tool_result] 1	// scripts/lib/octopus-weekly-synthesis-loader.mjs
2	//
3	// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P5 — U-FLEET-P5-WEEKLY-SYNTHESIS-OCTOPUS-LOADER.
4	//
5	// Feeds the octopus multi-LLM consensus ledger (state/shared/octopus-runs.jsonl)
6	// into the long-horizon reflective memory produced by the WeeklySynthesisEngine
7	// (mcp-server/src/engines/WeeklySynthesisEngine.ts). The engine synthesizes a
8	/
... [+18278 chars truncated]

### User | 2026-06-03T17:55:32.244Z

[tool_result] 1	// scripts/lib/octopus-live-brain.mjs
2	//
3	// PSN-OCTOPUS-FLEET-SYNERGY-MS0 Wave 2 / U-FLEET-P2-LIVEBRAIN-SLOTCTX —
4	// LIVE-brain fetch for the per-slot context bundle hook.
5	//
6	// The .mjs slot-context-bundle-inject hook cannot import the TS engine
7	// (zuluAwarenessReader.ts:262 liveBrainContext()), so this lib reproduces the
8	// intended retrieval over the WIRED MCP action prism_sess
... [+10980 chars truncated]

### Assistant | 2026-06-03T17:55:57.274Z

Based on my investigation, here are the dormant PRISM feature flags ranked by activation ROI:

---

## DORMANT FLAGS — RANKED ACTIVATION ANALYSIS

### FLIP ON NOW (High Benefit, Low Risk)

**1. PRISM_OBSIDIAN_LIVE = "1"**
- **Where read**: `H:/prism/.claude/hooks/slot-context-bundle-inject.mjs` (line 230)
- **What unlocks**: Live Obsidian vault snippet injection into per-slot context bundle. When enabled, each UserPromptSubmit reads operator's open vault via :3100 MCP bridge (prism_session:obsidian_search), fetches top-5 relevant files, caches 30s TTL. Operator always sees their own current notes in the slot context.
- **Current state**: OFF (default)
- **Risk**: Minimal. Hard 1.5s timeout + fail-soft to null + short TTL cache. Bridge down = zero behavior change. Requires :3100 bridge running + Obsidian API key configured (already set: PRISM_OBSIDIAN_API_KEY present).
- **Token cost**: Negligible (5 small filenames + scores cached per 30s window)
- **Synergy**: Boosts context freshness for all 7 slot galaxies immediately without touching their code.
- **Recommendation**: **FLIP ON immediately** — zero infrastructure cost, pure signal gain.

---

**2. PRISM_LOCAL_COMPUTE_AUTOSTART = "1" (currently hardcoded default)**
- **Where read**: `H:/prism/.claude/hooks/local-compute-intent.mjs` (line 45)
- **What unlocks**: Detects prompts with embeddings/inference/batch intent (ollama, qdrant, docker keywords), auto-spawns docker-compose stack in background without blocking. Intent triggers: "embeddings", "local inference", "batch jobs", "lora", infrastructure keywords.
- **Current state**: ON (default, line 45: `AUTO_START_ENABLED = process.env.PRISM_LOCAL_COMPUTE_AUTOSTART !== "0"`)
- **Risk**: Already enabled. Could add a DISABLE knob if you want tighter control: set `PRISM_LOCAL_COMPUTE_AUTOSTART=0` to turn off.
- **Token cost**: Minimal (silent mode logs intent but suppresses weak-signal injection)
- **Synergy**: Already active — backs embeddings/Ollama workflows, no act
... [+3316 chars truncated]
