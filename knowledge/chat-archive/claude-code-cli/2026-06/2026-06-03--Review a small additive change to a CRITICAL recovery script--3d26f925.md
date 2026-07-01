---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Review a small additive change to a CRITICAL recovery script: H:/prism/scripts/m"
date: "2026-06-03"
first_ts: "2026-06-03T01:48:24.721Z"
last_ts: "2026-06-03T01:49:59.126Z"
cwd: "H:\\prism-slot-golf"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-ac57f37a0ccb0fa1f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Review a small additive change to a CRITICAL recovery script: H:/prism/scripts/m

> **claude-code-cli** | 2026-06-03 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-ac57f37a0ccb0fa1f.jsonl`

## Transcript

### User | 2026-06-03T01:48:24.721Z

Review a small additive change to a CRITICAL recovery script: H:/prism/scripts/mcp-server-watchdog.mjs. Read the file end-to-end. The change inserts a "BOOTING guard" block immediately BEFORE the `escalate(state)` call in main() (the wedge-escalation path, after the cooldown check). It calls a shared predicate from ./lib/mcp-reconnect-action.mjs.

The guard: when `PRISM_MCP_WATCHDOG_BOOTGUARD !== "0"` (default ON), dynamic-imports {readPortLock, decideRestart, isOwnerAlive}, reads the unified port lock, computes ownerAlive via isOwnerAlive(lock.pid), calls decideRestart({healthUp:false, lock, now, ownerAlive}); if decision.state==="booting" it logs, saveState (WITHOUT resetting consecutiveFails), and process.exit(0) — skipping the kill+respawn. Wrapped in try/catch that fails OPEN (falls through to escalate on any error).

VERIFY (flag every P0/P1, grade PASS/FAIL):
1. INERT-WITHOUT-STAMP: confirm that until the supervisor writes a lock with a numeric `bootStartedAt`, decideRestart can NEVER return state==="booting" (so this change is behavior-identical to today). Trace decideRestart in ./lib/mcp-reconnect-action.mjs for lock=null and lock-without-bootStartedAt.
2. NO NEW DEADLOCK: a genuinely-wedged server must still eventually escalate. Since the guard does NOT reset consecutiveFails on defer, confirm a later watchdog run re-reaches the threshold AND once boot grace (~90s) exhausts, decideRestart returns "dead" → escalate fires. Confirm there is no input where the guard defers forever.
3. FAIL-OPEN: confirm any throw in the guard (bad import, lock read error) falls through to escalate(), so the recovery path is never disabled by the guard.
4. NO COLLATERAL: confirm the existing paths are unchanged — the healthy path, the RSS-preempt path (line ~249, which is on the probe.ok branch — does the guard correctly NOT apply there?), the cooldown skip, the saveState/exit semantics. Confirm consecutiveFails/lastEscalationAt bookkeeping is still correct on the escalate path
... [+258 chars truncated]

### Assistant | 2026-06-03T01:48:37.306Z

I'll review this change. Let me read both files end-to-end.

### Assistant | 2026-06-03T01:48:38.178Z

[tool_use: Read]

### Assistant | 2026-06-03T01:48:38.221Z

[tool_use: Read]

### User | 2026-06-03T01:48:42.084Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
4	 *
5	 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
6	 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
7	 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
8	 * it never noticed. This watchdog runs every
... [+15208 chars truncated]

### User | 2026-06-03T01:48:43.263Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+20488 chars truncated]

### Assistant | 2026-06-03T01:49:21.205Z

Both files read end-to-end. Let me trace each verification point precisely.

**Point 1 — INERT-WITHOUT-STAMP.** Tracing `decideRestart` with `healthUp:false` (always, since the guard passes `healthUp:false`):
- `bootAt = lock && Number.isFinite(lock.bootStartedAt) ? lock.bootStartedAt : null` (line 108).
- `lock=null` → `bootAt=null` → falls to line 124: `return {state:"dead", ... reason:"no-lock"}`.
- `lock` present but **no** `bootStartedAt` (or non-numeric) → `Number.isFinite(undefined/NaN)` is `false` → `bootAt=null` → line 124: `{state:"dead", reason:"no-boot-stamp"}`.
- `state==="booting"` is **only** reachable when `bootAt !== null`, i.e. requires a numeric `bootStartedAt` (lines 109, 112, 116). 

Confirmed: until the supervisor writes a numeric `bootStartedAt`, `decideRestart` can never return `"booting"`, so the guard's `if (decision.state === "booting")` (line 309) is never true → falls through to `escalate(state)` (line 320). **Behavior-identical to pre-change. PASS.**

**Point 2 — NO NEW DEADLOCK.** The defer path (lines 313-314) calls `saveState(state)` then `process.exit(0)` **without** resetting `consecutiveFails`. So `consecutiveFails` stays `≥ FAIL_THRESHOLD`. Next watchdog run: probe fails again → `consecutiveFails++` (line 271, now even higher) → re-enters the `>= FAIL_THRESHOLD` block (line 280). Cooldown check (line 284-290): `lastEscalationAt` was **not** stamped on defer, so `sinceLastEsc` keeps growing — cooldown does not re-arm and won't trap it. Then the guard re-runs: `decideRestart` returns `"booting"` only while `bootAgeMs < bootGraceMs` (line 113). Once `bootAgeMs ≥ bootGraceMs` (90s), line 119 returns `{state:"dead", reason:"boot-grace-exhausted"}` → guard doesn't defer → `escalate` fires.

Additionally, a confirmed-dead owner short-circuits even within grace: `ownerAlive===false` → line 115 returns `"dead"` immediately. The guard computes `ownerAlive` via `isOwnerAlive(lock.pid)` (line 307) and passes it (line 308). So a crash-during-
... [+3436 chars truncated]

### Assistant | 2026-06-03T01:49:22.333Z

[tool_use: Grep]

### User | 2026-06-03T01:49:26.436Z

[tool_result] 105:export function decideRestart({ healthUp, lock, now, env = process.env, bootGraceMs = resolveBootGraceMs(env), ownerAlive } = {}) {
161:export function readPortLock(lockPath = DEFAULT_PORT_LOCK_PATH, opts = {}) {
190:export function isOwnerAlive(pid, opts = {}) {

### Assistant | 2026-06-03T01:49:59.126Z

All three named exports confirmed present: `decideRestart` (line 105), `readPortLock` (line 161), `isOwnerAlive` (line 190) — exactly matching the destructure at watchdog line 305.

**Point 6 — Stubs / magic numbers / silent-failure smells.**
- No stubs or placeholder returns. The guard does real work; `decideRestart` is a real three-state predicate with documented branches.
- **Magic numbers:** the guard inlines no constants — `bootGraceMs` defaults via `resolveBootGraceMs(env)` inside `decideRestart`, not hardcoded at the call site (watchdog line 308 passes only `healthUp/lock/now/ownerAlive`, letting the lib own the 90s grace + 1000ms floor). The lib's `BOOT_GRACE_MS = 90000` (line 82) and `1000` floor (line 87) are named/documented. Clean.
- **Silent-failure smell — one P2 (non-blocking):** the fail-OPEN catch (line 316) logs at `"warn"` and falls through. That is the *intended* contract (fail-open is louder-safe than fail-closed here), so it is correct, not a smell. The only subtlety: `readPortLock` is itself fail-soft (returns `null` on garbage rather than throwing), so a corrupt lock file does NOT hit the catch — it flows through `decideRestart(lock=null-ish)` → `"dead"` → escalate. That is the desired fail-open outcome, just via a different route than the catch. Worth noting but behavior-correct.
- **ownerAlive guard** (line 307): `lock && Number.isInteger(lock.pid) ? isOwnerAlive(lock.pid) : undefined` — correctly avoids passing a non-integer pid; `isOwnerAlive` would also defensively return `undefined` for a bad pid (line 191), so this is belt-and-suspenders, not a bug. `undefined` ownerAlive within grace → BOOTING (defer, bounded) per the lib's documented contract (lines 102-104).

No P0/P1 findings on any of the six axes.

---

## Code Quality Analysis Report

### Summary
- Files analyzed: 2 (`H:/prism/scripts/mcp-server-watchdog.mjs`, `H:/prism/scripts/lib/mcp-reconnect-action.mjs`)
- The change: a try/catch-wrapped BOOTING-guard block at `mcp-server-wa
... [+4062 chars truncated]
