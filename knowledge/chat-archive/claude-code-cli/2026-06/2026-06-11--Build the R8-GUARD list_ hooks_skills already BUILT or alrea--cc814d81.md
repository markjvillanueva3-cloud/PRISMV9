---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Build the R8-GUARD list: hooks/skills already BUILT or already REJECTED, so a sy"
date: "2026-06-11"
first_ts: "2026-06-11T20:22:44.997Z"
last_ts: "2026-06-11T20:24:55.325Z"
cwd: "H:\\prism-slot-golf"
messages: 27
user_msgs: 12
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-a44b82c130161aa07.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Build the R8-GUARD list: hooks/skills already BUILT or already REJECTED, so a sy

> **claude-code-cli** | 2026-06-11 | 27 msgs (12 user / 15 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-a44b82c130161aa07.jsonl`

## Transcript

### User | 2026-06-11T20:22:44.997Z

Build the R8-GUARD list: hooks/skills already BUILT or already REJECTED, so a synthesis agent never re-proposes them. READ:
- H:/prism/state/shared/specs/GOAL-CROSSSURFACE-QUEUE-2026-06-09.md (the saturation finding: token-savings/offload hook frontier is SATURATED — 15+ read/offload hooks; route-suggest take-rate ~0.4%/10450 fires; bottleneck is advisory CONVERSION not coverage; the one novel lever was advisory-DECAY, owned by bravo)
- grep H:/prism/state/shared/specs for UNWIRED-HOOKS-AUDIT and read it (wired-silent vs unwired-on-disk hooks)
- enumerate currently-WIRED hooks: read C:/Users/wompu/.claude/settings.json hook sections (PreToolUse/PostToolUse/UserPromptSubmit/Stop/SessionStart) and list the .mjs names
- glob H:/prism/.claude/hooks/*.mjs for hooks-on-disk
Report CONCISE (<=450 words): (a) the list of already-built token/context/offload hooks (so we don't dup), (b) already-REJECTED ideas with the reason, (c) the advisory-conversion problem stated plainly with the 0.4%/10450 number, (d) which Stop hooks exist + their rough order (for stop-combo analysis). Your final message IS the digest.

### Assistant | 2026-06-11T20:22:51.901Z

I'll read the required files in parallel to build this digest efficiently.

### Assistant | 2026-06-11T20:22:52.339Z

[tool_use: Read]

### Assistant | 2026-06-11T20:22:53.261Z

[tool_use: Bash]

### Assistant | 2026-06-11T20:22:53.482Z

[tool_use: Glob]

### User | 2026-06-11T20:23:00.471Z

[tool_result] 1	# GOAL CROSS-SURFACE BUILD QUEUE -- 2026-06-09 (slot:alpha, fire 2)
2	
3	Evidence-grounded ranked queue from an operator-directed ultracode Workflow
4	(`wf_9437a375-523`, 5 agents, 888K tok: 4 parallel lenses -- Blackwell/local-LLM,
5	obsidian-vault-value, token-savings/context-retention, system-viz/PSN -- + 1
6	synthesis), fed LIVE in-transcript evidence so it refines (not re-derives) the
7	exi
... [+5429 chars truncated]

### User | 2026-06-11T20:23:03.050Z

[tool_result] H:/prism/.claude/hooks\wedm-tier6-geom-gate.mjs
H:/prism/.claude/hooks\agent-boundary-guard.mjs
H:/prism/.claude/hooks\agent-pid-tracker.mjs
H:/prism/.claude/hooks\agent-registry-load.mjs
H:/prism/.claude/hooks\agent-rules-inject.mjs
H:/prism/.claude/hooks\agent-util-log.mjs
H:/prism/.claude/hooks\agent-vs-direct.mjs
H:/prism/.claude/hooks\agent-worktree-stale-unlock.mjs
H:/prism/.claude/hooks\agi
... [+4739 chars truncated]

### User | 2026-06-11T20:23:14.689Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-11T20:23:17.165Z

Now let me get the unwired hooks audit and the settings.json hook wiring in parallel.

### Assistant | 2026-06-11T20:23:18.129Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:23:18.524Z

[tool_use: Read]

### User | 2026-06-11T20:23:20.192Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PRISM_FLEET_REAPER_DISABLE": "0",
5	    "PRISM_GOLF_GUARDIAN_DISABLE": "0",
6	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
7	    "OLLAMA_MODELS": "H:/Tools/
... [+12568 chars truncated]

### User | 2026-06-11T20:23:20.271Z

[tool_result] No files found

### Assistant | 2026-06-11T20:23:23.452Z

[tool_use: Read]

### Assistant | 2026-06-11T20:23:24.027Z

[tool_use: Glob]

### User | 2026-06-11T20:23:25.519Z

[tool_result] 300	            "timeout": 2000
301	          },
302	          {
303	            "type": "command",
304	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/tier1-context-pack.mjs",
305	            "timeout": 3000
306	          },
307	          {
308	            "type": "command",
309	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/output-
... [+15787 chars truncated]

### User | 2026-06-11T20:23:26.106Z

[tool_result] No files found

### Assistant | 2026-06-11T20:23:28.920Z

[tool_use: Read]

### Assistant | 2026-06-11T20:23:30.156Z

[tool_use: Bash]

### User | 2026-06-11T20:23:31.763Z

[tool_result] 700	          },
701	          {
702	            "type": "command",
703	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-obsidian-memory-extract.mjs",
704	            "timeout": 5000
705	          },
706	          {
707	            "type": "command",
708	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-auto-capture-per-slot.mj
... [+18215 chars truncated]

### User | 2026-06-11T20:23:39.958Z

[tool_result] 2026-05-09-U-DOCKER-HOOK-BROKER.html
2026-05-09-U-DOCKER-HOOK-BROKER.html.hash
2026-05-09-U-DOCKER-HOOK-BROKER.md
2026-05-09-U-FORGE-AUDIT-OMNISCIENT.html
2026-05-09-U-FORGE-AUDIT-OMNISCIENT.html.hash
2026-05-09-U-FORGE-AUDIT-OMNISCIENT.md
ACSERVER-BRIDGE-AUDIT-2026-05-20.html
ACSERVER-BRIDGE-AUDIT-2026-05-20.md
AI-SYNERGY-AUDIT.html
AI-SYNERGY-AUDIT.json
AI-SYNERGY-AUDIT.md
AUDIT-DEV-TOOLS-PIPELI
... [+349 chars truncated]

### Assistant | 2026-06-11T20:23:42.912Z

Now let me get the remaining PreToolUse/UserPromptSubmit/PostToolUse hooks and the token savings audit spec.

### Assistant | 2026-06-11T20:23:43.849Z

[tool_use: Read]

### Assistant | 2026-06-11T20:23:44.383Z

[tool_use: Read]

### User | 2026-06-11T20:23:47.043Z

[tool_result] 1199	            "type": "command",
1200	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/recall-first-advisory.mjs",
1201	            "timeout": 1500
1202	          },
1203	          {
1204	            "type": "command",
1205	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/grep-index-taken-correlator.mjs",
1206	            "timeout": 
... [+14002 chars truncated]

### User | 2026-06-11T20:23:47.241Z

[tool_result] 1	---
2	title: PRISM Token-Savings Audit — 2026-05-17 (lima)
3	date: 2026-05-17
4	slot: lima
5	chat: claude-77971357
6	scope: token-savings measures effectiveness across the 13-chat fleet
7	sources: /system-viz query, Obsidian memory vault, BUILD_STATE, hook-fire ledger, ollama-offload-stats, token-budget telemetry, rtk-archive, cache dir
8	meta-artifact: scripts/token-savings-rank.mjs (re-runnabl
... [+5664 chars truncated]

### Assistant | 2026-06-11T20:24:55.325Z

I have enough data now. Here is the R8-GUARD digest:

---

## R8-GUARD LIST — Token/Context/Offload Hooks (do NOT re-propose)

### (a) Already-BUILT token/context/offload hooks (wired in settings.json)

**PreToolUse:Read**
- `wiki-read-offload-advisory.mjs` — advises routing wiki reads >=500 lines to Obsidian/Ollama
- `large-read-digest-advisory.mjs` — advisory for large file reads
- `recall-first-advisory.mjs` — recall before re-read advisory
- `grep-index-taken-correlator.mjs` — correlates grep hits to index
- `read-bundle.mjs` — bundled read guards

**PreToolUse:Glob|Grep**
- `grep-index-first.mjs` — redirect Grep to master-index first (758 fires / 0 offloads — ZERO conversion, pure attention tax)
- `search-optimizer.mjs` — search optimization redirect
- `viz-first-redirect.mjs` — system-viz before raw search
- `glob-narrow-path.mjs` — path narrowing
- `pre-grep-graph-inject.mjs` — inject graph context before grep
- `pre-bash-graph-inject.mjs` — inject graph context before bash
- `pre-write-graph-inject.mjs` — inject graph context before write
- `pre-tool-savings-multi.mjs` — fired on Glob/Grep/Write/Bash

**PreToolUse:Bash**
- `nav-rerank-advisory.mjs` — navigation rerank suggestion
- `ollama-nav-enforce-inject.mjs` — surfaces local-LLM bridge on nav-intent (shipped 36105372ec)

**PreToolUse:mcp**
- `mcp-readonly-cache.mjs` — caches read-only MCP responses
- `ollama-route-pretooluse` (via routing table hook) — 2126 fires / 2 offloads (0.09% conversion — near-zero)

**UserPromptSubmit**
- `ollama-pipeline-injector.mjs` — injects Ollama phase routing on /forge-audit /rgs /scrutinize etc.
- `ollama-prewarm-on-pipeline.mjs` — detached warm-up on pipeline keywords
- `master-index-precheck-inject.mjs` — top-5 graph hits per prompt
- `memory-index-precheck-inject.mjs` — memory index hits
- `memory-rag-inject.mjs` — RAG from memory vault
- `token-awareness-sidecar.mjs` — token awareness tracking (also Stop)
- `token-awareness-inject.mjs` — token awareness injection
- `t
... [+8399 chars truncated]
