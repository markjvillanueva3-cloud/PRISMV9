---
type: "chat-session"
source: "claude-code-cli"
session_id: "80d35610-4a16-481b-b67b-df0e2cf8ebe8"
title: "Review H:/prism/.claude/helpers/ram-zombie-watch.mjs end-to-end as a content-spe"
date: "2026-05-14"
first_ts: "2026-05-14T00:54:07.138Z"
last_ts: "2026-05-14T00:54:38.131Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/80d35610-4a16-481b-b67b-df0e2cf8ebe8/subagents/agent-af528080bef6e07cf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Review H:/prism/.claude/helpers/ram-zombie-watch.mjs end-to-end as a content-spe

> **claude-code-cli** | 2026-05-14 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/80d35610-4a16-481b-b67b-df0e2cf8ebe8/subagents/agent-af528080bef6e07cf.jsonl`

## Transcript

### User | 2026-05-14T00:54:07.138Z

Review H:/prism/.claude/helpers/ram-zombie-watch.mjs end-to-end as a content-specialist code-analyzer.

Context: This is a fleet watchdog intended to run as a Node child of the Claude Code Monitor tool. Stdout = events (Monitor batches stdout lines within 200ms into one notification). Stderr = errors (captured to task output file, not the event stream). The watcher polls every POLL_SEC (default 60) and emits an alert (single multi-line write) when node.exe > NODE_MAX, bash.exe > BASH_MAX, RAM% > RAM_MAX, or a stale .git/index.lock is found. Per-condition cooldown ALERT_COOLDOWN_MS prevents alert spam. On alert it spawns 3 reaper hooks: stale-claim-sweeper.mjs, git-lock-sweeper.mjs, node-process-janitor.mjs --full.

I have evidence the Monitor tool persistent-mode auto-kills the script after ~90s regardless of content (a 10-line diagnostic emitting only timestamps also dies). The script is therefore now intended as a FOREGROUND watcher (POLL_SEC=2 node ram-zombie-watch.mjs). Verify whether that intent is realized.

What I want you to verify (PASS/FAIL):
1. Single-write-per-tick: each tick must call process.stdout.write ONCE (so Monitor batches it as one notification). Verify the buffer-then-flush pattern doesn't leak partial writes anywhere. Look at runReaper output handling.
2. Cooldown logic: shouldFireAlertNow + lastAlertAt[key]. Race conditions? Off-by-ones at boundary? If RAM swings above and below threshold every poll, does the cooldown correctly suppress?
3. Reaper invocation: spawnSync with timeout=REAPER_TIMEOUT_MS. If a reaper hangs, what happens? Is its exit status checked? What about stderr?
4. Error swallowing: countProcess catches and returns 0 — that could mask a permanent tasklist failure (script appears healthy but is blind). Stderr logging is in place — is that enough?
5. Stale-lock detection: STALE_LOCK_MAX_AGE_MS = 5 min. findStaleGitLocks walks H:/prism* dirs + .claude/worktrees/*. Does it miss any worktree types? What about the main repo's own w
... [+235 chars truncated]

### Assistant | 2026-05-14T00:54:12.147Z

I'll review the file end-to-end.

### Assistant | 2026-05-14T00:54:12.647Z

[tool_use: Read]

### User | 2026-05-14T00:54:13.145Z

[tool_result] 1	#!/usr/bin/env node
2	// ram-zombie-watch.mjs — fleet watchdog for the Monitor tool. Single-write-per-tick.
3	// Stdout = events. Stderr = errors (captured to task output file, not the event stream).
4	//
5	// Each tick produces AT MOST ONE stdout write so Monitor sees it as one notification.
6	// Per-condition cooldown prevents alert spam — same alert won't re-emit within ALERT_COOLDOWN_MS.
7	

... [+7024 chars truncated]

### Assistant | 2026-05-14T00:54:38.131Z

## Code Quality Analysis Report — ram-zombie-watch.mjs

### 1. Single-write-per-tick — **PASS (P2 caveat)**
Line 186: one `process.stdout.write` per tick when `buf.length`. Banner (200), shutdown (191), uncaughtException (196), and `tick()` direct-call at line 201 BEFORE `setInterval` arms — banner+tick can land in the same ~200ms Monitor batch (cosmetic). `runReaper` returns a string; no stdout side-channel. Clean.

### 2. Cooldown logic — **PASS with P1 finding**
`(now - lastAlertAt[key]) > ALERT_COOLDOWN_MS` uses strict `>`, init `0` — first-fire ok. **P1**: a sustained breach is *silently suppressed* during cooldown — `cooledAlerts` only surfaces in the heartbeat line (every HB_EVERY ticks, default 30). With POLL_SEC=2, HB_EVERY=30 → silent 60s window where RAM=99% and operator sees nothing. Either (a) emit a compact `[cooled: ram=99]` line every N ticks, or (b) drop HB_EVERY to 5 when in foreground mode.

### 3. Reaper invocation — **FAIL P1**
`spawnSync` with `timeout: 30s` — on timeout, `r.status` is `null`, `r.signal` is `SIGTERM`, no error thrown. **`r.status` is never checked anywhere** (lines 112-125). A reaper that exits 1 with "(no output)" is indistinguishable from success. A timed-out reaper renders as `"(no output)"`. Fix: check `r.signal === 'SIGTERM'` → render `"timeout after 30s"`; check `r.status !== 0` → prefix `"exit=${r.status}"`. Also: `spawnSync` blocks the event loop for up to 90s (3×30s) — during which the watchdog cannot tick or respond to SIGTERM. With POLL_SEC=2 foreground intent, that's 45 missed ticks.

### 4. Error swallowing in countProcess — **FAIL P1**
`return 0` on spawn error, throw, non-zero status, OR empty stdout (line 55). Stderr logging exists but stderr is captured to a task file the operator rarely reads. **A blind watchdog will not alert when node.exe genuinely exceeds 40** — it'll happily report 0. Fix: return `null` on failure, surface `tasklist-failed` as its own alert key with cooldown.

### 5. Stale-lock detection —
... [+1560 chars truncated]
