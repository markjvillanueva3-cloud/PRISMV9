---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7"
title: "RE-REVIEW (second pass) of the FINAL state of a UserPromptSubmit hook after fixe"
date: "2026-06-18"
first_ts: "2026-06-18T13:52:01.327Z"
last_ts: "2026-06-18T13:53:14.150Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-ad1d8f99b1c7b5351.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# RE-REVIEW (second pass) of the FINAL state of a UserPromptSubmit hook after fixe

> **claude-code-cli** | 2026-06-18 | 24 msgs (10 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-ad1d8f99b1c7b5351.jsonl`

## Transcript

### User | 2026-06-18T13:52:01.327Z

RE-REVIEW (second pass) of the FINAL state of a UserPromptSubmit hook after fixes. Read END-TO-END:
- H:/prism/.claude/hooks/fleet-survival-advisory.mjs
- H:/prism/.claude/hooks/fleet-survival-advisory.test.mjs

Since the first pass, two changes landed:
1. The hook is now WIRED — confirm by checking it appears in the UserPromptSubmit chain of BOTH `C:/Users/wompu/.claude/settings.json` AND `H:/.claude/settings.json` (grep for `fleet-survival-advisory.mjs`; expect exactly 1 ref each, in the advisory band near `critical-memory-compact-nudge.mjs`).
2. `main()` was refactored to delegate to a new exported pure-orchestration fn `computeAdvisory({payload,nowMs,readStampFn,writeStampFn,survivalFn,cooldownMs,checkMs})` with INJECTED stamp IO + survival fn, and new tests were added (24 total now).

VERIFY:
- The cheap check-interval gate in `computeAdvisory` still runs BEFORE `survivalFn` (a within-interval prompt must never call the expensive survival compute). Is this now actually tested? (look for the test that injects a throwing survivalFn and asserts it is not called)
- The non-nudge path still persists `lastCheckMs` (so we don't recompute every prompt) while PRESERVING `lastNudgeMs` (a non-nudge must not reset the cooldown clock). Tested?
- `main()` correctly wires real readStamp/writeStamp (keyed stampKey -> file) and `runSurvivalStatus` into `computeAdvisory`, and still always emits `{continue:true}`.
- No regression vs the first pass (fail-soft on throw, invokedAsHook guard, no top-level IO in the import chain).
- The 24 tests bite on real mutations (R9), no weakened asserts.

Grade PASS or FAIL with P0/P1 + file:line. Concise — findings only.

### Assistant | 2026-06-18T13:52:06.910Z

I'll review the final state of this hook end-to-end. Let me start by reading both files and checking the wiring.

### Assistant | 2026-06-18T13:52:07.388Z

[tool_use: Read]

### Assistant | 2026-06-18T13:52:07.879Z

[tool_use: Read]

### User | 2026-06-18T13:52:08.352Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * fleet-survival-advisory.mjs -- UserPromptSubmit advisory that proactively
5	 * surfaces the 5h-session-limit SURVIVAL verdict at the moment it is actionable.
6	 *
7	 * THE GAP. scripts/fleet-survival-status.mjs composes the three survival signals
8	 * (5h proximity + account-switch preflight + armed-flag) into one GO/NO-GO
9	 * verdict -- "will the fl
... [+11778 chars truncated]

### Assistant | 2026-06-18T13:52:08.858Z

[tool_use: Grep]

### User | 2026-06-18T13:52:08.955Z

[tool_result] 1	// Tests for fleet-survival-advisory.mjs -- the proactive UserPromptSubmit
2	// advisory that surfaces the 5h-limit survival verdict ONLY when actionable
3	// (fleet WILL block AND proximity has climbed into warn/critical), throttled.
4	// R9: each test fails if the gating/throttle logic changes.
5	//
6	// Run directly:  node .claude/hooks/fleet-survival-advisory.test.mjs   (node:test auto-runs)
... [+12113 chars truncated]

### Assistant | 2026-06-18T13:52:09.770Z

[tool_use: Grep]

### User | 2026-06-18T13:52:10.314Z

[tool_result] 1543:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/fleet-survival-advisory.mjs",

### User | 2026-06-18T13:52:11.267Z

[tool_result] 1543:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/fleet-survival-advisory.mjs",

### Assistant | 2026-06-18T13:52:15.464Z

Both files are read. Let me verify the two settings.json refs are in the correct advisory band near `critical-memory-compact-nudge.mjs` and confirm exactly 1 ref each (the grep returned 1 line per file). Let me check the surrounding context to confirm band placement and exact count.

### Assistant | 2026-06-18T13:52:18.564Z

[tool_use: Bash]

### User | 2026-06-18T13:52:22.099Z

[tool_result] === C: count ===
1
=== H: count ===
1
=== C: context (band) ===
1538:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/critical-memory-compact-nudge.mjs",
1543:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/fleet-survival-advisory.mjs",
=== H: context (band) ===
1538:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.cl
... [+161 chars truncated]

### Assistant | 2026-06-18T13:52:26.885Z

Wiring confirmed: exactly 1 ref each, immediately after `critical-memory-compact-nudge.mjs` in the advisory band of both settings.json. Let me verify it sits inside the UserPromptSubmit chain (not some other event), and confirm the import-chain has no top-level IO by checking `runSurvivalStatus`.

### Assistant | 2026-06-18T13:52:30.668Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:52:32.381Z

[tool_use: Grep]

### User | 2026-06-18T13:52:34.393Z

[tool_result] === C: which event block contains line 1543 ===
1292:    "UserPromptSubmit": [
=== H: which event block ===
1292:    "UserPromptSubmit": [

### User | 2026-06-18T13:52:35.930Z

[tool_result] 24:import { pathToFileURL } from "node:url";
25:import { liveStatus, DEFAULT_OBSERVED_CEILING_PATH } from "./five-hour-limit-tracker.mjs";
26:import { runPreflight } from "./account-switch-preflight.mjs";
28:export const ARMED_ENV = "PRISM_ACCT_SWITCH_AUTO_APPLY";
40:export function gradeSurvival({ live, preflight, armed }) {
100:export function readArmed(env = process.env) {
109:export function r
... [+48 chars truncated]

### Assistant | 2026-06-18T13:52:39.448Z

Wiring is fully confirmed: line 1543 is in the `UserPromptSubmit` block (opens at 1292) in both files, right after `critical-memory-compact-nudge.mjs`. The import chain (`fleet-survival-status.mjs`) imports siblings and uses an `__direct` guard at line 154 (so no top-level IO fires on import). Let me confirm the `__direct` guard gates the only execution and run the test suite to verify all 24 bite.

### Assistant | 2026-06-18T13:52:40.439Z

[tool_use: Read]

### User | 2026-06-18T13:52:41.253Z

[tool_result] 109	export function runSurvivalStatus({
110	  nowMs,
111	  env = process.env,
112	  ceilingPath = DEFAULT_OBSERVED_CEILING_PATH,
113	  _live = liveStatus,
114	  _preflight = runPreflight,
115	  _readArmed = readArmed,
116	} = {}) {
117	  if (!Number.isFinite(nowMs)) throw new Error("runSurvivalStatus: nowMs (finite epoch ms) is required");
118	  let live = null;
119	  try { live = _live({ nowMs, c
... [+2646 chars truncated]

### Assistant | 2026-06-18T13:52:41.770Z

[tool_use: Bash]

### User | 2026-06-18T13:52:45.206Z

[tool_result]   ...
# Subtest: computeAdvisory: interval elapsed + survivable -> no nudge, but lastCheckMs persisted (lastNudge preserved)
ok 21 - computeAdvisory: interval elapsed + survivable -> no nudge, but lastCheckMs persisted (lastNudge preserved)
  ---
  duration_ms: 0.0565
  ...
# Subtest: computeAdvisory: interval elapsed + actionable + cooldown clear -> NUDGE, lastNudgeMs=now
ok 22 - computeAdvisory:
... [+672 chars truncated]

### Assistant | 2026-06-18T13:53:14.150Z

24/24 pass. All claims verified. Let me confirm the R9 bite of the key tests by mutation-probing the two highest-risk assertions: (1) that the check-gate test actually fails if `survivalFn` runs (it injects a thrower, but I want to confirm the gate ordering is load-bearing), and (2) that the within-cooldown test catches a `lastNudgeMs` reset.

I have enough to verify by reading. Let me trace the load-bearing logic once more rather than mutating live files (read-only mandate).

**Check-gate-before-survivalFn (computeAdvisory:201-206):** `shouldRunCheck` is called at line 201 and returns early at 202 BEFORE the `survivalFn` call at 206. The test at line 166 injects `throwingSurvival` (line 164) with `lastCheckMs: now - 60_000` (within the 5m `CHECK`). If the gate were moved after `survivalFn`, the thrower would fire — but `computeAdvisory` wraps `survivalFn` in try/catch (line 206), so a thrown error would be swallowed to `survival = null`, NOT propagate. So does the test actually bite? Yes — because the test asserts `r.computed === false` (line 175), `r.reason === "check-throttled"` (176), and `wrote === null` (179). If the gate ran after the compute, `computed` would be `true` and a stamp write would occur, flipping all three asserts. The thrower is belt-and-suspenders; the `computed/reason/wrote` triple is the real R9 bite. Confirmed.

**Non-nudge persists lastCheckMs + preserves lastNudgeMs (computeAdvisory:210-213):** test line 194 asserts `wrote.lastCheckMs === now` (205) AND `wrote.lastNudgeMs === 12345` (206) on a survivable path. Mutation of line 212 to `lastNudgeMs: nowMs` would flip the `=== 12345` assert. The cooldown test (line 223) further pins `wrote.lastNudgeMs === now - 60_000` (235) so a reset on the cooldown path is also caught. Confirmed.

**main() wiring (241-249):** passes `Date.now()`, real `readStamp(stampFileFor(key))` / `writeStamp(...)` keyed by `stampKeyOf` -> `stampFileFor`, and `runSurvivalStatus` as `survivalFn`. `emitContinue(result.add
... [+3074 chars truncated]
