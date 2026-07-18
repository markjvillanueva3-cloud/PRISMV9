---
type: "chat-session"
source: "claude-code-cli"
session_id: "7efaddb4-e737-4637-939f-3d15ea0c2610"
title: "Build the auto-fire wiring for PRISM's account-switch coordinator. The coordinat"
date: "2026-06-15"
first_ts: "2026-06-15T05:16:37.557Z"
last_ts: "2026-06-15T05:22:34.903Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 9
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-a46234e37f38266a2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Build the auto-fire wiring for PRISM's account-switch coordinator. The coordinat

> **claude-code-cli** | 2026-06-15 | 19 msgs (9 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-a46234e37f38266a2.jsonl`

## Transcript

### User | 2026-06-15T05:16:37.557Z

Build the auto-fire wiring for PRISM's account-switch coordinator. The coordinator already exists and works; nothing auto-triggers it. Create exactly 3 files + run the test. Cite nothing external — the full design is below. Do NOT modify any other files.

CONTEXT (already verified, do not re-investigate):
- `H:/prism/scripts/account-switch-restart-coordinator.mjs` exports `async runCoordinator(opts)`. Relevant opts: `{fallbackLive:true, autoSwap:true, apply:boolean, selfSlot:string|null}`. It returns `{switched, fiveHourPct, threshold, source, reason, autoSwap, swap, restartPlan, advisory}`. It THROWS an Error with `.code==="FIVE_HOUR_SOURCE_UNAVAILABLE"` when no 5h trigger is calibrated (this is the EXPECTED "not armed yet" state, NOT a real error — the host doesn't emit rate_limits.five_hour, so a switch decision needs env `PRISM_5H_WEIGHTED_TOKEN_TRIGGER` set).
- The coordinator's `--apply` actuates BOTH the credential swap AND a staggered fleet restart — heavy. Must be OFF by default.

FILE 1 — `H:/prism/scripts/account-switch-monitor.mjs` (the cron-callable auto-trigger wrapper):
Header comment: explains it closes the operator gap (2026-06-15) "auto-switch accounts at 90% session limit" by being the thing a scheduled task runs every N minutes — the coordinator does DETECT→DECIDE(90%)→SWITCH→RESTART but nothing auto-fired it. SAFETY: real actuation (--apply) is OFF unless env `PRISM_ACCT_SWITCH_AUTO_APPLY=1`; default = dry-run (detect + advise, no swap, no restart). So installing the cron does nothing risky until the operator (a) captures ≥2 accounts, (b) calibrates `PRISM_5H_WEIGHTED_TOKEN_TRIGGER`, (c) sets the apply knob.
Export these PURE functions (no I/O) + unit-test them:
- `applyEnabled(env=process.env)` → `env.PRISM_ACCT_SWITCH_AUTO_APPLY === "1"`.
- `shapeRecord(res, {apply, at, error})` → if `error`: `{at, status: error.code==="FIVE_HOUR_SOURCE_UNAVAILABLE" ? "not-armed" : "error", apply, code: error.code||"error", message: String(error.message||error
... [+3105 chars truncated]

### Assistant | 2026-06-15T05:16:41.334Z

I'll read the existing coordinator and the galaxy-knowledge cron install script first to understand the patterns, then build the 3 files.

### Assistant | 2026-06-15T05:16:41.725Z

[tool_use: Read]

### Assistant | 2026-06-15T05:16:42.034Z

[tool_use: Read]

### User | 2026-06-15T05:16:43.049Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * account-switch-restart-coordinator.mjs — the TIE between the 90%-of-5h-limit
4	 * signal and the staggered, token-gated fleet restart (slot:bravo, hermes-zulu).
5	 *
6	 * THE LOOSE END THIS CLOSES (the operator ask):
7	 *   "switch accounts when an account hits 90% of its 5-hour usage limit, then
8	 *    STAGGER-restart the chats — waiting for each restarted chat's
... [+3471 chars truncated]

### User | 2026-06-15T05:16:44.082Z

[tool_result] 1	# install-galaxy-knowledge-cron.ps1
2	# FLEET-KNOWLEDGE-MAX / U-ZKM-ITERATE -- register a Windows Scheduled Task that drives the
3	# fleet knowledge-accretion loop (scripts/galaxy-knowledge-iterate.mjs) unattended + REAPER-IMMUNE.
4	#
5	# WHY (slot:zulu 2026-06-14): operator goal = "loop EVERY galaxy >=10x each, extracting reputable
6	# external sources, until physically impossible (no more repu
... [+5686 chars truncated]

### Assistant | 2026-06-15T05:16:47.915Z

Now I have all the context needed. Writing all 3 files in parallel.

### Assistant | 2026-06-15T05:17:24.761Z

[tool_use: Write]

### User | 2026-06-15T05:17:30.253Z

[tool_result] File created successfully at: H:/prism/scripts/account-switch-monitor.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-15T05:17:45.215Z

[tool_use: Write]

### User | 2026-06-15T05:17:53.022Z

[tool_result] File created successfully at: H:/prism/scripts/account-switch-monitor.test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-15T05:18:29.605Z

[tool_use: Write]

### User | 2026-06-15T05:18:33.222Z

[tool_result] File created successfully at: H:/prism/.claude/helpers/install-account-switch-monitor-cron.ps1 (file state is current in your context — no need to Read it back)

### User | 2026-06-15T05:20:12.242Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   The user requested creation of exactly 3 files to add auto-fire wiring for PRISM's existing `account-switch-restart-coordinator.mjs`. The coordinator already works but nothing auto-triggers it. The task is:
   - FILE 1: `H:/prism/scripts/account-switch-monitor.mjs` — a cron-callable wrapper that calls the coordinator, shapes a result record, appends it to a JSONL log, and always exits 0
   - FILE 2: `H:/prism/scripts/account-switch-monitor.test.mjs` — node:test unit tests for the pure exported functions
   - FILE 3: `H:/prism/.claude/helpers/install-account-switch-monitor-cron.ps1` — a Windows Scheduled Task installer cloning the structure of `install-galaxy-knowledge-cron.ps1`
   - After writing all 3: run the test with `node --test scripts/account-switch-monitor.test.mjs` from `H:/prism` and report results
   - CONSTRAINT: Do NOT modify any other files

2. Key Technical Concepts:
   - `runCoordinator(opts)` from `./account-switch-restart-coordinator.mjs` — async, opts `{fallbackLive:true, autoSwap:true, apply:boolean, selfSlot:string|null}`, returns `{switched, fiveHourPct, threshold, source, reason, autoSwap, swap, restartPlan, advisory}`, THROWS `Error` with `.code==="FIVE_HOUR_SOURCE_UNAVAILABLE"` when not armed (expected state, NOT a real error)
   - Safety gate: `PRISM_ACCT_SWITCH_AUTO_APPLY=1` env var must be explicitly set for real actuation; default is dry-run (detect + advise only, no swap, no restart)
   - Pure exported functions (no I/O) for unit testability: `applyEnabled(env)` and `shapeRecord(res, {apply, at, error})`
   - Run-as-main guard pattern: `path.basename(process.argv[1]||"")==="account-switch-monitor.mjs"`
   - JSONL append pattern: one JSON line per cron tick to `state/shared/account-switch-monitor.jsonl`
   - `PRISM_ROOT` env var (default `"H:/pr
... [+7560 chars truncated]

### Assistant | 2026-06-15T05:20:39.178Z

Now running the test:

### Assistant | 2026-06-15T05:20:40.569Z

[tool_use: Bash]

### User | 2026-06-15T05:20:54.805Z

[tool_result] TAP version 13
# Subtest: applyEnabled: "1" returns true
ok 1 - applyEnabled: "1" returns true
  ---
  duration_ms: 1.2541
  ...
# Subtest: applyEnabled: "0" returns false
ok 2 - applyEnabled: "0" returns false
  ---
  duration_ms: 0.0885
  ...
# Subtest: applyEnabled: empty string returns false
ok 3 - applyEnabled: empty string returns false
  ---
  duration_ms: 0.0592
  ...
# Subtest: applyEnabl
... [+1491 chars truncated]

### User | 2026-06-15T05:22:15.606Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   The user requested creation of exactly 3 files to add auto-fire wiring for PRISM's existing `account-switch-restart-coordinator.mjs`. The coordinator already works but nothing auto-triggers it. Task:
   - FILE 1: `H:/prism/scripts/account-switch-monitor.mjs` — cron-callable wrapper that calls the coordinator, shapes a result record, appends to a JSONL log, and always exits 0
   - FILE 2: `H:/prism/scripts/account-switch-monitor.test.mjs` — node:test unit tests for the pure exported functions
   - FILE 3: `H:/prism/.claude/helpers/install-account-switch-monitor-cron.ps1` — Windows Scheduled Task installer cloning `install-galaxy-knowledge-cron.ps1`
   - After writing all 3: run `node --test scripts/account-switch-monitor.test.mjs` from `H:/prism` and report results
   - CONSTRAINT: Do NOT modify any other files.

   Security-relevant constraints (preserved verbatim):
   - "SAFETY: real actuation (--apply) is OFF unless env `PRISM_ACCT_SWITCH_AUTO_APPLY=1`; default = dry-run (detect + advise, no swap, no restart). So installing the cron does nothing risky until the operator (a) captures >=2 accounts, (b) calibrates `PRISM_5H_WEIGHTED_TOKEN_TRIGGER`, (c) sets the apply knob."
   - "Do NOT modify any other files."

2. Key Technical Concepts:
   - `runCoordinator(opts)` from `./account-switch-restart-coordinator.mjs` — async, opts: `{fallbackLive:true, autoSwap:true, apply:boolean, selfSlot:string|null}`, returns `{switched, fiveHourPct, threshold, source, reason, autoSwap, swap, restartPlan, advisory}`, THROWS `Error` with `.code==="FIVE_HOUR_SOURCE_UNAVAILABLE"` when not armed (expected state, NOT a real error)
   - Safety gate: `PRISM_ACCT_SWITCH_AUTO_APPLY=1` env var must be explicitly set for real actuation; default is dry-run
   - Pure exported functions (no I/O) for unit 
... [+8588 chars truncated]

### Assistant | 2026-06-15T05:22:34.903Z

11/11 pass, 0 fail, 0 skip. Duration 102ms.

Summary of what was built and verified:

**FILE 1** — `H:/prism/scripts/account-switch-monitor.mjs`: cron-callable wrapper that dynamically imports `runCoordinator`, gates actuation on `PRISM_ACCT_SWITCH_AUTO_APPLY=1`, normalises the result via `shapeRecord`, appends to `state/shared/account-switch-monitor.jsonl`, and always exits 0. The `FIVE_HOUR_SOURCE_UNAVAILABLE` throw from the coordinator produces `status:"not-armed"` — not a crash.

**FILE 2** — `H:/prism/scripts/account-switch-monitor.test.mjs`: 11 node:test cases covering both pure exports with no I/O — all 11 pass clean in 102ms.

**FILE 3** — `H:/prism/.claude/helpers/install-account-switch-monitor-cron.ps1`: Windows Scheduled Task installer (clone of `install-galaxy-knowledge-cron.ps1`), `TaskName="PRISM Account Switch Monitor"`, default every 10 min, portable node resolution, MultipleInstances IgnoreNew, -AsSystem/-RunNow/-Uninstall flags, prints the 3 operator prerequisites before apply is meaningful.

No other files were modified.
