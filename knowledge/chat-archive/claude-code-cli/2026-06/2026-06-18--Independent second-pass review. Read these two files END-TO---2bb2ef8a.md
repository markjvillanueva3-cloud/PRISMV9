---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7"
title: "Independent second-pass review. Read these two files END-TO-END: - H:/prism/.cla"
date: "2026-06-18"
first_ts: "2026-06-18T13:46:18.515Z"
last_ts: "2026-06-18T13:48:15.435Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 16
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-a23c9f1a265e306ed.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent second-pass review. Read these two files END-TO-END: - H:/prism/.cla

> **claude-code-cli** | 2026-06-18 | 39 msgs (16 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-a23c9f1a265e306ed.jsonl`

## Transcript

### User | 2026-06-18T13:46:18.515Z

Independent second-pass review. Read these two files END-TO-END:
- H:/prism/.claude/hooks/fleet-survival-advisory.mjs
- H:/prism/.claude/hooks/fleet-survival-advisory.test.mjs

This is a new UserPromptSubmit advisory hook for PRISM. It surfaces the 5h-session-limit "survival verdict" (will the fleet survive the next limit without operator action) proactively, but ONLY when actionable. It composes `runSurvivalStatus` from H:/prism/scripts/fleet-survival-status.mjs (read it for the verdict shape: {survives, armed, preflightGrade, actions[], proximity:{zone,pctUsed,etaMinutes,...}}).

Compare it against the established sibling hook H:/prism/.claude/hooks/critical-memory-compact-nudge.mjs (read it) — this new hook should follow the SAME conventions: emitContinue contract, time-bounded readStdin, pure decide-core + injectable IO, per-chat stamp throttle, invokedAsHook guard, knob naming.

WEIGHT YOUR REVIEW toward what an analyst might miss:
1. Convention conformance vs the sibling hook (output shape, stdin handling, guard pattern, knob naming style).
2. Is the advisory genuinely non-duplicative? PRISM already has token-awareness/compaction advisories — confirm this one targets a DISTINCT axis (the shared 5h ACCOUNT rolling limit + arm-state, NOT the per-chat context-token window or system RAM). Flag if it overlaps.
3. Could it become fleet-wide noise (every chat nudging at once)? Is the throttle per-chat and is that the right granularity given the account is SHARED across all chats?
4. Message quality: does the nudge text give the operator a clear, correct, actionable instruction? Any chance it tells them to do something that would bypass the operator-gated account-switch RED-gate (it must NOT)?
5. Any inlined magic constants that should be named; any ASCII/encoding risk in the emitted string (a non-ASCII emoji is acceptable if siblings do it).
6. Test coverage gaps: happy + >=3 failure modes + >=2 adversarial, asserting INTENT not just shape.

Grade PASS or FAIL with P
... [+66 chars truncated]

### Assistant | 2026-06-18T13:46:24.374Z

I'll review the new hook and its test against the sibling conventions and the survival-status contract. Let me read all the relevant files.

### Assistant | 2026-06-18T13:46:25.343Z

[tool_use: Read]

### Assistant | 2026-06-18T13:46:25.805Z

[tool_use: Read]

### User | 2026-06-18T13:46:26.084Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\fleet-survival-advisory.mjs' was already read 9s ago in this session and is unchanged (mtime 1781790213677). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T13:46:26.254Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\fleet-survival-advisory.test.mjs' was already read 9s ago in this session and is unchanged (mtime 1781790300251). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-18T13:46:26.298Z

[tool_use: Read]

### Assistant | 2026-06-18T13:46:26.414Z

[tool_use: Read]

### User | 2026-06-18T13:46:26.748Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\critical-memory-compact-nudge.mjs' was already read 5m ago in this session and is unchanged (mtime 1779065424126). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-18T13:46:26.987Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-survival-status.mjs' was already read 9s ago in this session and is unchanged (mtime 1781761867003). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T13:46:29.492Z

The read-once guard claims these files are already in my context, but they are not — this is a fresh agent thread. Let me disable the cache to read them.

### Assistant | 2026-06-18T13:46:30.521Z

[tool_use: Bash]

### User | 2026-06-18T13:46:37.043Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T2
     3	/**
     4	 * fleet-survival-advisory.mjs -- UserPromptSubmit advisory that proactively
     5	 * surfaces the 5h-session-limit SURVIVAL verdict at the moment it is actionable.
     6	 *
     7	 * THE GAP. scripts/fleet-survival-status.mjs composes the three survival signals
     8	 * (5h proximity + account-switch preflight + armed-flag) into o
... [+11326 chars truncated]

### Assistant | 2026-06-18T13:46:39.435Z

Now the test file and the two siblings.

### Assistant | 2026-06-18T13:46:40.882Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:46:41.801Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:46:42.521Z

[tool_use: Bash]

### User | 2026-06-18T13:46:45.854Z

[tool_result]      1	// Tests for fleet-survival-advisory.mjs -- the proactive UserPromptSubmit
     2	// advisory that surfaces the 5h-limit survival verdict ONLY when actionable
     3	// (fleet WILL block AND proximity has climbed into warn/critical), throttled.
     4	// R9: each test fails if the gating/throttle logic changes.
     5	//
     6	// Run directly:  node .claude/hooks/fleet-survival-advisory.te
... [+7910 chars truncated]

### User | 2026-06-18T13:46:50.120Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T2
     3	/**
     4	 * critical-memory-compact-nudge.mjs — UserPromptSubmit actuator that drives a
     5	 * /compact onto the ONE chat that is the fleet's largest memory consumer when
     6	 * the box is at critical commit pressure.
     7	 *
     8	 * THE GAP. scripts/fleet-memory-monitor.mjs samples system RAM every 5 min and,
     9	 * on critical p
... [+13107 chars truncated]

### User | 2026-06-18T13:46:54.076Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * fleet-survival-status.mjs -- ZULU-ACCOUNT-CYCLE / U-FLEET-SURVIVAL (slot:zulu,
     4	 * 2026-06-18). The orchestrator's GO/NO-GO cockpit for the one question that decides
     5	 * "run as long as possible before session limits hit again":
     6	 *
     7	 *     Will the fleet survive the next 5h session limit WITHOUT operator action?
     8	 *
   
... [+9034 chars truncated]

### Assistant | 2026-06-18T13:46:58.142Z

I have all three files. Now let me verify a few specifics: the `etaMinutes` source (computeStatus burn-rate), whether the hook is actually wired in settings.json, and how the sibling token-awareness/compaction advisories differ (to confirm non-duplication). Let me also run the test suite to confirm it passes.

### Assistant | 2026-06-18T13:46:59.065Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:47:00.028Z

[tool_use: Grep]

### User | 2026-06-18T13:47:02.581Z

[tool_result]   ...
# Subtest: decideAdvisory: cooldown exactly elapsed -> nudges again
ok 14 - decideAdvisory: cooldown exactly elapsed -> nudges again
  ---
  duration_ms: 0.0425
  ...
# Subtest: decideAdvisory: empty actions array -> still nudges, no action bullets, no crash
ok 15 - decideAdvisory: empty actions array -> still nudges, no action bullets, no crash
  ---
  duration_ms: 0.0632
  ...
# Subtest: d
... [+452 chars truncated]

### User | 2026-06-18T13:47:04.277Z

[tool_result] No matches found

### Assistant | 2026-06-18T13:47:10.951Z

17/17 tests pass. The hook is NOT wired in `H:/prism/.claude/settings.json` despite the header claiming "Wired: .claude/settings.json UserPromptSubmit chain". Let me verify the wiring claim against both settings.json files (C: is the canonical edit target, H: is mirrored), and check for an `etaMinutes` field in the upstream tracker to confirm the message's correctness. Let me also confirm there are no other survival-advisory references and check the `armWouldFire` semantics.

### Assistant | 2026-06-18T13:47:13.309Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:47:14.610Z

[tool_use: Grep]

### User | 2026-06-18T13:47:16.231Z

[tool_result] 314:  const burnPerMin = burnWindowMs > 0 ? burnWeighted / (burnWindowMs / 60000) : 0;
318:  const etaMinutes = hasCeiling && burnPerMin > 0 ? remaining / burnPerMin : null;
324:    burnPerMin,
325:    etaMinutes,
514:    armWouldFire: armTrigger != null ? full.weightedTokens >= armTrigger : null,
548:    const eta = s.etaMinutes == null ? "n/a" : `${s.etaMinutes.toFixed(0)} min`;
550:      : `  a
... [+172 chars truncated]

### User | 2026-06-18T13:47:17.425Z

[tool_result] === C: settings ===
0
=== sibling crit-mem wiring in C: ===
1538:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/critical-memory-compact-nudge.mjs",
=== sibling crit-mem wiring in H: ===

### Assistant | 2026-06-18T13:47:22.735Z

Confirmed: the new hook is wired in neither C: nor H: settings.json (the sibling is wired in C: only, then mirror-replicated to H:). The verdict shape fields (`etaMinutes`, `burnPerMin`, `armWouldFire`, `pctUsed`, `zone`) all exist in the upstream tracker, and the message correctly maps them. Let me confirm the non-duplication axis by checking what the existing token-awareness/compaction advisories target, and verify the `liveStatus` `zone` values to confirm `decideAdvisory`'s zone handling matches reality.

### Assistant | 2026-06-18T13:47:24.108Z

[tool_use: Grep]

### User | 2026-06-18T13:47:25.433Z

[tool_result] 326:    zone: pctUsed == null ? "unknown" : pctUsed >= 0.92 ? "critical" : pctUsed >= 0.75 ? "warn" : "ok",
552:      `[5h-tracker] LIVE  zone=${s.zone}\n` +

### Assistant | 2026-06-18T13:47:25.923Z

[tool_use: Bash]

### User | 2026-06-18T13:47:30.148Z

[tool_result] === existing UserPromptSubmit token/compact advisories in C: settings ===
485:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/claude-brief-precompact.mjs",
490:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/helpers/precompact-handoff.mjs",
495:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/precompact-memo-e
... [+1292 chars truncated]

### Assistant | 2026-06-18T13:47:36.112Z

Confirmed the zone semantics: the upstream tracker emits exactly `unknown | ok | warn | critical` (line 326), and `decideAdvisory`'s `ZONE_RANK` maps all four correctly with `unknown`→0 (silent), matching intent. The non-duplication axis is clear: every existing advisory (`token-awareness-*`, `zulu-advisory-inject`, `critical-memory-compact-nudge`, the `precompact-*` chain, `stop-task-boundary-compact-nudge`) targets either the per-chat context-token window or system RAM/compaction. None targets the shared 5h account rolling limit + arm-state. This hook occupies a genuinely distinct axis.

Let me do one final check on the `zulu-advisory-inject` hook to be certain it doesn't already surface the 5h/account-switch signal (it's the closest candidate, given the survival-status was built by slot:zulu).

### Assistant | 2026-06-18T13:47:37.874Z

[tool_use: Bash]

### User | 2026-06-18T13:47:41.803Z

[tool_result] === does zulu-advisory-inject reference 5h/account-switch/survival? ===
exit=0

### Assistant | 2026-06-18T13:48:15.435Z

No matches — `zulu-advisory-inject.mjs` does not touch the 5h limit, account-switch, or survival signal. The new hook's axis is confirmed non-duplicative.

I have everything needed. Final assessment.

---

VERDICT: FAIL

summary: The hook is clean, well-conventioned, and genuinely non-duplicative — it occupies a distinct axis (the shared 5h account rolling limit + arm-state) that no existing advisory covers, follows the sibling `critical-memory-compact-nudge.mjs` conventions almost exactly, fires only when actionable, and never bypasses the operator-gated RED-gate. The decide-core is well-tested (17/17 pass, real mutation guards). The one blocking issue is a fail-loud violation: the header claims "Wired: .claude/settings.json UserPromptSubmit chain" but the hook is wired in NEITHER settings.json — it is an orphan, so the "delivery surface" it exists to provide does not actually fire (R12 / R15).

findings:
- [P1] `H:/prism/.claude/hooks/fleet-survival-advisory.mjs:41` — Header asserts "Wired: .claude/settings.json UserPromptSubmit chain (advisory)" but `grep` finds 0 refs in both `C:/Users/wompu/.claude/settings.json` and `H:/prism/.claude/settings.json` (the sibling `critical-memory-compact-nudge.mjs` IS wired at C: line 1538). The hook is an orphan: the entire stated purpose ("the verdict is never DELIVERED... this hook is that delivery surface", lines 10-13) is unfulfilled — it never runs. This is the R15 WIRE gap and an R12 fail-loud violation (a header claiming a wiring that does not exist). Fix: add the hook to the UserPromptSubmit chain in `C:/Users/wompu/.claude/settings.json` (the canonical edit target; the c-to-h-mirror replicates to H:), positioned in the advisory band alongside `critical-memory-compact-nudge.mjs`; OR change the header from "Wired:" to "To wire:" until the entry lands.

- [P2] `H:/prism/.claude/hooks/fleet-survival-advisory.mjs:212` — Per the test fixture and live tracker, `runSurvivalStatus` computes proximity by scanning this chat's tra
... [+2866 chars truncated]
