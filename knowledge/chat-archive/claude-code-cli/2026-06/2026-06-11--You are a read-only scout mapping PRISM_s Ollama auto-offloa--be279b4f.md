---
type: "chat-session"
source: "claude-code-cli"
session_id: "be279b4f-04df-4b74-aca2-548840cc346d"
title: "You are a read-only scout mapping PRISM's Ollama auto-offload system at H:/prism"
date: "2026-06-11"
first_ts: "2026-06-11T00:18:09.810Z"
last_ts: "2026-06-11T00:20:54.459Z"
cwd: "H:\\prism"
messages: 53
user_msgs: 23
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/be279b4f-04df-4b74-aca2-548840cc346d/subagents/workflows/wf_e0b2ef38-5f6/agent-aac572b244c060953.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# You are a read-only scout mapping PRISM's Ollama auto-offload system at H:/prism

> **claude-code-cli** | 2026-06-11 | 53 msgs (23 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/be279b4f-04df-4b74-aca2-548840cc346d/subagents/workflows/wf_e0b2ef38-5f6/agent-aac572b244c060953.jsonl`

## Transcript

### User | 2026-06-11T00:18:09.810Z

You are a read-only scout mapping PRISM's Ollama auto-offload system at H:/prism. GOAL: explain end-to-end HOW work gets automatically routed to local Ollama instead of Claude today, the MODEL-selection logic, and WHY the live offload rate is only ~9% (target >=30%). Use Glob/Grep to find exact paths -- do not assume.

Investigate:
- The Ollama bridge engine: grep 'OllamaHookBridgeEngine' under mcp-server/src/engines/
- scripts/ask-ollama.mjs ; .claude/hooks/ollama-prism-bridge.mjs ; .claude/hooks/ollama-pipeline-injector.mjs ; .claude/hooks/ollama-prewarm-on-pipeline.mjs
- scripts/ollama-offload-dashboard.mjs and mcp-server/data/state/ollama-offload-stats.json (READ the live stats - what is offloaded vs kept)
- the 'claudemd-ollama-enforcer' hook (grep .claude/hooks)
- memories: knowledge/memories/reference/reference_ollama_route_auto_enabled_2026_06_10.md and reference_ollama_roster_fitness_audit_2026_06_09.md and reference_ollama_vision_single_source_2026_06_09.md
- the /ollama-* skills (.claude/commands/ollama-*.md) and the aiSystemRouterEngine (grep)

REPORT (plain text, numbered sections):
1. ROUTING DECISION - what triggers an offload? hook vs engine call vs skill vs manual? automatic or opt-in per task?
2. MODEL SELECTION - how is the Ollama model chosen (qwen2.5-coder:32b vs 1.5b vs gpt-oss:120b vs gpt-oss:20b)? Is there a task-class->model map, or one hardcoded default?
3. OFFLOADED vs NOT - which task categories route to Ollama today and which obvious ones do NOT but could (the 9%->30% gap). Cite the live stats.
4. GAPS/DEFECTS - concrete weaknesses (silent fallback when :11434 down, missing model-selection, unwired hooks, stale model tags).
5. KEY FILES - file:line list of the load-bearing code for the build phase.

### Assistant | 2026-06-11T00:18:14.029Z

I'll map PRISM's Ollama auto-offload system. Let me start by locating the load-bearing files in parallel.

### Assistant | 2026-06-11T00:18:14.982Z

[tool_use: Grep]

### Assistant | 2026-06-11T00:18:15.463Z

[tool_use: Glob]

### Assistant | 2026-06-11T00:18:16.440Z

[tool_use: Glob]

### Assistant | 2026-06-11T00:18:16.444Z

[tool_use: Glob]

### Assistant | 2026-06-11T00:18:16.860Z

[tool_use: Glob]

### Assistant | 2026-06-11T00:18:17.849Z

[tool_use: Glob]

### Assistant | 2026-06-11T00:18:18.644Z

[tool_use: Grep]

### Assistant | 2026-06-11T00:18:18.645Z

[tool_use: Glob]

### User | 2026-06-11T00:18:21.248Z

[tool_result] Found 3 files
mcp-server\src\engines\OllamaHookBridgeEngine.ts
mcp-server\src\engines\OllamaContextFloorEngine.ts
mcp-server\src\engines\OllamaCAMIntegrationEngine.ts

### User | 2026-06-11T00:18:25.542Z

[tool_result] Found 7 files
.claude\hooks\claudemd-ollama-enforcer.mjs
.claude\settings.json
.claude\hooks\HOOK_DIGEST.md
.claude\settings.json.backup-20260427-193355
.claude\settings.json.bak-pre-watchdog-1777300774
.claude\settings.json.bak-flip-correctness-1777297006
.claude\settings.json.bak-pre-precompact-wire-1777295929

### User | 2026-06-11T00:18:39.690Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-11T00:18:41.300Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-11T00:18:41.301Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-11T00:18:41.437Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-11T00:18:42.882Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-11T00:18:43.117Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-11T00:18:45.454Z

Glob timed out from repo root. Let me use targeted paths since I already have most exact paths from the grep results.

### Assistant | 2026-06-11T00:18:47.033Z

[tool_use: Bash]

### User | 2026-06-11T00:18:57.375Z

[tool_result] -rw-r--r-- 1 wompu 197611 144143 Jun 10 19:18 mcp-server/data/state/ollama-offload-stats.json
-rwxr-xr-x 1 wompu 197611  43625 Jun 10 14:45 scripts/ask-ollama.mjs*
-rwxr-xr-x 1 wompu 197611  16701 Jun 10 12:40 scripts/ollama-offload-dashboard.mjs*
---HOOKS---
.claude/hooks/ollama-auto-router.mjs*
.claude/hooks/ollama-autostart.mjs*
.claude/hooks/ollama-context-aggregator.mjs*
.claude/hooks/ollama-
... [+1210 chars truncated]

### Assistant | 2026-06-11T00:18:59.741Z

Many more Ollama hooks than the prompt named. Let me read the live stats first (the key evidence) and the core routing files in parallel.

### Assistant | 2026-06-11T00:19:00.748Z

[tool_use: Read]

### Assistant | 2026-06-11T00:19:00.901Z

[tool_use: Read]

### User | 2026-06-11T00:19:05.166Z

[tool_result] 1	{
2	  "schemaVersion": "2.0.0",
3	  "offloaded": 62,
4	  "keptOnClaude": 603,
5	  "estimatedTokensSaved": 65143,
6	  "silentSuggestions": 609,
7	  "injectedSuggestions": 62,
8	  "byHook": {
9	    "ollama-task-offloader": {
10	      "fired": 781,
11	      "offloaded": 62,
12	      "kept": 603,
13	      "suggested": 116,
14	      "tokensSaved": 65143
15	    },
16	    "grep-index-first": {
17	     
... [+2982 chars truncated]

### User | 2026-06-11T00:19:05.168Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-offload-dashboard.mjs — print last-24h Ollama offload stats
4	 *
5	 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03.
6	 *
7	 * Reads mcp-server/data/state/ollama-offload-stats.json (schemaVersion 2.0.0)
8	 * and prints:
9	 *   1. Top-line totals (since last reset)
10	 *   2. Per-hook fire counts (which hooks are doing the routing)
11	 *   3. Last 24h activity from the ro
... [+17751 chars truncated]

### Assistant | 2026-06-11T00:19:08.711Z

Now I have the live stats and the dashboard logic. The key insight: 62 offloaded / 603 kept lifetime (9.3% raw). Let me read the two core routing hooks (`ollama-task-offloader` does the actual offloading; `ollama-route-pretooluse` is the high-fire one) plus the model-selection library.

### Assistant | 2026-06-11T00:19:09.177Z

[tool_use: Read]

### User | 2026-06-11T00:19:13.500Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+32363 chars truncated]

### Assistant | 2026-06-11T00:19:19.485Z

I have the offloader's full logic. Now let me read the model-selection library (`ollama-cost-router.mjs`), the `claudemd-ollama-enforcer` hook, the route-pretooluse hook, and check the named memories + settings.json wiring in parallel.

### Assistant | 2026-06-11T00:19:19.967Z

[tool_use: Read]

### Assistant | 2026-06-11T00:19:20.916Z

[tool_use: Read]

### Assistant | 2026-06-11T00:19:21.358Z

[tool_use: Read]

### Assistant | 2026-06-11T00:19:22.057Z

[tool_use: Read]

### User | 2026-06-11T00:19:28.789Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+12705 chars truncated]

### User | 2026-06-11T00:19:29.178Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * claudemd-ollama-enforcer.mjs — UserPromptSubmit hook
5	 *
6	 * REVOLUTIONARY APPROACH: Instead of injecting 2000+ tokens of static
7	 * CLAUDE.md rules, Ollama reads the FULL ruleset locally and outputs
8	 * ONLY the 3-5 most relevant rules for THIS specific prompt.
9	 *
10	 * Token savings: 85-90% (2000 → 150-300 tokens)
11	 * Enforcement quality: BE
... [+12378 chars truncated]

### User | 2026-06-11T00:19:29.340Z

[tool_result] 1	---
2	name: reference_ollama_route_auto_enabled_2026_06_10
3	description: "Operator directive 2026-06-10 ('utilize ollama whenever possible, that should be automatic') -> verified the automatic Ollama offload is ALREADY live+firing (corrected a false 'dormant' alarm) and enabled the one missing lever PRISM_OLLAMA_ROUTE_AUTO=1 in settings (C: -> mirrored H:). Arms the ollama-route-pretooluse deny
... [+3516 chars truncated]

### User | 2026-06-11T00:19:29.401Z

[tool_result] 1	---
2	name: reference_ollama_roster_fitness_audit_2026_06_09
3	description: "Audit (2026-06-09, slot charlie) of the synergy /goal's LITERAL #1 clause: 'synergize ollama -- make sure we pulled correct models relative to gpu/cpu/nvme/128GB RAM.' PULL-SIDE = VALIDATED PASS: 10 models pulled, all Blackwell-fitted (gpt-oss:120b 60.9GB fits 96GB VRAM resident, nothing exceeds VRAM), ZERO retired tags
... [+7788 chars truncated]

### Assistant | 2026-06-11T00:19:33.068Z

Now I have the full routing + model-selection picture. Let me read the `ollama-route-pretooluse.mjs` (the highest-fire hook, 5704 fires), the vision-single-source memory, and verify the settings.json wiring + ask-ollama defaults in parallel to confirm the "9% gap" claims.

### Assistant | 2026-06-11T00:19:34.039Z

[tool_use: Read]

### Assistant | 2026-06-11T00:19:34.575Z

[tool_use: Read]

### Assistant | 2026-06-11T00:19:35.916Z

[tool_use: Grep]

### User | 2026-06-11T00:19:36.627Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * ollama-route-pretooluse.mjs — PreToolUse:Read — route trivial bulk reads at the local LLM.
5	 *
6	 * U-HKA04 of HOOKS-AUTOMATION-V2-MS0. Tool-level complement to the prompt-level
7	 * offloaders (ollama-auto-router.mjs / ollama-task-offloader.mjs) and to
8	 * mcp-server/src/engines/OllamaHookBridgeEngine.ts.
9	 *
10	 * WHY: a 50 KB .log / .jsonl / gen
... [+26575 chars truncated]

### User | 2026-06-11T00:19:36.882Z

[tool_result] 1	---
2	name: reference_ollama_vision_single_source_2026_06_09
3	description: "Alpha's config+cleanup slice of the OLLAMA-AUTORUN model-default optimization (operator 'coordinate with bravo' + AskUserQuestion split). Single-sourced the OCR multi-VLM ensemble roster into VISION_FAMILY_LEADERS (scripts/lib/vision-model-select.mjs) -- was a duplicated literal in vision-ensemble-extract.mjs + blueprin
... [+4196 chars truncated]

### User | 2026-06-11T00:19:38.001Z

[tool_result] 7:    "OLLAMA_MODELS": "H:/Tools/ollama/models",
12:    "NIM_FALLBACK_TO_OLLAMA": "1",
40:    "ollama-explain": "user-invocable-only",
41:    "ollama-summarize": "user-invocable-only",
42:    "ollama-docstring": "user-invocable-only",
43:    "ollama-classify": "user-invocable-only",
44:    "ollama-diff-summary": "user-invocable-only",
45:    "ollama-error-triage": "user-invocable-only",
46:    "ol
... [+807 chars truncated]

### Assistant | 2026-06-11T00:19:42.872Z

I have nearly everything. Two final checks: confirm `PRISM_OLLAMA_ROUTE_AUTO` is actually set in settings.json env (the grep didn't show it in the env block lines 1-12, only `NIM_FALLBACK`/`OLLAMA_MODELS`), and read the ask-ollama.mjs DEFAULT_MODEL + the OllamaHookBridgeEngine head. Let me also check the env block of settings.json directly.

### Assistant | 2026-06-11T00:19:46.808Z

[tool_use: Read]

### Assistant | 2026-06-11T00:19:47.467Z

[tool_use: Read]

### Assistant | 2026-06-11T00:19:47.571Z

[tool_use: Read]

### User | 2026-06-11T00:19:48.777Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "includeCoAuthoredBy": false,
4	  "spinnerTipsEnabled": false,
5	  "env": {
6	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
7	    "OLLAMA_MODELS": "H:/Tools/ollama/models",

... [+1681 chars truncated]

### User | 2026-06-11T00:19:49.622Z

[tool_result] 1	/**
2	 * OllamaHookBridgeEngine
3	 *
4	 * Enables Claude Code hooks to call local Ollama for intelligent suggestions
5	 * without consuming API tokens. Designed for hook use cases:
6	 *
7	 * - Fast: 500ms default timeout (hooks can't block long)
8	 * - Resilient: Graceful fallback when Ollama unavailable
9	 * - Configurable: Per-hook-type model selection
10	 * - Stateless: No connection pooling 
... [+3157 chars truncated]

### User | 2026-06-11T00:19:50.197Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+4345 chars truncated]

### Assistant | 2026-06-11T00:20:54.459Z

I now have everything needed. The critical finding: `PRISM_OLLAMA_ROUTE_AUTO` is NOT in the settings.json env block (lines 5-31) despite the memory claiming it was enabled — confirming the route-pretooluse hook defaults to suggest-only. I have the full picture across all five report sections.

---

1. ROUTING DECISION — what triggers an offload

Offload is automatic at the HOOK layer (not opt-in per task), via two independent always-on hooks, but it is overwhelmingly advisory — almost nothing is force-substituted. There are three distinct routing surfaces:

- (a) Prompt-level classifier — `.claude/hooks/ollama-task-offloader.mjs` (UserPromptSubmit, T4, wired at `settings.json:795`). On every prompt ≥20 chars it runs `classifyPrompt()`: a SAFETY_PRE gate (physics/Kienzle/Taylor → never offload), then `OFFLOADABLE_PATTERNS` (regex → category+savings), then a `KEEP_ON_CLAUDE` fallback labeler. If offloadable AND `savings ≥ 0.80` AND not rate-limited (60s/category) AND Ollama `/api/tags` is reachable, it records `decision:"offload"` and injects an `additionalContext` directive. For four "safe-autoexec" categories (`explanation/summary/git_summary/documentation`) with a detected file target, it emits an IMPERATIVE directive (`⚡ AUTO-OFFLOAD … node scripts/ask-ollama.mjs <mode> <file>`); otherwise a soft `💡 OFFLOAD OPPORTUNITY` suggestion. Critically the hook does NOT itself call Ollama — it hands Claude a ready-to-run command and trusts Claude to run it (`ollama-task-offloader.mjs:363-426, 432-591`).

- (b) Read-level router — `.claude/hooks/ollama-route-pretooluse.mjs` (PreToolUse:Read, T1, wired via `.claude/hooks/bundles/read-bundle.mjs` not direct settings refs). On every Read it classifies the target (`classifyReadTarget`): bulk-data files (`.log/.jsonl/.csv/.txt`, or `.json/.md` under state/data paths) are "consumable". Default mode is suggest (nudge to `/ollama-summarize`). Only when `PRISM_OLLAMA_ROUTE_AUTO=1` AND the file passes the narrow `isGistSafe` allowlist
... [+8995 chars truncated]
