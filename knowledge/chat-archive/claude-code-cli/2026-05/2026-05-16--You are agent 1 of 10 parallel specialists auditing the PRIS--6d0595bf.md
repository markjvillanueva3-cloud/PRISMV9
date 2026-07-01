---
type: "chat-session"
source: "claude-code-cli"
session_id: "6d0595bf-26fa-4329-b16e-462ca941e240"
title: "You are agent 1 of 10 parallel specialists auditing the PRISM multi-chat-fleet s"
date: "2026-05-16"
first_ts: "2026-05-16T02:57:23.738Z"
last_ts: "2026-05-16T02:58:43.770Z"
cwd: "H:\\prism\\mcp-server"
messages: 22
user_msgs: 10
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/6d0595bf-26fa-4329-b16e-462ca941e240/subagents/agent-a8418e2fa5aaeed3e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# You are agent 1 of 10 parallel specialists auditing the PRISM multi-chat-fleet s

> **claude-code-cli** | 2026-05-16 | 22 msgs (10 user / 12 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/6d0595bf-26fa-4329-b16e-462ca941e240/subagents/agent-a8418e2fa5aaeed3e.jsonl`

## Transcript

### User | 2026-05-16T02:57:23.738Z

You are agent 1 of 10 parallel specialists auditing the PRISM multi-chat-fleet system. Your domain: **hook & stop-hook architecture, bundling, async dispatch**.

CONTEXT: PRISM runs 10-12 concurrent Claude Code chats (slots alpha..lima + golf). Settings.json has Stop chain with 39 wired hooks (177s worst-case timeout budget) — this is causing "walls of errors" across the fleet. Bundle pattern exists (124 hooks reach via 7 bundles). AsyncHookDispatcherEngine exists for offloading T4 work. The user's goal: MORE auto-invocation but MUST be multi-chat-safe (never assume single chat).

YOUR TASK:
1. Run `node H:/prism/scripts/system-viz-query.mjs find hooks` and `find bundle` and `find async-hook` to understand the hook topology.
2. Read `H:/temp/hook-audit.json` (already generated — has wired/orphan/bundle classification).
3. Read 2-3 bundle source files in `H:/prism/.claude/hooks/bundles/` to understand the bundling pattern.
4. Read `H:/prism/mcp-server/src/engines/AsyncHookDispatcherEngine.ts` (already exists, 600 LOC, JSONL-queue-backed).

DELIVERABLE (under 500 words, structured):
- **Stop chain rebundling plan**: which of the 15 `stop_on_*` "other" hooks + 5 safety-gates should be folded into a new `stop-on-bundle.mjs`. What stays standalone (load-bearing safety) vs. bundled (regression detectors).
- **Async-defer plan**: which T3-T4 Stop hooks can move to `AsyncHookDispatcherEngine` queue (work happens in background, Stop returns immediately). Multi-chat safety property: each chat enqueues with its own session_id so peer chats never block on this chat's queue.
- **Multi-chat safety review**: any of the 39 Stop hooks that have race conditions when 10 chats Stop simultaneously? Specifically check file-lock patterns + JSONL append ordering.
- **Concrete actions** (≤5): the specific file edits + settings.json changes needed. NO speculative wiring — only fixes to existing wired hooks. The lesson from a recent incident: don't wire orphan hooks just because they exist.


... [+142 chars truncated]

### Assistant | 2026-05-16T02:57:29.069Z

I'll execute the audit systematically.

### Assistant | 2026-05-16T02:57:30.152Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:57:31.083Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:57:32.091Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:57:32.194Z

[tool_use: Read]

### User | 2026-05-16T02:57:36.064Z

[tool_result] Found 30 node(s) matching "hooks":
  L6/core  core.hooks_src               Source Hooks (54)
  L6/core  core.hooks_cl                Claude Hooks (450 → 26 buckets)
  L8/state  state.hooks                  state/hooks
  L8/state  state.nl_hooks               state/nl_hooks
  L10/project  vault.mem.project.project_my_hooks_ollama_integration project_my_hooks_ollama_integ...
  L10/_root  vault.mem.p
... [+3162 chars truncated]

### User | 2026-05-16T02:57:43.802Z

[tool_result] Found 30 node(s) matching "bundle":
  L10/architecture  vault.wiki.architecture.actions.cadautomation.cad-bundle-diff cad-bundle-diff
  L10/architecture  vault.wiki.architecture.actions.cadautomation.cad-bundle-get cad-bundle-get
  L10/architecture  vault.wiki.architecture.actions.cadautomation.cad-bundle-key-create cad-bundle-key-create
  L10/architecture  vault.wiki.architecture.actions.cadautom
... [+2778 chars truncated]

### User | 2026-05-16T02:57:50.949Z

[tool_result] Found 2 node(s) matching "async-hook":
  L6/script  script.async-hook-runner     async-hook-runner
  L8/memory_entry  memory_reference.reference_h7_async_hook_dispatcher reference-h7-async-hook-dispatcher

### User | 2026-05-16T02:57:52.444Z

[tool_result] 1	{
2	  "summary": {
3	    "totalSourceHooks": 505,
4	    "wiredInSettings": 135,
5	    "bundleChildren": 124,
6	    "routerDispatched": 214,
7	    "trulyOrphan": 268
8	  },
9	  "eventLoad": {
10	    "SessionStart": 36,
11	    "PreCompact": 8,
12	    "Stop": 39,
13	    "PreToolUse": 17,
14	    "UserPromptSubmit": 22,
15	    "PostToolUse": 12,
16	    "SubagentStart": 1
17	  },
18	  "eventTimeoutBud
... [+35776 chars truncated]

### Assistant | 2026-05-16T02:57:57.013Z

I have the raw bytes I need from the audit. Let me now examine the bundle pattern and AsyncHookDispatcherEngine to complete my analysis.

### Assistant | 2026-05-16T02:57:57.925Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:57:58.974Z

[tool_use: Read]

### User | 2026-05-16T02:58:00.194Z

[tool_result] 1	/**
2	 * AsyncHookDispatcherEngine — HOOK-SYNERGY-MS0 / U-HOOK-ASYNC-DISPATCH (H7)
3	 *
4	 * Decouples Tier-4 (async/background) hooks from the synchronous Stop critical
5	 * path. The Stop hook in PRISM's harness blocks the session until every wired
6	 * Stop hook returns; a single slow hook (vitest gate, deep-test-sweep,
7	 * git-sync) can push wall-time past 30s. This engine offers two surfac
... [+5763 chars truncated]

### User | 2026-05-16T02:58:02.590Z

[tool_result] bash-bundle.mjs*
edit-bundle.mjs*
lib/
posttool-bash-read-bundle.mjs*
posttool-edit-bundle.mjs*
read-bundle.mjs*
sessionstart-bundle.mjs*
smoke-test.mjs*
stop-bundle.mjs*

### Assistant | 2026-05-16T02:58:05.596Z

[tool_use: Read]

### Assistant | 2026-05-16T02:58:06.602Z

[tool_use: Read]

### Assistant | 2026-05-16T02:58:07.188Z

[tool_use: Read]

### User | 2026-05-16T02:58:07.254Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	// stop-bundle.mjs — single Stop hook that runs the NON-BLOCKING Stop trackers.
4	//
5	// Why: the Stop event has ~30 `*`-matched hooks; each fires a fresh node.exe at
6	// every turn-end (≈30-spawn burst, ×N concurrent chats). This bundle absorbs
7	// only the ~14 trackers / sync / cleanup hooks that never block a Stop — the
8	// ~16 HARD-BLOCK gates (`stop_o
... [+4752 chars truncated]

### User | 2026-05-16T02:58:08.511Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	// sessionstart-bundle.mjs — single SessionStart hook for the context-injector /
4	// non-critical SessionStart hooks.
5	//
6	// Why: SessionStart had ~32 hooks, each a fresh node.exe at session start
7	// (≈3-5 s of cold-start fan-out before the session is usable). This bundle
8	// absorbs only the ~19 pure context-injectors / convenience hooks. The
9	// ~13 
... [+4022 chars truncated]

### User | 2026-05-16T02:58:09.170Z

[tool_result] 120	}
121	
122	/** Top-level stats summary returned by `getStats()`. */
123	export interface AsyncHookStatsSummary {
124	  totalFires: number;
125	  uniqueHooks: number;
126	  failureRate: number;       // fraction in [0, 1]
127	  windowMs: number;
128	  generatedAt: string;
129	  perHook: AsyncHookStats[];
130	}
131	
132	/** Filters accepted by `getResults()`. */
133	export interface ResultsFilte
... [+4629 chars truncated]

### Assistant | 2026-05-16T02:58:43.770Z

I have sufficient data. Producing the audit deliverable now.

# Hook Architecture Audit — Domain 1 (Stop chain + bundling + async)

## Stop Chain Rebundling Plan

Stop chain today: **39 hooks / 177s worst-case budget**. The existing `stop-bundle.mjs` already absorbs 15 non-blocking trackers — good template. Remaining 24 individual entries break into three classes:

**KEEP STANDALONE (load-bearing, fail-closed gates — 8 hooks):**
- `goal-complete-gate`, `duplication-guard-stop`, `commit-pressure-stop-gate`, `always-build-guard`, `blueprint-coverage-floor-guard` (5 safety-gates — must propagate `continue:false` cleanly; bundle's fail-OPEN policy is wrong for these)
- `stop_on_failing_tests`, `stop_on_build_error`, `stop-force-handoff` (HARD blocks the user explicitly relies on)

**NEW BUNDLE `stop-regression-bundle.mjs` (10 detector hooks, fold in):**
- `stop_on_c_drive_write`, `stop_on_cutting_calculation_protocol`, `stop_on_unwired_assets`, `stop_on_skill_unwired`, `stop_on_duplicate_created`, `stop_on_svi_regression`, `stop_on_broken_imports`, `stop_on_hook_unregistration`, `stop_on_orphan_children`, `stop_on_unsafe_gcode`
- Rationale: all share `decision:block` semantics on regression detection; bundle should PROPAGATE block (unlike `stop-bundle.mjs` which trackers-only). Pattern: copy `stop-bundle.mjs` but flip the on-crash policy to fail-CLOSED for this bundle.
- Net: 39 → 30 wired Stop entries; ~50s timeout reclaim.

**KEEP STANDALONE (already non-blocking but matters individually):**
- `error-pattern-promote`, `regression-auto-write`, `post-ship-distill`, `stop-wiring-audit-suggest`, `fleet-reaper-stop`, `stop-system-viz-drift`, `git-sync-stop` (supervised push semantics)

## Async-Defer Plan (move to `AsyncHookDispatcherEngine.enqueue()`)

Engine already supports `jobId = <ts>-<rand>` keyed (per-chat isolation by construction — every enqueue gets a unique id; peer chats append to same JSONL but never read each other's job results). Candidates:

| Hook | Tier 
... [+2957 chars truncated]
