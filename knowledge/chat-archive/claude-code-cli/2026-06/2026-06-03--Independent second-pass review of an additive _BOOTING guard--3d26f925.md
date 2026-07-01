---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Independent second-pass review of an additive \"BOOTING guard\" added to H:/prism/"
date: "2026-06-03"
first_ts: "2026-06-03T01:48:37.417Z"
last_ts: "2026-06-03T01:51:06.009Z"
cwd: "H:\\prism-slot-golf"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a9ddb377994f98e5c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Independent second-pass review of an additive "BOOTING guard" added to H:/prism/

> **claude-code-cli** | 2026-06-03 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a9ddb377994f98e5c.jsonl`

## Transcript

### User | 2026-06-03T01:48:37.417Z

Independent second-pass review of an additive "BOOTING guard" added to H:/prism/scripts/mcp-server-watchdog.mjs (read it fully). This watchdog runs every 5 min; on 2 consecutive /health failures it KILLS the :3100 listener PID (taskkill) and respawns the supervisor. The new guard, inserted right before `escalate(state)`, defers that kill when a shared predicate decideRestart() (from ./lib/mcp-reconnect-action.mjs) reports the server is "booting" (fresh bootStartedAt in the unified port lock + live owner PID). Goal: stop the watchdog from killing a server that's still in its ~50s cold boot (the "boot-reset flap").

Weight your review on what a control-flow reviewer might MISS:
1. SEMANTIC: does deferring on "booting" genuinely fix the flap in the REAL scenario (supervisor respawned a server; it's mid-boot; watchdog run sees /health down)? AND does it correctly NOT defer a truly-wedged server (listening but unresponsive, no fresh boot stamp)? Reason about the actual runtime: the supervisor (a LATER step, not yet shipped) will stamp bootStartedAt at spawn. Until then the lock has no stamp — is the change truly inert? Is "default ON before the producer (supervisor stamp) exists" safe, or a latent footgun when the stamp later appears?
2. FALSE-DEFER RISK: could the guard ever defer killing a server that SHOULD be killed — e.g. a wedged server whose lock still carries a stale-but-recent bootStartedAt from a prior boot + a coincidentally-alive PID (PID reuse)? Walk that path through decideRestart; is the ~90s grace + ownerAlive enough, or is PID-reuse a real hole here?
3. consecutiveFails is intentionally NOT reset on defer (so a wedged server still escalates later). Confirm that's correct and won't cause unbounded growth or a missed escalation. Does lastEscalationAt staying unstamped on defer interact badly with the cooldown logic on the next run?
4. Is default-ON (PRISM_MCP_WATCHDOG_BOOTGUARD !== "0") the right default given the producer isn't wired yet? Argue for/agains
... [+428 chars truncated]

### Assistant | 2026-06-03T01:49:00.908Z

I'll review the BOOTING guard change. Let me read the watchdog file and the shared predicate library.

### Assistant | 2026-06-03T01:49:01.214Z

[tool_use: Read]

### User | 2026-06-03T01:49:03.679Z

[tool_result] read-once-guard: 'H:\prism\scripts\mcp-server-watchdog.mjs' was already read 23s ago in this session and is unchanged (mtime 1780451249115). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-03T01:49:07.068Z

The read-once guard says the content is already in my context, but I don't actually have the file content. Let me read it with explicit parameters to bypass.

### Assistant | 2026-06-03T01:49:07.538Z

[tool_use: Bash]

### User | 2026-06-03T01:49:19.315Z

[tool_result] #!/usr/bin/env node
/**
 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
 *
 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
 * it never noticed. This watchdog runs every 5 min as a sepa
... [+13987 chars truncated]

### Assistant | 2026-06-03T01:49:22.163Z

Now let me read the shared predicate library to understand `decideRestart`, `readPortLock`, and `isOwnerAlive`.

### Assistant | 2026-06-03T01:49:22.359Z

[tool_use: Read]

### User | 2026-06-03T01:49:25.399Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+20488 chars truncated]

### Assistant | 2026-06-03T01:49:29.058Z

Now I have both files fully. Let me verify two things: whether the watchdog probe's "healthUp" semantics match what `decideRestart` expects, and whether the supervisor actually stamps `bootStartedAt` and writes to the same lock path the guard reads.

### Assistant | 2026-06-03T01:49:31.726Z

[tool_use: Bash]

### User | 2026-06-03T01:49:41.506Z

[tool_result] 0 matches for 'bootStartedAt\|writePortLock\|DEFAULT_PORT_LOCK_PATH\|mcp-server-3100.lock\|readPortLock'
---EXISTS---
supervisor present
---LOCKFILE---
port-lock absent

### Assistant | 2026-06-03T01:51:06.009Z

This confirms the critical fact stated in the change comment: the supervisor does NOT yet stamp `bootStartedAt`, and the port lock file does not exist. The guard is currently inert in practice. Let me confirm the probe path's `healthUp` mapping and verify the `escalate()` insertion point matches what was described — and check the netstat→find PID path semantics for the wedged-server case.

The change description says the guard passes `healthUp: false` unconditionally. Let me look at exactly how that's used inside the failure branch and trace the runtime scenarios.

I now have everything needed. Let me reason through each weighted dimension.

**Trace of the guard at the insertion point** (failure branch, `consecutiveFails >= FAIL_THRESHOLD`, past the cooldown check):
- Calls `readPortLock()` → reads `.mcp-server-3100.lock` (currently absent → `null`).
- `ownerAlive` = `lock && Number.isInteger(lock.pid) ? isOwnerAlive(lock.pid) : undefined` → with `lock=null`, short-circuits to `undefined`.
- `decideRestart({ healthUp: false, lock: null, now, ownerAlive: undefined })`. In `decideRestart`: `healthUp` false → not healthy; `bootAt = null` (no lock) → falls to final `return { state: "dead", ... reason: "no-lock" }`.
- `decision.state === "booting"` is false → falls through to `escalate(state)`. Behavior-identical to before. **Confirmed inert today.**

Now the weighted analysis.

## Findings

### 1. SEMANTIC — does deferring on "booting" fix the real flap, and correctly NOT defer a wedged server?

**The fix is semantically sound for the intended scenario — once the producer exists.** When the supervisor (future step 4) stamps a fresh `bootStartedAt` at spawn with a live owner PID, a watchdog run that sees `/health` down during the ~50s cold boot will call `decideRestart` → `bootAgeMs < 90000` and `ownerAlive !== false` → `state:"booting"` → defer. That is exactly the flap the change targets, and it correctly avoids the destructive kill.

**Wedged-server case is correctly 
... [+13312 chars truncated]
