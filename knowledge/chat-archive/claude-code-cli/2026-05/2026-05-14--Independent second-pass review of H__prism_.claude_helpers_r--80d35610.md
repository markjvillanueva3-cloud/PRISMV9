---
type: "chat-session"
source: "claude-code-cli"
session_id: "80d35610-4a16-481b-b67b-df0e2cf8ebe8"
title: "Independent second-pass review of H:/prism/.claude/helpers/ram-zombie-watch.mjs."
date: "2026-05-14"
first_ts: "2026-05-14T00:54:16.375Z"
last_ts: "2026-05-14T00:57:34.457Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/80d35610-4a16-481b-b67b-df0e2cf8ebe8/subagents/agent-ad284398a44f8c67a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Independent second-pass review of H:/prism/.claude/helpers/ram-zombie-watch.mjs.

> **claude-code-cli** | 2026-05-14 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/80d35610-4a16-481b-b67b-df0e2cf8ebe8/subagents/agent-ad284398a44f8c67a.jsonl`

## Transcript

### User | 2026-05-14T00:54:16.375Z

Independent second-pass review of H:/prism/.claude/helpers/ram-zombie-watch.mjs. The code-analyzer is focused on the polling/cooldown/reaper logic — you cover the rest.

Context: Node-native fleet watchdog. Polls process counts via Windows `tasklist`, RAM via os.freemem/totalmem, stale .git/index.lock files across sibling H:/prism* worktrees. On threshold breach spawns 3 reaper hooks. Single-write-per-tick to play nice with the Monitor tool's 200ms notification batching. Per-condition 5-minute cooldown. Currently functions as a foreground watcher (Monitor persistent mode kills the script after ~90s regardless of content — verified with a minimal-emit diagnostic).

Things I want YOU specifically to look at:

1. Cross-platform: the script assumes Windows (tasklist). If invoked on macOS/Linux, what happens — clean error or silent zeros? Is the assumption documented?
2. Integration with existing PRISM cleanup infrastructure: the operator has 4 Windows scheduled tasks (PRISM Hook Janitor 2min, Node Orphan Cleaner 5min, Orphan Process Reaper PS 5min, Zombie Reaper v2 5min) all healthy. Is this watchdog redundant with them? Should it short-circuit if those are detected?
3. Honesty: the code calls 3 reapers labeled stale-claims / git-locks / node-janitor. Verify those hook files exist and accept the args passed. node-process-janitor.mjs invoked with --full — does it accept that?
4. Convention conformance: does the script match the style of sibling .claude/helpers/*.mjs scripts? Same shebang, same env-var-with-default pattern, same logging idioms?
5. Failure visibility: if all reapers fail silently (e.g. wrong args, missing files), does the alert still emit useful info or is it a black hole?
6. Output-volume governance: the Monitor tool docs say "Monitors that produce too many events are automatically stopped." My evidence is that persistent mode kills ANY script after a few ticks regardless of event count. But if I were to fix that bug and re-wire it through Monitor, would 
... [+102 chars truncated]

### Assistant | 2026-05-14T00:54:20.307Z

I'll review the script focusing on your 6 specified areas.

### Assistant | 2026-05-14T00:54:20.559Z

[tool_use: Read]

### User | 2026-05-14T00:54:21.354Z

[tool_result] 1	#!/usr/bin/env node
2	// ram-zombie-watch.mjs — fleet watchdog for the Monitor tool. Single-write-per-tick.
3	// Stdout = events. Stderr = errors (captured to task output file, not the event stream).
4	//
5	// Each tick produces AT MOST ONE stdout write so Monitor sees it as one notification.
6	// Per-condition cooldown prevents alert spam — same alert won't re-emit within ALERT_COOLDOWN_MS.
7	

... [+7024 chars truncated]

### Assistant | 2026-05-14T00:54:24.505Z

I'll verify the reaper hooks exist and check sibling helper conventions, then deliver the review.

### Assistant | 2026-05-14T00:54:25.860Z

[tool_use: Bash]

### Assistant | 2026-05-14T00:54:26.424Z

[tool_use: Bash]

### User | 2026-05-14T00:54:29.573Z

[tool_result] H:/prism/.claude/hooks/git-lock-sweeper.mjs*
H:/prism/.claude/hooks/node-process-janitor.mjs*
H:/prism/.claude/hooks/stale-claim-sweeper.mjs*

### User | 2026-05-14T00:54:31.834Z

[tool_result] H:/prism/.claude/helpers/advisor-session-log.mjs
H:/prism/.claude/helpers/agent-coordination-daemon.mjs
H:/prism/.claude/helpers/agent-coordination.mjs
H:/prism/.claude/helpers/agent-identity.mjs
H:/prism/.claude/helpers/agent-index-injector.mjs*
H:/prism/.claude/helpers/agent-util-ledger.mjs*
H:/prism/.claude/helpers/ai-self-awareness-inject.mjs*
H:/prism/.claude/helpers/ai-system-activation.mjs*
... [+560 chars truncated]

### Assistant | 2026-05-14T00:54:35.873Z

[tool_use: Bash]

### Assistant | 2026-05-14T00:54:36.527Z

[tool_use: Bash]

### User | 2026-05-14T00:54:40.556Z

[tool_result] H:/prism/.claude/hooks/node-process-janitor.mjs
4: * Node Process Janitor — PreToolUse `.*` (hot path) + scheduled `--full` (backstop)
30: *   --full     scheduled-task mode: ignore the throttle, always sweep, also do
53:const VERBOSE = process.argv.includes("--verbose");
54:const FULL = process.argv.includes("--full") || process.argv.includes("--scheduled");
141:    log(`windows cleanup complete 
... [+88 chars truncated]

### User | 2026-05-14T00:57:06.405Z

[tool_result] ==> H:/prism/.claude/helpers/atomic-write.mjs <==
/**
 * atomic-write.mjs — JS port of AtomicWritesEngine for hook/helper use.
 *
 * The TypeScript AtomicWritesEngine (src/engines/AtomicWritesEngine.ts)
 * can't be imported from .mjs hooks without compiled output. This helper
 * mirrors its algorithm: write to a sibling temp file, fsync, rename.
 *
 * Guarantees: a crash mid-write leaves either th
... [+350 chars truncated]

### Assistant | 2026-05-14T00:57:34.457Z

Reviewing against PRISM doctrine (CLAUDE.md / MCP directives) and the existing cleanup infrastructure documented in MEMORY.md.

# Independent Second-Pass Review: ram-zombie-watch.mjs

**Verdict: FAIL — P0 redundancy + P1 cross-platform + P1 doctrine drift**

## P0 — Redundancy with existing infrastructure (architectural)

Per MEMORY.md `reference_harness_hang_prevention.md`, the operator already has **4 healthy Windows scheduled tasks**: PRISM Hook Janitor (2min), Node Orphan Cleaner (5min), Orphan Process Reaper PS (5min), Zombie Reaper v2 (5min). This script duplicates their reaping function at 60s cadence with **no short-circuit** detecting them. Two systems running `node-process-janitor.mjs --full` independently can race on `taskkill /T`. Either (a) check `schtasks /Query` for the existing tasks and exit if present, (b) restrict this script to *alerting only* (no reaping — delegate to scheduled tasks), or (c) document why dual-tier reaping is intentional.

## P1 — Cross-platform: silent zero, not clean error

On macOS/Linux, `tasklist` doesn't exist. `spawnSync` returns `r.error` (ENOENT), `countProcess` logs to stderr and returns **0**. RAM check still works via `os.freemem`. Result: forever-silent watchdog that reports `node=0 bash=0` — false negatives indistinguishable from a healthy fleet. No `if (process.platform !== "win32") { process.exit(2) }` guard at startup. Add it, or document Windows-only in the header comment (currently only implicit in `tasklist`/`bash.exe`).

## P1 — Doctrine drift: manual workflow vs MCP-first

Per the PreToolUse reminder and `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md`, watchdog/reap workflows should route through dispatchers (`prism_dev:async_dispatch`, `prism_context:coord_sqlite`, `prism_session:hook_map_compact`) — not bypass them with `spawnSync` of hook scripts. This script teaches a parallel command surface that `forge-audit` will eventually flag as orphaned.

## P2 — Convention conformance

Header comment matches si
... [+1959 chars truncated]
