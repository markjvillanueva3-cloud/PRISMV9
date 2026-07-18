---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7"
title: "RE-REVIEW of the FINAL state of a new PRISM UserPromptSubmit advisory hook. Your"
date: "2026-06-18"
first_ts: "2026-06-18T13:52:09.798Z"
last_ts: "2026-06-18T13:54:15.316Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 15
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-aa11e93ae8f49a574.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# RE-REVIEW of the FINAL state of a new PRISM UserPromptSubmit advisory hook. Your

> **claude-code-cli** | 2026-06-18 | 39 msgs (15 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-aa11e93ae8f49a574.jsonl`

## Transcript

### User | 2026-06-18T13:52:09.798Z

RE-REVIEW of the FINAL state of a new PRISM UserPromptSubmit advisory hook. Your prior pass FAILed it on ONE P1: the hook was an orphan (header claimed "Wired:" but 0 refs in settings.json). That has been fixed. Read END-TO-END and re-grade:
- H:/prism/.claude/hooks/fleet-survival-advisory.mjs
- H:/prism/.claude/hooks/fleet-survival-advisory.test.mjs

CONFIRM THE P1 FIX:
- grep `fleet-survival-advisory.mjs` in `C:/Users/wompu/.claude/settings.json` AND `H:/.claude/settings.json` — expect exactly 1 ref EACH (it is wired into the UserPromptSubmit advisory band right after `critical-memory-compact-nudge.mjs`, timeout 3000). The header line "Wired: .claude/settings.json UserPromptSubmit chain (advisory)" must now be TRUE.

ALSO RE-CHECK (delta since first pass):
- A new exported `computeAdvisory` orchestration fn + a `stampKeyOf` helper were added; `main()` now delegates to `computeAdvisory` with injected IO. Confirm the refactor preserved behavior (same gating, same emitContinue contract, same fail-soft).
- New orchestration tests (24 total) cover the cost-control gate (within-interval skip does not compute), stamp round-trip, cooldown preservation, and fail-soft throw. Are these real intent-asserting tests (R9), not stubs?
- Re-confirm the hook is still non-duplicative (distinct 5h-account-limit axis), message never instructs bypassing the operator-gated RED-gate, and conventions still match the sibling.

Your prior P2s (no compute timeout; no main() orchestration test) — note which are now resolved vs still open/defer-able.

Grade PASS or FAIL with P0/P1/P2 + file:line. Concise — findings only.

### Assistant | 2026-06-18T13:52:13.622Z

I'll re-review the final state of this hook. Let me start by reading both files end-to-end and confirming the wiring.

### Assistant | 2026-06-18T13:52:14.567Z

[tool_use: Read]

### Assistant | 2026-06-18T13:52:14.643Z

[tool_use: Read]

### User | 2026-06-18T13:52:15.184Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\fleet-survival-advisory.mjs' was already read 7s ago in this session and is unchanged (mtime 1781790631048). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T13:52:15.417Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\fleet-survival-advisory.test.mjs' was already read 7s ago in this session and is unchanged (mtime 1781790680838). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-18T13:52:19.267Z

The read-once guard claims I read these 7s ago, but they are NOT in my context — this is a fresh agent thread. The guard's tracking is stale. Let me bypass it.

### Assistant | 2026-06-18T13:52:19.748Z

[tool_use: Read]

### Assistant | 2026-06-18T13:52:19.998Z

[tool_use: Read]

### User | 2026-06-18T13:52:20.222Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\fleet-survival-advisory.mjs' was already read 12s ago in this session and is unchanged (mtime 1781790631048). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T13:52:20.449Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\fleet-survival-advisory.test.mjs' was already read 12s ago in this session and is unchanged (mtime 1781790680838). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-18T13:52:23.765Z

The guard keeps blocking. Let me disable the read cache via the documented env knob and read the files with Bash, which gives me the raw content I need.

### Assistant | 2026-06-18T13:52:24.724Z

[tool_use: Bash]

### User | 2026-06-18T13:52:28.171Z

[tool_result] #!/usr/bin/env node
// tier: T2
/**
 * fleet-survival-advisory.mjs -- UserPromptSubmit advisory that proactively
 * surfaces the 5h-session-limit SURVIVAL verdict at the moment it is actionable.
 *
 * THE GAP. scripts/fleet-survival-status.mjs composes the three survival signals
 * (5h proximity + account-switch preflight + armed-flag) into one GO/NO-GO
 * verdict -- "will the fleet survive the ne
... [+10841 chars truncated]

### Assistant | 2026-06-18T13:52:31.254Z

The .mjs file is now fully read. The error-triage reminder is a false positive (no test ran). Now let me read the test file and confirm the wiring in both settings.json files.

### Assistant | 2026-06-18T13:52:32.193Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:52:33.618Z

[tool_use: Grep]

### Assistant | 2026-06-18T13:52:34.624Z

[tool_use: Grep]

### User | 2026-06-18T13:52:37.235Z

[tool_result] // Tests for fleet-survival-advisory.mjs -- the proactive UserPromptSubmit
// advisory that surfaces the 5h-limit survival verdict ONLY when actionable
// (fleet WILL block AND proximity has climbed into warn/critical), throttled.
// R9: each test fails if the gating/throttle logic changes.
//
// Run directly:  node .claude/hooks/fleet-survival-advisory.test.mjs   (node:test auto-runs)
import { te
... [+11212 chars truncated]

### User | 2026-06-18T13:52:38.889Z

[tool_result] 1539-            "timeout": 3000
1540-          },
1541-          {
1542-            "type": "command",
1543:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/fleet-survival-advisory.mjs",
1544-            "timeout": 3000
1545-          },
1546-          {
1547-            "type": "command",

### User | 2026-06-18T13:52:39.191Z

[tool_result] 1539-            "timeout": 3000
1540-          },
1541-          {
1542-            "type": "command",
1543:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/fleet-survival-advisory.mjs",
1544-            "timeout": 3000
1545-          },
1546-          {
1547-            "type": "command",

### Assistant | 2026-06-18T13:52:42.994Z

Both settings.json files show exactly 1 ref each at line 1543, with timeout 3000. Let me verify the count is exactly 1 (not more) in each file, and confirm it sits right after `critical-memory-compact-nudge.mjs` as claimed.

### Assistant | 2026-06-18T13:52:45.312Z

[tool_use: Bash]

### User | 2026-06-18T13:52:48.958Z

[tool_result] === C: count ===
1
=== H: count ===
1
=== C: preceding command (UserPromptSubmit band context) ===
1538:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/critical-memory-compact-nudge.mjs",
1543:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/fleet-survival-advisory.mjs",
=== H: preceding ===
1538:            "command": "\"H:/.claude/bi
... [+191 chars truncated]

### Assistant | 2026-06-18T13:52:52.624Z

Wiring confirmed: exactly 1 ref each, right after `critical-memory-compact-nudge.mjs`, timeout 3000. Let me confirm it's actually inside the UserPromptSubmit block (not some other event) and that the underlying `runSurvivalStatus` export exists.

### Assistant | 2026-06-18T13:52:55.363Z

[tool_use: Bash]

### User | 2026-06-18T13:52:58.968Z

[tool_result] === which event block contains line 1543 (C:) ===
896:    "PreToolUse": [
1292:    "UserPromptSubmit": [
=== runSurvivalStatus export check ===
109:export function runSurvivalStatus({
117:  if (!Number.isFinite(nowMs)) throw new Error("runSurvivalStatus: nowMs (finite epoch ms) is required");
140:  const r = runSurvivalStatus({ nowMs: Date.now() });

### Assistant | 2026-06-18T13:53:03.328Z

Confirmed: line 1543 is inside the `UserPromptSubmit` block (which opens at 1292, after PreToolUse closes). The imported `runSurvivalStatus` is a real export at `fleet-survival-status.mjs:109`. Let me verify the `nowMs` contract alignment — the hook calls `survivalFn({ nowMs })` and `runSurvivalStatus` requires a finite `nowMs`. Let me also confirm the underlying script's `runSurvivalStatus` signature and that `Date.now()` is passed correctly, plus run the tests.

### Assistant | 2026-06-18T13:53:04.348Z

[tool_use: Read]

### User | 2026-06-18T13:53:05.241Z

[tool_result] 100	export function readArmed(env = process.env) {
101	  return env[ARMED_ENV] === "1";
102	}
103	
104	/**
105	 * Compose the live survival report. Read-only. Each signal is fail-soft: if a
106	 * dependency throws, that leg degrades (live -> null proximity; preflight -> null ->
107	 * a blocker) but the verdict is still produced. Injectable for tests.
108	 */
109	export function runSurvivalStatus
... [+1574 chars truncated]

### Assistant | 2026-06-18T13:53:05.430Z

[tool_use: Bash]

### User | 2026-06-18T13:53:08.881Z

[tool_result]   ...
# Subtest: computeAdvisory: interval elapsed + actionable + cooldown clear -> NUDGE, lastNudgeMs=now
ok 22 - computeAdvisory: interval elapsed + actionable + cooldown clear -> NUDGE, lastNudgeMs=now
  ---
  duration_ms: 0.1152
  ...
# Subtest: computeAdvisory: actionable but within cooldown -> no nudge, lastCheckMs still refreshed
ok 23 - computeAdvisory: actionable but within cooldown -> no
... [+404 chars truncated]

### Assistant | 2026-06-18T13:53:15.009Z

All 24 tests pass. Let me verify the `survivalFn({ nowMs })` contract alignment carefully: in `main()`, the hook injects `survivalFn: runSurvivalStatus` and `computeAdvisory` calls `survivalFn({ nowMs })`. `runSurvivalStatus` requires a finite `nowMs` — `main()` passes `Date.now()`, which is finite. Good. Let me also confirm the hook actually runs end-to-end as a real process (not just unit-tested) to verify the fail-soft and emitContinue contract live.

### Assistant | 2026-06-18T13:53:19.681Z

[tool_use: Bash]

### User | 2026-06-18T13:53:34.700Z

[tool_result] === live invocation (real transcript scan) ===
{"continue":true}
=== exit: 0 ===
=== DISABLE knob ===
{"continue":true}
=== empty stdin (no payload) ===
{"continue":true}

### Assistant | 2026-06-18T13:53:39.785Z

Live invocation confirms `{"continue":true}` in all three modes (real scan, disabled, empty stdin) — the emitContinue contract holds and never blocks. The first invocation scanned a real transcript and stayed silent (fleet is currently survivable or proximity ok), proving the live path works end-to-end.

Let me confirm one last delta-check: that the stamp write uses the sanitized `stampKeyOf` consistently and that there's no path-traversal risk in the stamp filename (untrusted `session_id` flows into a filename).

### Assistant | 2026-06-18T13:53:43.214Z

[tool_use: Bash]

### User | 2026-06-18T13:53:46.393Z

[tool_result] === adversarial session_id (path traversal attempt in filename) ===
stampKey for traversal sid: "claude-"
stampKey for null: "unknown"
stampKey for slash sid: "claude-abcdef"

### Assistant | 2026-06-18T13:54:15.316Z

Path-traversal is neutralized: `stampKeyOf` strips everything except `[a-z0-9-]`, so `../../../etc/passwd-aaaaaaaa` (which `stableIdFromPayload` first truncates to `claude-../../../` then the sanitizer strips) collapses to a safe `claude-` key. No traversal reaches the filename. (Note the leading 8 chars `../../../` of that sid become `claude-` + first-8 = `claude-../../..` then sanitized to `claude-` — safe.)

I have everything I need. Full re-review complete.

---

VERDICT: PASS

summary: The sole P1 from the prior pass (orphan hook) is FIXED — `fleet-survival-advisory.mjs` is now wired exactly once into the UserPromptSubmit chain in both `C:/Users/wompu/.claude/settings.json:1543` and `H:/.claude/settings.json:1543`, immediately after `critical-memory-compact-nudge.mjs`, timeout 3000, inside the verified UserPromptSubmit block (opens C:1292). The header line "Wired: .claude/settings.json UserPromptSubmit chain (advisory)" is now TRUE. The `computeAdvisory`/`stampKeyOf` refactor preserved behavior (same gating, same `{continue:true}` contract, same fail-soft), the 24 tests are real intent-asserting tests, and live invocation in three modes plus an adversarial path-traversal check all pass.

findings:
- none (P0/P1)

What I verified (auditable):
- WIRING (P1 fix confirmed): `grep -c` = exactly 1 in each settings.json; both at line 1543; both `\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/fleet-survival-advisory.mjs` timeout 3000; sits at 1543 directly after `critical-memory-compact-nudge.mjs` (1538); event-block check confirms it is within `UserPromptSubmit` (1292), not another event. Header claim now matches reality.
- REFACTOR PRESERVED BEHAVIOR: `main()` (`fleet-survival-advisory.mjs:222-251`) delegates to `computeAdvisory` with injected `readStampFn`/`writeStampFn`/`survivalFn`, then `emitContinue(result.additionalContext || undefined)`. `computeAdvisory:185-211` runs the cheap `shouldRunCheck` gate BEFORE `survivalFn` (cost-control intact), wraps `su
... [+2919 chars truncated]
