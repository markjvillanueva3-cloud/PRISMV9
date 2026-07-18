---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Review git commit 80ce407d2c in H:/prism (2 files: .claude/hooks/mcp-bridge-enfo"
date: "2026-06-17"
first_ts: "2026-06-17T13:23:09.815Z"
last_ts: "2026-06-17T13:25:02.285Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 8
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a1e19f205bd26d033.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Review git commit 80ce407d2c in H:/prism (2 files: .claude/hooks/mcp-bridge-enfo

> **claude-code-cli** | 2026-06-17 | 22 msgs (8 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a1e19f205bd26d033.jsonl`

## Transcript

### User | 2026-06-17T13:23:09.815Z

Review git commit 80ce407d2c in H:/prism (2 files: .claude/hooks/mcp-bridge-enforce-pretool.mjs + .claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs). Run `git -C H:/prism show 80ce407d2c` to see the exact diff.

CONTEXT: This T0 PreToolUse enforce-gate decides whether to (a) hard-block a tool call when THIS chat's prism MCP bridge is dead, and (b) write a fleet-wide "/mcp reconnect -- every chat disconnected" broadcast signal. A CONFIRMED-LIVE false-positive: the broadcast fired on a HEALTHY :3100 (HTTP 200, peak_inflight=1) because `readCachedServerUp` returned undefined when the UserPromptSubmit health cache was >120s stale (normal during long turns/idle), so `decideEnforcement(serverUp:undefined)` took the legacy broadcast-on-fleet-0 path. The fix adds `cachedServerUpVerdict()` (pure, exported): a last-known-HEALTHY probe within a 900s window now counts as "server up" for broadcast SUPPRESSION only.

Review HOLISTICALLY for correctness, silent breakage, security, convention conformance, inlined constants, and whether the fix achieves its goal WITHOUT weakening real-outage detection. Specifically verify:
1. The down direction is NEVER suppressed beyond the 120s authoritative window (a fresh ok:false must still allow the broadcast) — trace cachedServerUpVerdict for ok:false at various ages.
2. The hard-block path (per-chat pid-dead/stale) is UNTOUCHED by this change.
3. The 900s suppress window cannot over-suppress a genuine outage indefinitely (what re-enables the broadcast after a real down?).
4. No ASCII/em-dash violations, no inlined magic constants that should be named, env knob sane.
Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Read-only — do not edit.

### Assistant | 2026-06-17T13:23:20.144Z

I'll review commit 80ce407d2c. Let me start by reading the diff and both files in full.

### Assistant | 2026-06-17T13:23:20.915Z

[tool_use: Bash]

### User | 2026-06-17T13:23:24.838Z

[tool_result] commit 80ce407d2c96d2dc70e15926bdcc4e78820381c2
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 17 08:22:18 2026 -0500

    [MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-IDLE-BROADCAST (slot:golf): kill the false fleet "/mcp reconnect -- every chat disconnected" broadcast on a healthy idle server
    
    ROOT CAUSE (confirmed LIVE 2026-06-17, not inferred): operator "c
... [+11847 chars truncated]

### Assistant | 2026-06-17T13:23:28.141Z

Now let me read both files in full to understand the surrounding contract, not just the diff hunk.

### Assistant | 2026-06-17T13:23:29.188Z

[tool_use: Read]

### Assistant | 2026-06-17T13:23:29.518Z

[tool_use: Read]

### User | 2026-06-17T13:23:30.569Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * mcp-bridge-enforce-pretool.mjs -- PreToolUse ENFORCEMENT gate for a dead prism
5	 * MCP bridge (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
6	 *
7	 * WHY (operator 2026-06-16): "chats still losing connection and enforcements in
8	 * place for chats to check to see if they're connected don't work -- find a way to
9	 * automate and enforce it." MS0
... [+11850 chars truncated]

### User | 2026-06-17T13:23:31.426Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: test
3	// Round-trip test for mcp-bridge-enforce-pretool.mjs: spawns the hook as a
4	// subprocess (as the harness does) with a controlled sentinel + enum-cache, and
5	// asserts the deny/allow decision end-to-end. Intent (R9/R15): prove the GATE
6	// actually blocks a dead bridge, never deadlocks, never false-positives, and
7	// auto-broadcasts on a fleet-wide out
... [+13919 chars truncated]

### Assistant | 2026-06-17T13:23:35.894Z

Now I need to verify the dependency `decideEnforcement` in the shared lib — specifically how it consumes `serverUp`, since the fix's whole purpose hinges on that contract. The down-direction-never-suppressed claim depends on what `decideEnforcement` does with `serverUp: undefined` vs `true`. Let me read it.

### Assistant | 2026-06-17T13:23:36.098Z

[tool_use: Read]

### User | 2026-06-17T13:23:36.976Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: lib
3	/**
4	 * mcp-bridge-enforce.mjs -- pure decision logic for the PreToolUse MCP-bridge
5	 * ENFORCEMENT gate (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
6	 *
7	 * THE GAP THIS CLOSES (operator pain 2026-06-16: "chats still losing connection
8	 * and enforcements in place for chats to check to see if they're connected don't
9	 * work"):
10	 *   `mcp-connec
... [+10118 chars truncated]

### Assistant | 2026-06-17T13:23:54.517Z

I now have the full contract. Let me verify the four review questions against the code.

**1. Down direction never suppressed beyond 120s.** Tracing `cachedServerUpVerdict`:
- `ageMs <= 120_000` + `ok:false` → returns `undefined` (line 148). Correct: fresh down does NOT suppress.
- `ageMs > 120_000` + `ok:false` → the second branch requires `ok && ...`, `ok` is false → falls through to `return undefined` (line 151). Correct.
- The only `true`-return paths require `ok===true`. A down (`ok:false`) probe can NEVER return `true`. Confirmed: down is never suppressed at any age.

And in `decideEnforcement`, `broadcastOut = fleetOut && a.serverUp !== true` (line 91). Only `serverUp === true` suppresses. `undefined !== true` → broadcast still fires. Correct.

**2. Hard-block path untouched.** The `perChat` hard-block at lines 76, 104-119 of the lib never reads `serverUp`. `broadcastOut` only affects the `broadcast` field, never `block`. The hook's `readCachedServerUp` only feeds `serverUp` into `decideEnforcement`, which gates only the advisory broadcast. The per-chat deny path (lines 210-213 of the hook) is unchanged. Confirmed untouched.

**3. 900s window cannot over-suppress indefinitely.** A genuine outage re-enables the broadcast two independent ways: (a) the next live turn's `mcp-connectivity-check.mjs` probes :3100 and writes `ok:false` fresh (<=120s), which returns `undefined` regardless of the 900s window; (b) if no probe runs at all, the healthy cache simply ages past 900s and `cachedServerUpVerdict` returns `undefined` (line 151). The round-trip test at test line 224 proves the >900s path still fires. So the worst-case suppression of a real outage with a stuck-stale healthy cache is bounded at 900s — and the live re-probe path collapses it to ~120s in practice. Bounded, not indefinite.

**4. ASCII / constants / env knob.** Let me verify there are no non-ASCII smart-quotes/em-dashes in the actual code (the `──` box-drawing chars appear in comments — I need to chec
... [+116 chars truncated]

### Assistant | 2026-06-17T13:23:55.722Z

[tool_use: Bash]

### User | 2026-06-17T13:24:04.113Z

[tool_result] .claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs:160:// ── U-MCP-FALSEPOS-IDLE-BROADCAST (slot golf 2026-06-17) ──

### Assistant | 2026-06-17T13:24:08.574Z

The only non-ASCII is the `──` box-drawing characters in a test comment (line 160). The new source-file code is pure ASCII (it uses `--` ASCII em-dash substitute throughout, matching the surrounding convention). Let me check whether the rest of the test file already used these box-drawing chars before this commit, and whether the repo's ASCII convention applies — i.e. is this a pre-existing pattern in the codebase's test comments or a new introduction.

### Assistant | 2026-06-17T13:24:11.188Z

[tool_use: Bash]

### User | 2026-06-17T13:24:19.619Z

[tool_result] 1
---prior version---
0 (or file absent prior)
---box-drawing in other hook tests---
.claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs
.claude/hooks/__tests__/error-fix-vault-bridge.test.mjs
.claude/hooks/__tests__/active-chat-priority.test.mjs
.claude/hooks/__tests__/critical-memory-compact-nudge.test.mjs
.claude/hooks/__tests__/html-companion-guard.test.mjs
.claude/hooks/__tests__/hook
... [+835 chars truncated]

### Assistant | 2026-06-17T13:24:25.148Z

The `──` box-drawing chars are a widespread, pre-existing convention across many hook test files (a section-divider comment idiom), so this is convention conformance, not a violation. It's in a comment only, never in code, and the section header itself is ASCII text. The PRISM ASCII rule targets code and smart-quotes/em-dashes in code; box-drawing section dividers in test comments are an established repo idiom.

Now let me verify the tests actually run green and that the `import` of the named export resolves (the test imports `cachedServerUpVerdict` at module top — if the export were broken, the whole test file would fail to load).

### Assistant | 2026-06-17T13:24:26.006Z

[tool_use: Bash]

### User | 2026-06-17T13:24:33.315Z

[tool_result]   ...
# Subtest: cachedServerUpVerdict: env-tunable suppress window honored
ok 16 - cachedServerUpVerdict: env-tunable suppress window honored
  ---
  duration_ms: 0.0252
  ...
# Subtest: ROUND-TRIP: 0 bridges + STALE-but-healthy (191s) health cache -> NO false broadcast (live-bug repro)
ok 17 - ROUND-TRIP: 0 bridges + STALE-but-healthy (191s) health cache -> NO false broadcast (live-bug repro)
  
... [+403 chars truncated]

### Assistant | 2026-06-17T13:25:02.285Z

All 18 tests pass (0 skipped, 0 todo — no `.skip`/`.only`/stubs). The export resolves cleanly. Let me verify the two ROUND-TRIP tests are real R9 tests — i.e., they would actually fail if the fix were reverted. I'll confirm the negative-control direction: the 191s test asserts `existsSync(signal) === false` (would have been `true` pre-fix), and the >900s test asserts `=== true`. Both are inverted-pair oracles. Let me confirm the `import` does not trigger `main()` side effects at import time (the `isMain` guard) so the named-export import is safe.

The hook's `isMain` guard (lines 216-226) prevents `main()` from running on import, so importing `cachedServerUpVerdict` does not spawn the gate or touch the live state file. Confirmed safe.

One more thing to verify for correctness: the `HEALTH_LASTKNOWN_MAX_AGE_MS` env-knob `Math.max(120_000, Number(...)||900_000)` floor. If an operator sets the knob BELOW 120000 (e.g. `PRISM_MCP_HEALTH_LASTKNOWN_MAX_AGE_MS=60000`), `Math.max` clamps it up to 120000. But note the default parameter `lastKnownMaxMs` in the pure function is only used at the module-default; the env test passes explicit values that bypass the `Math.max` floor. Let me confirm there's no inconsistency between the module constant (floored) and the pure-function param (unfloored), which could confuse an operator.

The pure function `cachedServerUpVerdict(lastStatus, ageMs, lastKnownMaxMs = HEALTH_LASTKNOWN_MAX_AGE_MS)` accepts an explicit `lastKnownMaxMs` that is NOT floored (test line 202 passes `150_000` and `1_200_000` directly). But in the live `readCachedServerUp` path, it always uses the module default `HEALTH_LASTKNOWN_MAX_AGE_MS`, which IS floored at 120000. This is a minor seam — the floor only applies to the env-driven live value, not to direct callers — but the only direct caller is tests, so there is no live inconsistency. The floor is correct: it guarantees the suppress window can never be narrower than the authoritative-fresh window, which would be 
... [+3207 chars truncated]
