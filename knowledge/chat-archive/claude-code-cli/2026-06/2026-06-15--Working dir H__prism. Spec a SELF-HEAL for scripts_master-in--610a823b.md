---
type: "chat-session"
source: "claude-code-cli"
session_id: "610a823b-dfea-4855-b749-16661916b5fa"
title: "Working dir H:/prism. Spec a SELF-HEAL for scripts/master-index-daemon.mjs (warm"
date: "2026-06-15"
first_ts: "2026-06-15T00:38:16.230Z"
last_ts: "2026-06-15T00:42:21.236Z"
cwd: "H:\\prism-slot-tango"
messages: 35
user_msgs: 15
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/workflows/wf_77674ab0-221/agent-a7a3f7801c442a638.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# Working dir H:/prism. Spec a SELF-HEAL for scripts/master-index-daemon.mjs (warm

> **claude-code-cli** | 2026-06-15 | 35 msgs (15 user / 20 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/workflows/wf_77674ab0-221/agent-a7a3f7801c442a638.jsonl`

## Transcript

### User | 2026-06-15T00:38:16.230Z

Working dir H:/prism. Spec a SELF-HEAL for scripts/master-index-daemon.mjs (warm daemon :3101, /health) WITHOUT operator elevation. Read the daemon launch+single-instance guard; read templates .claude/hooks/golf-slot-reaper-guardian.mjs + .claude/hooks/mcp-connectivity-check.mjs (SessionStart/UserPromptSubmit ensure-up guardians). recommendation=precise build plan for an ensure-index-daemon guardian: file path, hook event, spawn-detached recipe (process.execPath,[daemon],{detached:true,stdio:ignore}).unref(), fail-soft, throttle.

### Assistant | 2026-06-15T00:38:20.590Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:38:21.072Z

[tool_use: Bash]

### User | 2026-06-15T00:38:40.988Z

[tool_result] __fixtures__
__pycache__
__tests__
_archive
_audit-foxtrot-mill-cam.mjs
_classify-hooks.mjs
_completed_utilities
_emergency-unwire-yolo-25.mjs
_fix_ref_hb.js
_hook-audit-report.mjs
_oneshot-rename-last-night.mjs
_prep-hook-slices.mjs
_prism_paths.py
_restore-3-critical-hooks.mjs
_restore-continuity-hooks.mjs
_sfc-probe.mjs
_temp-orphan-scan.mjs
_tmp_tb_diff.txt
_tmp_tb_review.mjs
_turning-probe.mj
... [+578 chars truncated]

### User | 2026-06-15T00:38:42.871Z

[tool_result] __tests__
_disabled
_envelope.mjs
_rpc-shim.mjs
_rpc-shim.test.mjs
activate-before-build-precheck.mjs
activate-before-build-precheck.test.mjs
active-chat-priority-boost.mjs
active-chat-priority-decay.mjs
agent-boundary-guard.mjs
agent-fanout-pressure-gate.mjs
agent-fanout-pressure-gate.test.mjs
agent-pid-tracker.mjs
agent-registry-load.mjs
agent-rules-inject.mjs
agent-util-log.mjs
agent-vs-direct.
... [+621 chars truncated]

### Assistant | 2026-06-15T00:38:45.191Z

Let me read all the relevant files in parallel.

### Assistant | 2026-06-15T00:38:45.633Z

[tool_use: Read]

### Assistant | 2026-06-15T00:38:46.530Z

[tool_use: Read]

### Assistant | 2026-06-15T00:38:46.780Z

[tool_use: Read]

### User | 2026-06-15T00:39:06.411Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: daemon
3	/**
4	 * master-index-daemon.mjs -- long-lived WARM master-index search service.
5	 *
6	 * THE GAP THIS CLOSES (FLEET-SEARCH-DAEMON-MS0, 2026-06-14, slot tango):
7	 *   The full search sidecar (state/shared/system-viz/system-graph-index.json,
8	 *   ~262MB) is built nightly off the 745MB system-graph.json, but it is REJECTED
9	 *   on every fleet search: m
... [+7796 chars truncated]

### User | 2026-06-15T00:39:06.412Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * golf-slot-reaper-guardian.mjs — the GOLF slot owns the fleet reaper.
5	 *
6	 * Doctrine (user directive, 2026-05-16, SUPERSEDES the prior alpha-owns rule):
7	 * "make it so golf is the new permanent /fleet-reaper monitor instead of alpha."
8	 * The chat holding the `golf` slot in chat-slots.json owns the FLEET-REAPER
9	 * pipeline. This hook is the en
... [+20513 chars truncated]

### User | 2026-06-15T00:39:07.293Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+17128 chars truncated]

### Assistant | 2026-06-15T00:39:11.125Z

Now let me check the settings.json for hook wiring and look at any existing daemon-guardian patterns.

### Assistant | 2026-06-15T00:39:12.327Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:39:13.520Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:39:14.287Z

[tool_use: Bash]

### User | 2026-06-15T00:39:35.551Z

[tool_result] alpha-slot-reaper-guardian.mjs
blueprint-join-index-stale-check.mjs
git-index-lock-sweep.mjs
git-index-lock-sweep.test.mjs
golf-slot-reaper-guardian.mjs
golf-slot-reaper-guardian.test.mjs
grep-index-first.mjs
grep-index-first.test.mjs
grep-index-taken-correlator.mjs
grep-index-taken-correlator.test.mjs
master-index-precheck-inject.mjs
master-index-precheck-inject.test.mjs
master-index-search-gate.
... [+221 chars truncated]

### User | 2026-06-15T00:39:36.794Z

[tool_result] (Bash completed with no output)

### User | 2026-06-15T00:39:38.808Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-15T00:39:41.851Z

Good — task #8 is the exact gap this guardian closes. Let me read the mcp-daemon-autostart template and the settings.json hook wiring structure.

### Assistant | 2026-06-15T00:39:42.563Z

[tool_use: Read]

### Assistant | 2026-06-15T00:39:43.628Z

[tool_use: Bash]

### User | 2026-06-15T00:39:57.324Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * mcp-daemon-autostart.mjs — SessionStart Hook
5	 *
6	 * Auto-starts the shared MCP HTTP daemon on session start.
7	 * This ensures all Claude chats share a single MCP server instance
8	 * instead of each spawning their own stdio process.
9	 *
10	 * @hook SessionStart
11	 */
12	
13	import { spawn } from "child_process";
14	import http from "http";
15	
1
... [+2573 chars truncated]

### User | 2026-06-15T00:40:07.662Z

[tool_result]   "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
--
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [

### Assistant | 2026-06-15T00:40:10.476Z

Now let me get the full settings.json hook list and check the stamp file convention and state directory.

### Assistant | 2026-06-15T00:40:12.755Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:40:13.899Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:40:14.949Z

[tool_use: Bash]

### User | 2026-06-15T00:40:31.694Z

[tool_result] === SessionStart ===
  "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/session-id-pin.mjs
  "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/settings-mirror-guard.mjs
  "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/portable-node-guard.mjs
  "H:/.claude/bin/portable-node" H:/prism/.claude/scripts/verify-hook-refs.mjs
  "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/po
... [+16115 chars truncated]

### User | 2026-06-15T00:40:40.245Z

[tool_result] (Bash completed with no output)

### User | 2026-06-15T00:40:40.586Z

[tool_result] AGENT_COORDINATION_DAEMON.json
daemons
mcp-daemon.log
psn-autonomy-tick-stamps.json

### Assistant | 2026-06-15T00:40:43.845Z

I have everything I need. Let me compile the full picture.

### Assistant | 2026-06-15T00:41:49.629Z

[tool_use: StructuredOutput]

### User | 2026-06-15T00:41:59.168Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-15T00:42:21.236Z

Here is the complete build plan synthesized from reading all three source files:

---

## What was read and what it tells us

**`scripts/master-index-daemon.mjs`** — The daemon is a plain HTTP server on `127.0.0.1:3101`. Its single-instance guard is entirely self-contained: `server.on("error", (e) => { if (e.code === "EADDRINUSE") process.exit(0); })` (lines 138-145). No PID file, no lock — a second spawn races for the port and the loser exits 0 cleanly. The daemon requires `--max-old-space-size=2048` on the node invocation or it will silently fall back to the 59MB graph instead of the 262MB full sidecar (line 33). It sets `PRISM_INDEX_DAEMON_SELF=1` on itself to prevent search-lib re-entry (line 59). `/health` returns 200 JSON.

**`golf-slot-reaper-guardian.mjs`** — The canonical fleet guardian pattern: dual-event wiring (SessionStart + UserPromptSubmit), stamp-file throttle with `statSync` mtime, `spawnSync` for a query then `spawn(..., {detached:true, stdio:'ignore', windowsHide:true})` + `child.unref()` for a detached kick, always-`{continue:true}` output, `invokedDirectly` guard at the bottom so imports don't execute `main()`. The stamp file lives in `state/shared/`.

**`mcp-daemon-autostart.mjs`** — The simpler daemon-ensure pattern: probe `/health` first, spawn only if down, brief poll after spawn (but for the index daemon the poll is skipped — the 262MB warm takes too long to stall SessionStart).

---

## The guardian in one precise spec

**File:** `H:/prism/.claude/hooks/ensure-index-daemon-guardian.mjs`

**Core flow:**
```
SessionStart  → always probe :3101/health → if down: spawn detached node --max-old-space-size=2048 daemon → unref → emit warming advisory
UserPromptSubmit → if stamp < 60s old: skip (sub-ms) → else probe → same branch
Always: emitContinue({continue:true}), never block
```

**Exact spawn recipe:**
```js
const child = spawn(
  process.execPath,                          // resolves to portable-node when invoked via it
  ['--max-old-space-si
... [+1263 chars truncated]
