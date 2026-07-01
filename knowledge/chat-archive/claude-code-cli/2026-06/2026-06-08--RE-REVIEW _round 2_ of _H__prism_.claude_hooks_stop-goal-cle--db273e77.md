---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "RE-REVIEW (round 2) of `H:/prism/.claude/hooks/stop-goal-clear-advance.mjs` — yo"
date: "2026-06-08"
first_ts: "2026-06-08T20:31:56.123Z"
last_ts: "2026-06-08T20:34:25.375Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-ac6f5fc68b83ebfa8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# RE-REVIEW (round 2) of `H:/prism/.claude/hooks/stop-goal-clear-advance.mjs` — yo

> **claude-code-cli** | 2026-06-08 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-ac6f5fc68b83ebfa8.jsonl`

## Transcript

### User | 2026-06-08T20:31:56.123Z

RE-REVIEW (round 2) of `H:/prism/.claude/hooks/stop-goal-clear-advance.mjs` — your round-1 returned FAIL with two P1 BLOCKERs + two P2s. Confirm whether they are now CLOSED. Read the current live file end-to-end.

The two P1s you found + how they were addressed:
1. **parseUnitKey false-positive → wrong claim**: claim was unconditional on probe.nextTask regardless of source, so a freeform handoff-resume prose fragment like "QUOTING-SYNERGY-MS0 / U-QP-ORCH" could be parsed + claimed. FIX: in main(), claim is now gated `const STRUCTURED = probe.source === "pick-unit" || probe.source === "pick-unit-fleet"; const unitKey = STRUCTURED ? parseUnitKey(probe.nextTask) : ""; const claimed = unitKey ? tryClaim(...) : false;` — verify a freeform/resume-flag/handoff-resume source can NEVER reach tryClaim.
2. **RESUME_LOOP regex corruption (`m` flag → `$` = end-of-line)**: FIX changed to `const re = new RegExp(\`\\n*${RESUME_LOOP_MARKER}[\\s\\S]*?(?=\\n## |$)\`)` (NO `m` flag), then `const stripped = re.test(content) ? content.replace(re, "") : content; const newContent = stripped.replace(/\\s*$/, "") + block;` — verify this (a) fully removes an old block body (not just the marker line), (b) does NOT glue the marker onto a preceding section, (c) is idempotent across repeated injects, (d) preserves a following `## ` section.

The two P2s + fixes:
3. **MAX_ADVANCE NaN guard**: now `Number.isFinite(MAX_ADVANCE_RAW) && MAX_ADVANCE_RAW > 0 ? MAX_ADVANCE_RAW : 3`.
4. **resolveSlot null → defaulted to alpha lane**: now `if (!slot) approveAndExit(...)` no-ops unbound sessions before any resolve/claim/roll.

Also: the file gained a test-only env override `PRISM_GOAL_CLEAR_ADVANCE_SLOTS_JSON` for the slots path (so tests don't mutate the live shared chat-slots.json). Confirm this override is safe (read-only path swap, no behavior change in production where the env is unset).

Tests: 8/8 pass in `H:/prism/.claude/hooks/__tests__/stop-goal-clear-advance.test.mjs` including new regression gua
... [+376 chars truncated]

### Assistant | 2026-06-08T20:32:10.072Z

I'll re-review the current live file end-to-end, then verify each P1/P2 fix and the test file.

### Assistant | 2026-06-08T20:32:12.147Z

[tool_use: Read]

### Assistant | 2026-06-08T20:32:12.152Z

[tool_use: Read]

### User | 2026-06-08T20:32:13.716Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-goal-clear-advance.mjs — AUTONOMOUS-FLEET-MS0/U-GOAL-CLEAR-ADVANCE
5	 *
6	 * Stop hook that fires when a chat slot's /loop or /goal has CLEARED
7	 * (iter >= target, or loop-state ended target-met) and AUTO-FALLS-BACK to the
8	 * next remaining unit in the slot's task queue — own-domain-first, then
9	 * fleet-wide — instead of letting the slot go
... [+14508 chars truncated]

### User | 2026-06-08T20:32:13.862Z

[tool_result] 1	// tier: T3
2	/**
3	 * .claude/hooks/__tests__/stop-goal-clear-advance.test.mjs
4	 *
5	 * Hermetic tests for stop-goal-clear-advance.mjs (U-GOAL-CLEAR-ADVANCE) — the
6	 * Stop hook that, on goal-clear (iter >= target), falls a slot back to the next
7	 * remaining queued unit (own-domain-first → fleet) instead of idling.
8	 *
9	 * Strategy: seed a loop-state JSON + a matching per-agent handoff fo
... [+10065 chars truncated]

### Assistant | 2026-06-08T20:32:26.558Z

I have both files. Let me verify each P1/P2 fix against the live code, then run the tests to confirm 8/8.

**P1 #1 — parseUnitKey false-positive gating** (lines 273-279):
- `STRUCTURED = probe.source === "pick-unit" || probe.source === "pick-unit-fleet"` (line 277)
- `unitKey = STRUCTURED ? parseUnitKey(probe.nextTask) : ""` (line 278)
- `claimed = unitKey ? tryClaim(...) : false` (line 279)

I'll trace every source value that `resolveNext` can return to confirm no non-structured source reaches `tryClaim`. The docstring (lines 25-26) lists the resolution chain: `--resume → handoff RESUME → pick-unit own-lane → pick-unit fleet`. The structured sources are exactly `pick-unit`/`pick-unit-fleet`; freeform/resume-flag/handoff-resume sources produce `STRUCTURED=false → unitKey="" → claimed=false`, and `tryClaim` is never invoked. Additionally `tryClaim` itself guards `if (!unitKey) return false` (line 200) as defense-in-depth. **Closed.**

**P1 #2 — RESUME_LOOP regex** (lines 235-237). Let me trace the four sub-claims concretely.

### Assistant | 2026-06-08T20:32:39.553Z

[tool_use: Bash]

### Assistant | 2026-06-08T20:32:40.267Z

[tool_use: Bash]

### User | 2026-06-08T20:32:46.307Z

[tool_result] === (a/b/d) FIRST INJECT ===
"# Handoff\n\n## State\nimportant prior content\n\n## Next Steps\nkeep me\n\n## RESUME_LOOP\n\n**GOAL CLEARED → auto-advance to next queued unit** (advance 1/3).\n\nNext unit: FOO-MS0 / U-BAR\nSource: pick-unit\nClaimed: yes\n\n▶ NEXT ACTION: re-invoke /loop.\n\n(Injected; cap=3.)\n"
blocks: 1
State preserved: true
NextSteps preserved: true
marker not glued (no S befor
... [+329 chars truncated]

### User | 2026-06-08T20:32:52.517Z

[tool_result]   ...
# Subtest: no loop state for the session → no-op
ok 6 - no loop state for the session → no-op
  ---
  duration_ms: 123.904
  ...
# Subtest: re-inject is idempotent — exactly one RESUME_LOOP block, surrounding sections intact
ok 7 - re-inject is idempotent — exactly one RESUME_LOOP block, surrounding sections intact
  ---
  duration_ms: 920.9658
  ...
# Subtest: session not bound to a slot → 
... [+260 chars truncated]

### Assistant | 2026-06-08T20:32:58.908Z

The standalone trace surfaced something I need to reconcile against the test result. My simplified trace showed "blocks after re-inject: 2" and "old body gone: false / blocks: 2" — but test #7 (idempotency) PASSED in the live hook. The discrepancy is because my standalone `inject()` reproduction differs from the live `injectResumeLoop`: my trace used the wrong block-leading newline interaction. Let me trace the EXACT live function to resolve which behavior is real, since this is the load-bearing P1.

### Assistant | 2026-06-08T20:33:10.724Z

[tool_use: Bash]

### User | 2026-06-08T20:33:13.925Z

[tool_result] Exit code 127
[rtk: batch file arguments are invalid]

### Assistant | 2026-06-08T20:33:25.979Z

rtk choked on the multi-line `-e` string. I'll write a temp file and run it with `command node` to bypass.

### Assistant | 2026-06-08T20:33:37.483Z

[tool_use: Write]

### User | 2026-06-08T20:33:39.696Z

[tool_result] File created successfully at: H:/prism/state/shared/.goal-clear-advance-stamps/_trace.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-08T20:33:45.246Z

[tool_use: Bash]

### User | 2026-06-08T20:33:49.535Z

[tool_result] blocks after 2 injects: 1
State preserved: true
NextSteps preserved: true
not glued: true
no leftover count1: true
blocks after 3: 1
converged (len delta c3-c2): 0
match len: 158 of total: 224
prefix-before-match ends with 'keep me': true

[no-EOF-newline] blocks: 1 old gone: true
[followed-by-section] Keep survives: true old gone: true blocks: 1
---cleaned---

### Assistant | 2026-06-08T20:34:25.375Z

The exact-live trace resolves the discrepancy from my first (faulty) reproduction. The earlier `2 blocks` and `old body gone: false` came from a bug in MY simplified standalone — not the hook. The live `injectResumeLoop` is correct on all four sub-claims:

- **(a) full removal of old body**: match len 158 of 224 — the regex span covers the whole prior block (the `\n*` prefix + marker through `[\s\S]*?` to `(?=\n## |$)`), and the prefix-before-match ends exactly at `keep me` (the preceding section), so the entire old block body is excised, not just the marker line.
- **(b) not glued to preceding section**: `not glued: true` — `block` re-supplies its own leading `\n\n`, and `stripped.replace(/\s*$/,"")` trims to the last real content before re-appending, so the marker never abuts prior content.
- **(c) idempotent**: blocks=1 after 2 injects, blocks=1 after 3, `len delta c3→c2 = 0` (modulo the count digit), `no leftover count1: true` — converges, no accumulation.
- **(d) following `## ` section preserved**: the `[followed-by-section]` adversarial case kept `## Keep\nbody` intact while removing `old body`, and the `[no-EOF-newline]` case (the `$` alternation in the lookahead) also worked — proving both lookahead branches.

Test #7 (idempotency) and #8 (unbound-no-op) confirm this in the real hook end-to-end; **8/8 pass**.

Now confirming the P2s and the env override:

**P2 #3 — MAX_ADVANCE NaN guard** (line 74): `Number.isFinite(MAX_ADVANCE_RAW) && MAX_ADVANCE_RAW > 0 ? MAX_ADVANCE_RAW : 3`. A non-numeric env → `parseInt` returns `NaN` → `Number.isFinite(NaN)` is false → falls to `3`. Also guards `0` and negatives (would make `count >= 0` always true / unbounded-inverse). **Closed.**

**P2 #4 — resolveSlot null no-op** (lines 261-264): `if (!slot) approveAndExit(...)` fires before any `resolveNext`/`tryClaim`/`rollNext`. An unbound session can no longer default into alpha's lane. Verified by test #8. **Closed.**

**Env override safety** (lines 63-65): `PRISM_GOAL_CLEAR_
... [+3148 chars truncated]
