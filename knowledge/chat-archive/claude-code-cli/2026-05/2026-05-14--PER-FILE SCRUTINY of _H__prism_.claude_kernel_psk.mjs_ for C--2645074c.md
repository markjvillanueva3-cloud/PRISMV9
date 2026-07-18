---
type: "chat-session"
source: "claude-code-cli"
session_id: "2645074c-83f3-4487-a236-8695c3e53c2c"
title: "PER-FILE SCRUTINY of `H:/prism/.claude/kernel/psk.mjs` for COMMAND-KERNEL-MS0 / "
date: "2026-05-14"
first_ts: "2026-05-14T17:27:07.881Z"
last_ts: "2026-05-14T17:28:49.575Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/2645074c-83f3-4487-a236-8695c3e53c2c/subagents/agent-aa7d7dba1d866d38c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# PER-FILE SCRUTINY of `H:/prism/.claude/kernel/psk.mjs` for COMMAND-KERNEL-MS0 / 

> **claude-code-cli** | 2026-05-14 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2645074c-83f3-4487-a236-8695c3e53c2c/subagents/agent-aa7d7dba1d866d38c.jsonl`

## Transcript

### User | 2026-05-14T17:27:07.881Z

PER-FILE SCRUTINY of `H:/prism/.claude/kernel/psk.mjs` for COMMAND-KERNEL-MS0 / U-CK01.

## Unit contract (from envelope)
- Title: "psk CLI skeleton + thin prism_session MCP action (syscall dispatch shell)"
- Scope: SHELL ONLY. U-CK01 declares the 10-syscall surface + dispatch shell. Actual semantics ship in U-CK02 (whoami/manifest/position), U-CK03 (handoff/checkin/pick), U-CK15+ (record/recommend).
- 10 declared syscalls: whoami / manifest / position / delta / tools / pick / checkin / handoff / record / recommend
- Each syscall MUST be fail-soft: returns degraded-but-usable {ok:false, ...} on any failure path, MUST NOT throw past dispatch().
- Exit conditions:
  1. `node .claude/kernel/psk.mjs --help` enumerates every declared syscall (count DERIVED from psk's own table — NOT a hardcoded literal anywhere)
  2. `prism_session:psk` MCP action round-trips a syscall via the dispatcher (so dispatch() must be importable in-process)
  3. `npx vitest run psk.test.ts` green ≥8 cases incl. fail-soft on every syscall

## Read the file end-to-end + grade

Read the WHOLE file. Then grade each axis below P0 (blocker) / P1 (must-fix this unit) / P2 (deferrable) / P3 (style):

1. **Fail-soft contract.** Walk every syscall handler + dispatch() + cliMain(). Is there any path where an exception escapes dispatch() without becoming a {ok:false, degraded:true, ...} object? Look especially at: failSoft() wrapper, syscall_whoami's nested try blocks, syscall_pick / syscall_checkin / syscall_handoff (they spawn child processes — what if execFile timeout fires? what if the helper script writes JSON-malformed stdout? what if maybeJson swallows real errors?), syscall_record's sync fs operations.

2. **Syscall-table-as-truth invariant.** Is the count "10" hardcoded ANYWHERE in this file (string, number, comment, error message)? The exit condition requires the --help count be DERIVED from listSyscalls().length. The word "10-syscall" in JSDoc is acceptable (documentation, not runtime). But any r
... [+3613 chars truncated]

### Assistant | 2026-05-14T17:27:14.102Z

I'll perform a thorough per-file scrutiny of the psk.mjs file against the U-CK01 unit contract.

### Assistant | 2026-05-14T17:27:14.194Z

[tool_use: Read]

### User | 2026-05-14T17:27:22.122Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * psk — PRISM Syscall Kernel (CLI dispatch shell)
4	 *
5	 * COMMAND-KERNEL-MS0 / U-CK01 — thin dispatch shell only. Declares the
6	 * 10-syscall surface every PRISM slash-command, hook, and MCP caller can
7	 * resolve live state through. The actual per-syscall semantics ship in
8	 * follow-on units:
9	 *   - U-CK02 fills whoami / manifest / position
10	 *   - U-CK03 
... [+24750 chars truncated]

### Assistant | 2026-05-14T17:27:31.037Z

Now let me verify a few specific concerns by reading the helpers referenced and checking for any literal "10" mentions in the file.

### Assistant | 2026-05-14T17:27:31.948Z

[tool_use: Bash]

### Assistant | 2026-05-14T17:27:33.745Z

[tool_use: Bash]

### Assistant | 2026-05-14T17:27:34.201Z

[tool_use: Bash]

### User | 2026-05-14T17:27:39.971Z

[tool_result] 6: * 10-syscall surface every PRISM slash-command, hook, and MCP caller can
25: *   literal "10" anywhere in this file (the count is derived).
95:  const timeoutMs = opts.timeoutMs ?? 10000;
99:    { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
304:  const { stdout } = await runNode(slotsScript, args, { timeoutMs: 10000 });
343:  const { stdout } = await runNode(handoffScript, args, { timeout
... [+13 chars truncated]

### User | 2026-05-14T17:27:47.025Z

[tool_result] #!/usr/bin/env node
/**
 * stable-session-id.mjs — Generates a stable session ID that persists across hook invocations
 *
 * Problem: Hooks get new PIDs each invocation, so using $PPID creates phantom sessions.
 * Solution: Generate a UUID on first invocation for this terminal window, cache it by
 *           a stable identifier (WT_SESSION, terminal title hash, or fallback to machine+time s
... [+1035 chars truncated]

### User | 2026-05-14T17:27:47.072Z

[tool_result] .claude/helpers/chat-slots.mjs
.claude/helpers/per-agent-handoff.mjs
.claude/helpers/stable-session-id.mjs
scripts/pick-unit.mjs

### Assistant | 2026-05-14T17:28:49.575Z

Good. All referenced helpers exist. Now I have full context to render the verdict.

## VERDICT

```
PASS

P0 (blockers): NONE

P1 (must-fix this unit): NONE

P2 (deferrable):
  - syscall_pick (L271): `params.json !== false` makes --json default-on, but if a caller explicitly
    passes json=false they get a no-flag invocation — fine, but the inversion is non-obvious. Consider
    `if (params.json === undefined || params.json) args.push("--json")`. Behaviorally equivalent today.
  - runNode (L94-102): on execFile error (timeout/non-zero exit), execFileAsync REJECTS — meaning
    stdout/stderr captured up to that point are lost. The wrapping failSoft() catches the throw and
    surfaces err.message, but stderr is not preserved. For the pick/checkin/handoff syscalls this means
    a child's diagnostic stderr is invisible to the caller. Fix shape: wrap runNode in its own try
    that returns {ok:false, stdout, stderr, exitCode} on error instead of throwing. Deferrable because
    failSoft still produces a structured degraded result — caller can act, just with less context.
  - syscall_record (L379) appendFileSync under concurrent /loop iterations across 6 chats: POSIX
    O_APPEND is atomic for writes ≤ PIPE_BUF (~4 KiB) but Windows NTFS append-mode atomicity is
    weaker. Each entry is ~200 bytes so torn writes are improbable but not impossible. U-CK15+ wires
    AdaptiveThresholds — when that lands, switch to an async append queue with a lock or move to the
    coord_sqlite (H8) WAL store. Flagged not blocking.
  - syscall_whoami slot-resolution (L145-150): requires caller to pass params.sessionId — won't
    auto-detect from the resolved sessionId on L131-135 (same function!). One-line fix:
    `const effSid = params.sessionId || sessionId; if (s.chatId === effSid) ...`. Currently a
    caller asking `psk whoami` with no params gets slot=null even when they ARE in a claimed slot.
    Deferrable because the JSDoc says "U-CK02 extends" and the result still includes se
... [+9305 chars truncated]
