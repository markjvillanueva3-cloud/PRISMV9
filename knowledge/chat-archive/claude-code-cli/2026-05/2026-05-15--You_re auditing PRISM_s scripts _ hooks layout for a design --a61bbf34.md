---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "You're auditing PRISM's scripts + hooks layout for a design pivot. The user want"
date: "2026-05-15"
first_ts: "2026-05-15T16:17:49.690Z"
last_ts: "2026-05-15T16:22:03.737Z"
cwd: "H:\\prism"
messages: 83
user_msgs: 32
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-aadbaabb8c93e1301.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# You're auditing PRISM's scripts + hooks layout for a design pivot. The user want

> **claude-code-cli** | 2026-05-15 | 83 msgs (32 user / 51 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-aadbaabb8c93e1301.jsonl`

## Transcript

### User | 2026-05-15T16:17:49.690Z

You're auditing PRISM's scripts + hooks layout for a design pivot. The user wants to identify HIGH-ROI ADDITIONS that refine "autonomous building capability" — a chat can pick a unit and ship it end-to-end with minimal operator intervention. Read-only research. Report under 800 words.

CONTEXT THE USER GAVE:
- /system-viz (port 8765, galaxy at state/shared/system-viz/) should be the visual + functional brain in Obsidian.
- Better auto-memory generation (wiki vault + Obsidian memory dir).
- Better hooks to inject memories + tribal knowledge + prism-awareness into chats.
- Better usage of: neural net, AI orchestration, deep learning, deep reasoning, RTK (token compression), Ollama (local qwen2.5-coder), Qdrant (vectors), precompact/compact/handoff for the 10-chat fleet.
- Use /forge-triple pattern (engine+skill+hook together).

WHAT TO MAP — be specific, name files:

1. **Hooks inventory** — list `H:/prism/.claude/hooks/*.mjs` + bundle children. Bucket by event:
   - SessionStart (~N) — what context auto-injects?
   - UserPromptSubmit (~N) — what auto-injects per prompt?
   - PreToolUse / PostToolUse — what guards fire?
   - Stop — what gates block?
   - PreCompact — what runs before compaction?
   For each bucket, list 5 representative hooks + their purpose.

2. **Settings.json wiring** — Read `C:/Users/wompu/.claude/settings.json` (mirrored to H:/.claude/settings.json). Count: hooks wired into each event group, knob env-vars surfaced. Anything that exists in .claude/hooks/*.mjs but is NOT in settings.json (orphaned hooks)?

3. **Scripts inventory** — `H:/prism/scripts/*.mjs` + `H:/prism/mcp-server/scripts/*.mjs`. Bucket by purpose:
   - Audit / regen (build-state-snapshot, build-milestone-progress, audit-*, regen-*)
   - Telemetry (hook-health-check, ollama-offload-dashboard, fleet-status)
   - Discovery (system-viz-query, master-index)
   - Cleanup / maintenance (close-out-milestone, mirror-c-to-h-audit)

4. **Dev-pipeline injection coverage** — which UserPromptSub
... [+1695 chars truncated]

### Assistant | 2026-05-15T16:17:52.736Z

I'll conduct a systematic read-only audit of PRISM's scripts and hooks layout to map the autonomous building capability landscape.

### Assistant | 2026-05-15T16:17:53.009Z

[tool_use: Bash]

### User | 2026-05-15T16:17:56.657Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found
/usr/bin/bash: line 1: Sort-Object: command not found

### Assistant | 2026-05-15T16:17:57.953Z

I'll pivot to Bash for file enumeration, then read the key files.

### Assistant | 2026-05-15T16:17:58.173Z

[tool_use: Bash]

### User | 2026-05-15T16:18:07.432Z

[tool_result] H:/.claude/hooks/ai-system-router-inject.mjs
H:/.claude/hooks/duplication-guard-stop.mjs
H:/.claude/hooks/plugin-path-fixer.mjs
H:/.claude/hooks/self-awareness-enforce.mjs
H:/.claude/hooks/wedm-tier6-geom-gate.mjs

### Assistant | 2026-05-15T16:18:08.763Z

Now let me check the scripts directories and read the settings.json files:

### Assistant | 2026-05-15T16:18:08.805Z

[tool_use: Bash]

### User | 2026-05-15T16:18:17.036Z

[tool_result] H:/prism/scripts/__tests__/build-awareness-health.test.mjs
H:/prism/scripts/__tests__/build-dispatcher-capacity.test.mjs
H:/prism/scripts/__tests__/build-system-viz-livediff.test.mjs
H:/prism/scripts/__tests__/build-wiring-domain-dict.test.mjs
H:/prism/scripts/__tests__/claude-md-byte-target.test.mjs
H:/prism/scripts/__tests__/claude-md-drift.test.mjs
H:/prism/scripts/__tests__/coord-db-sentinel.t
... [+14036 chars truncated]

### Assistant | 2026-05-15T16:18:18.532Z

Now let me read the settings.json files and the hook files to understand the wiring:

### Assistant | 2026-05-15T16:18:19.026Z

[tool_use: Read]

### Assistant | 2026-05-15T16:18:19.031Z

[tool_use: Read]

### Assistant | 2026-05-15T16:18:19.437Z

[tool_use: Read]

### Assistant | 2026-05-15T16:18:19.602Z

[tool_use: Read]

### User | 2026-05-15T16:18:21.104Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-15T16:18:23.861Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * AI System Router Injection Hook (PreToolUse)
4	 *
5	 * For certain tool calls (Agent spawn, Write engine files), inject AI routing guidance
6	 * to ensure the right system (Docker/Ollama/Claude) is used for the task.
7	 */
8	
9	import { readFileSync } from "fs";
10	
11	const input = JSON.parse(readFileSync(process.stdin.fd, "utf8"));
12	const toolName = input.tool_
... [+2105 chars truncated]

### User | 2026-05-15T16:18:24.296Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
5	    "OLLAMA_MODELS": "H:/Tools/ollama/models",
6	    "NIM_URL": "http://127.0.0.1:8000/v1",
7	    "NIM_EMBED_URL":
... [+34420 chars truncated]

### User | 2026-05-15T16:18:24.687Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Self-Awareness Enforcement Hook (UserPromptSubmit)
4	 *
5	 * HARD RULE: Any forge/rgs/autopilot command MUST load self-awareness first.
6	 * This hook injects a warning if the command is invoked without awareness context.
7	 */
8	
9	import { readFileSync, existsSync } from "fs";
10	
11	// Never crash on empty/malformed stdin — the harness treats a thrown
12	// exce
... [+1966 chars truncated]

### Assistant | 2026-05-15T16:18:27.498Z

Let me continue the audit by examining the hook files in the prism directory and analyzing the scripts:

### Assistant | 2026-05-15T16:18:27.592Z

[tool_use: Bash]

### User | 2026-05-15T16:18:42.407Z

[tool_result] 556

### Assistant | 2026-05-15T16:18:44.026Z

Now let me sample and categorize the hooks by reading some key ones and analyzing script patterns:

### Assistant | 2026-05-15T16:18:45.144Z

[tool_use: Bash]

### User | 2026-05-15T16:19:00.864Z

[tool_result] H:/prism/.claude/hooks/agent-boundary-guard.mjs
H:/prism/.claude/hooks/agent-pid-tracker.mjs
H:/prism/.claude/hooks/agent-registry-load.mjs
H:/prism/.claude/hooks/agent-rules-inject.mjs
H:/prism/.claude/hooks/agent-vs-direct.mjs
H:/prism/.claude/hooks/agent-worktree-stale-unlock.mjs
H:/prism/.claude/hooks/aggressive-killer-stop.mjs
H:/prism/.claude/hooks/agi-safety-envelope-guard.mjs
H:/prism/.cla
... [+564 chars truncated]

### Assistant | 2026-05-15T16:19:04.777Z

Let me analyze the scripts by category more systematically:

### Assistant | 2026-05-15T16:19:05.515Z

[tool_use: Bash]

### User | 2026-05-15T16:19:23.075Z

[tool_result] H:/prism/scripts/add-ollama-skill-policy-frontmatter.mjs
H:/prism/scripts/add-ollama-skill-policy-frontmatter.test.mjs
H:/prism/scripts/audit-close-out-candidates.mjs
H:/prism/scripts/audit-cross-file-hooks.mjs
H:/prism/scripts/audit-edit-hooks.mjs
H:/prism/scripts/audit-hook-duplicates.mjs
H:/prism/scripts/audit-hook-paths.mjs
H:/prism/scripts/audit-roadmap-drift.mjs
H:/prism/scripts/audit-roadma
... [+2473 chars truncated]

### Assistant | 2026-05-15T16:19:24.702Z

Let me read key hook samples to understand injection patterns and look for gaps:

### Assistant | 2026-05-15T16:19:25.326Z

[tool_use: Read]

### Assistant | 2026-05-15T16:19:25.708Z

[tool_use: Read]

### Assistant | 2026-05-15T16:19:25.998Z

[tool_use: Read]

### Assistant | 2026-05-15T16:19:26.003Z

[tool_use: Read]

### User | 2026-05-15T16:19:32.307Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+2320 chars truncated]

### User | 2026-05-15T16:19:33.452Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * awareness-snapshot-inject.mjs — SessionStart injector
5	 *
6	 * OBSIDIAN-PRISM-OS-MS0/U-AWARENESS-INJECT.
7	 *
8	 * Reads state/shared/AWARENESS-SNAPSHOT.md (generated by
9	 * scripts/awareness-snapshot.mjs — companion to /awareness-snapshot
10	 * skill) and emits a compact ~10-line digest as SessionStart
11	 * additionalContext so every fresh chat kn
... [+1800 chars truncated]

### User | 2026-05-15T16:19:35.796Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * skill-auto-trigger.mjs — UserPromptSubmit hook (Phase D.2 of DEV-VELOCITY-AUTOTRIGGER-MS0).
5	 *
6	 * Reads `knowledge/wiki/architecture/_skill-triggers.jsonl` (the stage-22 extract
7	 * of every skill's `triggers:` frontmatter — see Phase D.3). For each UserPromptSubmit
8	 * event, scores the prompt against every trigger and emits top-K suggestions a
... [+2774 chars truncated]

### User | 2026-05-15T16:19:36.357Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-auto-router.mjs — UserPromptSubmit hook
5	 *
6	 * AUTOMATIC Ollama routing — no manual /commands needed.
7	 * Detects task type from prompt and routes appropriate work to Ollama,
8	 * injecting results as context so Claude doesn't duplicate effort.
9	 *
10	 * Routes:
11	 * - Summarization requests → Ollama summarize
12	 * - Explanation requests
... [+2685 chars truncated]

### Assistant | 2026-05-15T16:19:46.572Z

Let me update task #7 to in_progress and then systematically complete the audit by analyzing the key injection points and gaps:

### Assistant | 2026-05-15T16:19:47.261Z

[tool_use: TaskUpdate]

### Assistant | 2026-05-15T16:19:48.228Z

[tool_use: Bash]

### system

... [3 middle messages omitted -- see raw_file] ...

### User | 2026-05-15T16:20:01.681Z

[tool_result] H:/prism/.claude/hooks/cog-bridge-ai-memory-capture.mjs
H:/prism/.claude/hooks/error-pattern-memory.mjs
H:/prism/.claude/hooks/error-recovery-memory.mjs
H:/prism/.claude/hooks/extraction-to-tribal.mjs
H:/prism/.claude/hooks/lib/enforce-memory-pipeline.py
H:/prism/.claude/hooks/memory-mirror-to-vault.mjs
H:/prism/.claude/hooks/memory-rag-inject.mjs
H:/prism/.claude/hooks/memory-relevance-inject.mjs
... [+385 chars truncated]

### User | 2026-05-15T16:20:01.689Z

[tool_result] embedder-inject-qdrant.mjs
enforce-handoff-topic.mjs
recall-counter-track.mjs
session-handoff-load.mjs
stop_on_stale_handoff.mjs
wiki-recall-on-read.mjs

### User | 2026-05-15T16:20:02.833Z

[tool_result] H:/prism/.claude/hooks/ai-auto-command-router.mjs:  { patterns: [/tribal|shop.*knowledge|operator.*experience|floor.*wisdom/i], cmd: "/shop-knowledge", priority: 0 },
H:/prism/.claude/hooks/ai-command-awareness.mjs:        purpose: "AI-powered PDF knowledge extraction into tribal tips/formulas (USE THIS!)",
H:/prism/.claude/hooks/ai-command-awareness.mjs:        purpose: "Extract and categorize sh
... [+287 chars truncated]

### Assistant | 2026-05-15T16:20:04.356Z

Now let me sample more key injection hooks and count orphaned hooks:

### Assistant | 2026-05-15T16:20:05.956Z

[tool_use: Bash]

### User | 2026-05-15T16:20:15.344Z

[tool_result] comm: file 1 is not in sorted order
comm: input is not in sorted order
447

### Assistant | 2026-05-15T16:20:17.027Z

Let me recount more carefully:

### Assistant | 2026-05-15T16:20:17.873Z

[tool_use: Bash]

### User | 2026-05-15T16:20:28.566Z

[tool_result] Total hooks on disk:
556
5
Wired in settings.json:
3

### Assistant | 2026-05-15T16:20:30.324Z

Let me count wired hooks more carefully from settings.json:

### Assistant | 2026-05-15T16:20:30.350Z

[tool_use: Bash]

### User | 2026-05-15T16:20:39.185Z

[tool_result] 109

### Assistant | 2026-05-15T16:20:41.506Z

Now let me read a few more key hooks to understand injection patterns and identify gaps:

### Assistant | 2026-05-15T16:20:41.735Z

[tool_use: Read]

### Assistant | 2026-05-15T16:20:41.937Z

[tool_use: Read]

### Assistant | 2026-05-15T16:20:42.197Z

[tool_use: Read]

### User | 2026-05-15T16:20:48.491Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * memory-relevance-inject.mjs — PreToolUse hook for Edit/Write/MultiEdit.
5	 *
6	 * Before the user edits a file, scan their auto-memory directory for
7	 * any feedback memo that mentions the file path, basename, or symbol
8	 * derived from it. Inject the top-3 matches as PreToolUse context.
9	 *
10	 * Goal: "no repeated mistakes." If past feedback says
... [+1559 chars truncated]

### User | 2026-05-15T16:20:51.285Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+2704 chars truncated]

### User | 2026-05-15T16:20:51.326Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * embedder-inject-qdrant.mjs — SessionStart smoke test for Qdrant embedder
5	 *
6	 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01.
7	 *
8	 * QdrantMemoryEngineSingleton lazy-injects an Ollama embedder on first use,
9	 * so this hook does NOT need to call setEmbedder() directly across process
10	 * boundaries (the singleton lives in the MCP server's process). Instea
... [+1680 chars truncated]

### Assistant | 2026-05-15T16:20:55.442Z

Let me quickly count the hooks by event type and identify final gaps:

### Assistant | 2026-05-15T16:20:56.274Z

[tool_use: Bash]

### User | 2026-05-15T16:21:04.235Z

[tool_result] === HOOKS WIRED BY EVENT ===
SessionStart:
56
UserPromptSubmit:
20
PreToolUse:
38
PostToolUse:
12
PreCompact:
18
Stop:
61

### Assistant | 2026-05-15T16:21:06.618Z

Now let me search for high-ROI gaps by looking for missing patterns:

### Assistant | 2026-05-15T16:21:07.376Z

[tool_use: Bash]

### User | 2026-05-15T16:21:10.399Z

[tool_result] auto-learn-budget-guard.mjs
code-completeness-gate.mjs
commit-ownership-guard.mjs
error-learner-hook.mjs
error-pattern-learner.mjs
file-ownership-tracker.mjs
goal-complete-gate.mjs
meta-learning-trigger.mjs
reasoning-completeness.mjs
session-consolidate-graph.mjs

### Assistant | 2026-05-15T16:21:11.956Z

Let me check for the specific high-ROI gaps mentioned in the audit scope:

### Assistant | 2026-05-15T16:21:13.399Z

[tool_use: Bash]

### User | 2026-05-15T16:21:19.190Z

[tool_result] H:/prism/.claude/hooks/ai-auto-command-router.mjs
H:/prism/.claude/hooks/ai-reasoning-inject.mjs
H:/prism/.claude/hooks/memory-rag-inject.mjs
stop-system-viz-reminder.mjs
system-viz-live-bridge.mjs
embedder-inject-qdrant.mjs
recall-counter-track.mjs
wiki-recall-on-read.mjs
cross-chat-directive-detector.mjs
enforce-handoff-topic.mjs
fleet-reaper-stop.mjs
session-handoff-load.mjs
stop_on_stale_hando
... [+6 chars truncated]

### Assistant | 2026-05-15T16:21:20.774Z

Let me quickly check for the 10-chat vs 6-chat hardcoding and finalize the audit:

### Assistant | 2026-05-15T16:21:21.612Z

[tool_use: Bash]

### User | 2026-05-15T16:21:26.072Z

[tool_result] H:/prism/.claude/hooks/agent-pid-tracker.mjs:            const month = parseInt(dateStr.substring(4, 6)) - 1;
H:/prism/.claude/hooks/agent-pid-tracker.mjs:            const day = parseInt(dateStr.substring(6, 8));
H:/prism/.claude/hooks/agent-pid-tracker.mjs:            const hour = parseInt(dateStr.substring(8, 10));
H:/prism/.claude/hooks/agent-pid-tracker.mjs:            const min = parseInt(da
... [+531 chars truncated]

### Assistant | 2026-05-15T16:21:28.026Z

Let me finalize by reading the last critical piece — check what's NOT auto-injected on UserPromptSubmit:

### Assistant | 2026-05-15T16:21:28.213Z

[tool_use: Read]

### User | 2026-05-15T16:21:29.633Z

[tool_result] 644	    "UserPromptSubmit": [
645	      {
646	        "matcher": "",
647	        "hooks": [
648	          {
649	            "type": "command",
650	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-auto-router.mjs",
651	            "timeout": 5000
652	          },
653	          {
654	            "type": "command",
655	            "command": "\"H:/.claude/bin/por
... [+4025 chars truncated]

### Assistant | 2026-05-15T16:21:31.613Z

Let me now synthesize the complete findings and mark the audit complete:

### Assistant | 2026-05-15T16:21:31.830Z

[tool_use: TaskUpdate]

### Assistant | 2026-05-15T16:21:31.945Z

[tool_use: TaskUpdate]

### User | 2026-05-15T16:21:33.133Z

[tool_result] Updated task #7 status

### User | 2026-05-15T16:21:33.230Z

[tool_result] Updated task #8 status

### Assistant | 2026-05-15T16:22:03.737Z

## PRISM Hooks + Scripts Audit Report
### Autonomous Building Capability Design Pivot

---

## Hooks Inventory (109 wired + 447 orphan on disk)

| Event | Wired | Purpose | Top Representatives |
|-------|-------|---------|---------------------|
| **SessionStart** | 56 | Context bootstrap, git sync, awareness inject, role setup | session-id-pin, git-health-guard, awareness-snapshot-inject, build-state-inject, cognitive-budget-allocator |
| **UserPromptSubmit** | 20 | Pre-reasoning injection, skill routing, memory relevance, Ollama offload | ollama-auto-router, skill-auto-trigger, master-index-precheck-inject, memory-relevance-inject, ollama-task-offloader |
| **PreToolUse** | 38 | Tool-specific guards & routers (bash, edit, glob, mcp) | bash-bundle, edit-bundle, read-bundle, search-optimizer, grep-index-first |
| **PostToolUse** | 12 | Result capture, cache invalidation, cross-session orchestration | posttool-edit-bundle, posttool-bash-read-bundle, recall-counter-track, mirror-c-to-h |
| **PreCompact** | 7 | Handoff state, compression signaling, quality gates | precompact-handoff, compression-precompact, quality-dashboard-alert |
| **Stop** | 61 | Gates (build errors, unwired assets, tests, gcode safety), cleanup, sync | stop_on_failing_tests, stop_on_build_error, git-sync-stop, fleet-reaper-stop, session-consolidate-graph |

---

## Scripts Inventory (561 total)

| Category | Count | Top Examples | Purpose |
|----------|-------|--------------|---------|
| **Audit/Regen** | ~85 | audit-hook-duplicates, audit-unwired-engines, build-state-snapshot, build-milestone-progress, regen-viz | Detect drift, rebuild state machines, verify integrity |
| **Telemetry** | ~20 | hook-health-check, ollama-offload-dashboard, fleet-status, skill-utilization-scan, digest-hook-latency | Observability on hook fire counts, Ollama usage, fleet capacity |
| **Discovery** | ~45 | generate-master-index, system-viz-query, build-wiki-embeddings, generate-system-viz, generate-engine-graph | Cross
... [+5911 chars truncated]
