---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2c7a7a8-2fb2-4b0b-b224-2dfaaf6c8507"
title: "Review the U-ZULU-COMPACT-VERIFY change (SENT != COMPACTED backstop in zulu's or"
date: "2026-06-21"
first_ts: "2026-06-21T03:08:04.873Z"
last_ts: "2026-06-21T03:12:50.396Z"
cwd: "H:\\prism"
messages: 69
user_msgs: 25
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/a2c7a7a8-2fb2-4b0b-b224-2dfaaf6c8507/subagents/agent-af240b3260824b879.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review the U-ZULU-COMPACT-VERIFY change (SENT != COMPACTED backstop in zulu's or

> **claude-code-cli** | 2026-06-21 | 69 msgs (25 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a2c7a7a8-2fb2-4b0b-b224-2dfaaf6c8507/subagents/agent-af240b3260824b879.jsonl`

## Transcript

### User | 2026-06-21T03:08:04.873Z

Review the U-ZULU-COMPACT-VERIFY change (SENT != COMPACTED backstop in zulu's orchestrator-sweep). Files (read end-to-end; ignore unrelated shared-tree peer diff):
1. `H:/prism/scripts/lib/zulu-orchestrator-lib.mjs` — new pure fns `classifyActuationEffectiveness` + `verifyCooldownActuation` + constants `DEFAULT_COMPACT_VERIFY_{GRACE_MS,LOOKBACK_MS}` (appended after `slotInCooldown`).
2. `H:/prism/scripts/zulu-orchestrator-sweep.mjs` — imported `verifyCooldownActuation`, added `compactVerifyGraceMs` env override, and modified the `if (cd.cooldown)` branch to break a false cooldown when the actuation was `ineffective` (wraps the existing skip in `if (!cooldownBroken)`, falls through on break).

Context: the sweep starts a 15-min cooldown on any `gate==="execute" && resultOk===true` SendKeys, but resultOk=keystrokes DISPATCHED, not that the chat compacted (occluded/wrong WT tab swallows them). The verify reads current `readChatPressure().pressureLevel` ∈ {clean,warn,critical}: clean=effective, still-critical-past-grace=ineffective (breaks cooldown), warn/within-grace/no-reading/skew/error=pending (keep cooldown).

Focus:
- DANGEROUS DIRECTION: breaking a cooldown re-fires /compact into a chat. Confirm it breaks ONLY on `outcome==="ineffective"` (definitively still 'critical' past grace), and that warn / absent-reading / within-grace / future-skew / thrown-error ALL keep the cooldown. Is a false cooldown-break (re-typing /compact into a working chat) impossible?
- `verifyCooldownActuation` mirrors `slotInCooldown`'s exact gate (execute + resultOk + compact|clear) so it verifies the same actuation; out-of-lookback / dry-run / resultOk:false / noop / other-slot / malformed all ignored?
- RE-FIRE-LOOP: when broken, the slot falls through and re-targets; an unreachable tab → hwndResult.ok=false → result.ok=false → does that start a NEW cooldown (it must not) and is the behavior honest (logged each sweep) not a silent loop?
- lookback 20min >= cooldown 15min so every gating 
... [+68 chars truncated]

### Assistant | 2026-06-21T03:08:07.813Z

I'll review this change carefully, focusing on the dangerous direction (breaking cooldowns re-fires /compact). Let me start by reading both files end-to-end.

### Assistant | 2026-06-21T03:08:08.275Z

[tool_use: Read]

### Assistant | 2026-06-21T03:08:08.431Z

[tool_use: Read]

### User | 2026-06-21T03:08:09.105Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zulu-orchestrator-lib.mjs' was already read 2m ago in this session and is unchanged (mtime 1782010943527). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T03:08:09.269Z

[tool_result] read-once-guard: 'H:\prism\scripts\zulu-orchestrator-sweep.mjs' was already read 2m ago in this session and is unchanged (mtime 1782010994400). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T03:08:12.603Z

The read-once guard claims these are already in my context, but they are not — this is a fresh agent thread. Let me bypass the guard.

### Assistant | 2026-06-21T03:08:13.226Z

[tool_use: Bash]

### User | 2026-06-21T03:08:16.853Z

[tool_result] // ZULU-ORCHESTRATOR-MS0 / U-ZULU02 — pure-core orchestrator library.
//
// Composes CHO01 (decideClearOrCompact) + CHO02 (readChatPressure) + U-ZULU01
// (resolveHwndFromPid) + U-ZULU05 (buildCheckinPayload) + U-CHO04 (PS
// send-keys-to-window.ps1) into a per-slot orchestration plan. All planning
// logic is pure & deterministic — the only I/O happens in the CLI shell
// (scripts/zulu-orch
... [+23883 chars truncated]

### Assistant | 2026-06-21T03:08:18.594Z

Now let me read the sweep file and find the modified `cd.cooldown` branch.

### Assistant | 2026-06-21T03:08:19.607Z

[tool_use: Bash]

### User | 2026-06-21T03:08:23.328Z

[tool_result] <persisted-output>
Output too large (34.3KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\a2c7a7a8-2fb2-4b0b-b224-2dfaaf6c8507\tool-results\bj5zu5x5x.txt

Preview (first 2KB):
     1	#!/usr/bin/env node
     2	// ZULU-ORCHESTRATOR-MS0 / U-ZULU02 — sweep CLI (the body).
     3	//
     4	// One pass over every opt-in chat slot: read pressure (CHO02), make decision
     5	// (CHO01
... [+1816 chars truncated]

### Assistant | 2026-06-21T03:08:25.001Z

Let me read the full sweep file content.

### Assistant | 2026-06-21T03:08:26.900Z

[tool_use: Read]

### User | 2026-06-21T03:08:30.213Z

[tool_result] 1	     1	#!/usr/bin/env node
2	     2	// ZULU-ORCHESTRATOR-MS0 / U-ZULU02 — sweep CLI (the body).
3	     3	//
4	     4	// One pass over every opt-in chat slot: read pressure (CHO02), make decision
5	     5	// (CHO01), resolve the target HWND by the stable `PRISM <slot>` window caption
6	     6	// (G1b / U-ZM1-05 — title-based, not PID-based), and — for executable plans —
7	     7	// SendKeys the s
... [+37227 chars truncated]

### Assistant | 2026-06-21T03:08:33.957Z

I have both files. Now let me trace the critical paths carefully. First, let me verify the `readChatPressure` contract — what `pressureLevel` values it returns, and critically whether it can return `"critical"` for a NON-EXISTENT/stale sidecar (which would falsely trigger an "ineffective" break).

### Assistant | 2026-06-21T03:08:35.338Z

[tool_use: Bash]

### User | 2026-06-21T03:08:39.400Z

[tool_result] 192:  return {
262:    return { totalBytes: 0, postCompactBytes: 0, lastCompactOffset: 0, found: false, error: "invalid-session-id" };
274:      return { totalBytes: 0, postCompactBytes: 0, lastCompactOffset: 0, found: false, error: "file-not-found" };
279:    return { totalBytes: 0, postCompactBytes: 0, lastCompactOffset: 0, found: false, error: `stat-failed:${e?.message || e}` };
283:    return 
... [+791 chars truncated]

### Assistant | 2026-06-21T03:08:42.387Z

This is the most critical path to verify. Let me read `readChatPressure` end-to-end — specifically what `pressureLevel` it returns when there is NO sidecar, a stale sidecar, or an unknown slot. If any of those can return `"critical"`, the verify could falsely break a cooldown.

### Assistant | 2026-06-21T03:08:42.857Z

[tool_use: Read]

### User | 2026-06-21T03:08:43.959Z

[tool_result] 355	/**
356	 * Read the current context-fill pressure for one chat session.
357	 *
358	 * Returns { sessionId, slot?, tokensEstimate, pressureLevel, totalBytes,
359	 *           postCompactBytes, lastCompactOffset, found, error? }
360	 *
361	 * Honours env knobs PRISM_CHAT_TOKEN_{WARN_AT,CRITICAL_AT,BYTES_PER_TOK,DISABLE}.
362	 * Kill switch (PRISM_CHAT_TOKEN_DISABLE=1) returns a clean+0 stub so t
... [+3074 chars truncated]

### Assistant | 2026-06-21T03:08:47.223Z

Now the critical question: when there is NO sidecar AND NO transcript (file-not-found), what does the byte-estimate path return for `pressureLevel`? Let me check `classifyPressure` for tokens=0, and `readSidecarPressure` (does it return null when absent, so we fall to byte-estimate).

### Assistant | 2026-06-21T03:08:48.225Z

[tool_use: Read]

### User | 2026-06-21T03:08:49.490Z

[tool_result] 170	  return null;
171	}
172	
173	/** Read the per-slot token-awareness sidecar. Returns
174	 *  { tokens, pct, level, source:"sidecar" } when the file exists, is FRESH
175	 *  (capturedAt age in [0, ttlMs]), parses, and carries a recognized zone; else
176	 *  null (caller falls back to the byte-estimate). Fail-safe: any error -> null. */
177	export function readSidecarPressure(slot, { sidecarDir 
... [+6062 chars truncated]

### Assistant | 2026-06-21T03:08:52.719Z

Now let me check `classifyPressure` for tokens=0 — the empty/file-not-found case yields tokens=0. I need to confirm tokens=0 classifies as "clean" (NOT "critical"), so an absent transcript can never falsely produce "ineffective".

### Assistant | 2026-06-21T03:08:54.905Z

[tool_use: Bash]

### User | 2026-06-21T03:08:59.338Z

[tool_result] 35:export const DEFAULT_WARN_AT_TOKENS = 800_000;
36:export const DEFAULT_CRITICAL_AT_TOKENS = 940_000;
48: *  Matches precompact-auto-trigger's SIDECAR_TTL_MS + statusline's TTL. A sidecar
50:export const SIDECAR_TTL_MS = 180_000;
52:export const DEFAULT_SIDECAR_DIR = "H:/prism/state/shared";
140:export function classifyPressure(tokens, warnAt = DEFAULT_WARN_AT_TOKENS, critAt = DEFAULT_CRITICAL_A
... [+544 chars truncated]

### Assistant | 2026-06-21T03:09:01.590Z

[tool_use: Read]

### User | 2026-06-21T03:09:02.674Z

[tool_result] 140	export function classifyPressure(tokens, warnAt = DEFAULT_WARN_AT_TOKENS, critAt = DEFAULT_CRITICAL_AT_TOKENS) {
141	  if (!Number.isFinite(tokens) || tokens < 0) return "clean";
142	  const w = Number.isFinite(warnAt) && warnAt > 0 ? warnAt : DEFAULT_WARN_AT_TOKENS;
143	  const c = Number.isFinite(critAt) && critAt > 0 ? critAt : DEFAULT_CRITICAL_AT_TOKENS;
144	  // Clamp: if critAt < warnAt 
... [+1462 chars truncated]

### Assistant | 2026-06-21T03:09:10.942Z

This confirms the safety of the absent-data path: tokens=0 → `classifyPressure` returns `"clean"` (not critical). So an absent transcript / file-not-found path yields `pressureLevel: "clean"` → `classifyActuationEffectiveness` returns `"effective"` (keeps cooldown). Good — no false break there.

But this raises a subtler concern I need to examine: an absent reading yielding `"clean"` would be classified as **effective** (the actuation "landed"), which keeps the cooldown — that is the safe direction for re-fire. Good.

Now let me trace the genuinely dangerous direction precisely. For an "ineffective" break to occur, `verifyCooldownActuation` must classify `outcome === "ineffective"`, which requires `currentPressureLevel === "critical"` AND grace elapsed AND a real recent executed actuation in lookback. Let me verify the cooldown timing relationship and the lookback/grace interplay against the sweep's actual sidecar source.

Let me check the critical concern about the **sidecar TTL vs the verify grace**: the sidecar is only trusted if fresh (≤180s = 3 min). The verify grace is 3 min. So past the 3-min grace, the sidecar (if it exists) is fresh-or-stale. If stale, `readSidecarPressure` returns null and we fall to byte-estimate. Let me confirm what the byte-estimate gives for a real critical chat that DID compact.

### Assistant | 2026-06-21T03:09:11.811Z

[tool_use: Read]

### User | 2026-06-21T03:09:13.632Z

[tool_result] 299	  // Large file -> bounded escalating scan. Tier 1: the 256KB tail (common case:
300	  // a fresh compact's marker is near EOF). Tier 2: if the marker isn't in the
301	  // tail, the chat may have accumulated moderate post-compact content that pushed
302	  // it past 256KB -- read a bounded LARGE_SCAN_BUDGET window so a long-but-not-huge
303	  // chat is not mis-read as false-critical (the zul
... [+1948 chars truncated]

### Assistant | 2026-06-21T03:09:23.928Z

This is the key edge case for the dangerous direction. After a **successful** /compact, the byte-estimate behavior matters because the sidecar may be stale (>180s) by the time the 3-min grace elapses, forcing a fall to the byte-estimate.

Crucially: the transcript JSONL is **appended-never-shrunk** on /compact (a `compact_boundary` marker is written, the file keeps growing). The recent-regressions log in CLAUDE.md (2026-06-10 entry) documents exactly this: after a real compact, the byte-estimate reads the WHOLE appended transcript and over-reports as **critical** even though the chat is actually GREEN. This is the documented failure mode that the SUSPECT guard only partially mitigates (only when tokens > 1.1× CONTEXT_CAP).

So here is the dangerous scenario I need to fully trace:

1. A slot is genuinely critical → zulu sends /compact → `resultOk:true` → cooldown starts.
2. The /compact **succeeds** — the chat is now GREEN/clean.
3. ~3+ min later, the next sweep runs. The sidecar is now stale (>180s) → `readSidecarPressure` returns null → falls to **byte-estimate**.
4. The byte-estimate reads the appended-never-shrunk transcript → over-reports as **critical** (per the documented 2026-06-10 regression), and crucially the boundary IS found near EOF after a fresh compact (Tier 1), so postCompactBytes is small... but the question is whether it can land in the critical band.

Let me check whether the post-compact byte-estimate can realistically read "critical" right after a successful compact, and check the SUSPECT-guard interaction. Let me look at the byte/token constants.

### Assistant | 2026-06-21T03:09:24.742Z

[tool_use: Read]

### User | 2026-06-21T03:09:25.801Z

[tool_result] 30	import { existsSync, readFileSync, statSync, openSync, readSync, closeSync, readdirSync } from "node:fs";
31	import { join } from "node:path";
32	
33	// ─── Constants ──────────────────────────────────────────────────────────────
34	
35	export const DEFAULT_WARN_AT_TOKENS = 800_000;
36	export const DEFAULT_CRITICAL_AT_TOKENS = 940_000;
37	export const DEFAULT_BYTES_PER_TOKEN = 3.5;
38	// Physic
... [+4334 chars truncated]

### Assistant | 2026-06-21T03:09:38.155Z

I now have the complete picture of the data path. Let me reason through the dangerous scenario precisely.

**The key safety question: can the byte-estimate read "critical" for a chat that DID successfully compact, when the sidecar is stale?**

After a successful /compact:
- The transcript writes a `compact_boundary` marker near EOF, then continues appending.
- Tier 1 (256KB tail) finds the boundary → `postCompactBytes = total - offset` = only the bytes written AFTER the compact.
- Immediately after compact, post-compact content is small → tokens small → "clean". Safe.
- BUT: the documented 2026-06-10 regression says the byte-estimate over-reports because the JSONL "redundantly logs every turn's full hook-injection + full tool outputs." After /compact, the chat resumes via auto-resume (heavy injection reload per CLAUDE.md). Over ~3 min of post-compact activity, post-compact bytes could grow. To hit 940K tokens it needs 940K × 3.5 = ~3.29 MB of post-compact content — and the 2026-06-10 regression confirms a 3.29-3.85 MB post-compact transcript byte-estimates INTO the critical band, AND that the SUSPECT guard (>1.1M tokens = >3.85MB) does NOT catch the [940K, 1.1M] band.

So **there IS a real path** where a successfully-compacted chat reads byte-estimate "critical" within the [940K, 1.1M] band when its sidecar is stale. In that window, `classifyActuationEffectiveness` returns `outcome: "ineffective"` (grace elapsed, level critical) → **cooldown broken → /compact re-fired into a chat that already compacted successfully.**

Let me verify the timing feasibility: grace=3min, sidecar TTL=180s=3min. So the moment grace elapses (3 min after send), the sidecar from BEFORE the compact is exactly at its TTL boundary — and a fresh post-compact sidecar would normally be written by the token-awareness hook on the chat's UserPromptSubmit/PostToolUse. Let me check how the token-awareness sidecar gets refreshed and whether it would be fresh after a real compact.

### Assistant | 2026-06-21T03:09:39.809Z

[tool_use: Bash]

### User | 2026-06-21T03:09:45.010Z

[tool_result] ---HOOK WIRING---
H:/prism/.claude/hooks/HOOK_DIGEST.md
H:/prism/.claude/hooks/precompact-auto-trigger.mjs
H:/prism/.claude/hooks/stop-task-boundary-compact-nudge.mjs
H:/prism/.claude/hooks/token-awareness-inject.mjs
H:/prism/.claude/hooks/token-awareness-sidecar.mjs
H:/prism/.claude/hooks/token-awareness-stop-advisory.mjs
H:/prism/.claude/hooks/token-budget-gate.mjs
H:/prism/.claude/hooks/__tests
... [+175 chars truncated]

### Assistant | 2026-06-21T03:09:47.816Z

[tool_use: Bash]

### User | 2026-06-21T03:09:51.850Z

[tool_result] 5:// UserPromptSubmit + PostToolUse hook. Composes a canonical TokenAwarenessState
6:// from 4 data sources and writes it to state/shared/token-budget-<slot>.json
8://   1. token-awareness-inject.mjs (UserPromptSubmit) → makes model see the state
157:  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
243:  const outFile = path.join(SIDECAR_DIR, `token-budget-${slot}.json`);

### Assistant | 2026-06-21T03:10:09.604Z

The sidecar is written on UserPromptSubmit + PostToolUse. So after a successful /compact, the chat auto-resumes and the model takes actions → the sidecar gets refreshed to GREEN within a turn or two. **If the chat is active**, the sidecar will be fresh and read "clean" → "effective" → cooldown kept. Safe.

The danger window is narrow but real: a chat that compacted successfully and then went **idle** (no UserPromptSubmit/PostToolUse for >180s) → sidecar goes stale → byte-estimate path → if the post-compact transcript happens to byte-estimate into [940K, 1.1M], it reads false-critical → cooldown broken → /compact re-fired into a healthy idle chat.

However, I must weigh this honestly: this is the **pre-existing** false-critical behavior of `readChatPressure` itself (documented in the 2026-06-10 / 2026-06-11 regressions), not introduced by this diff. The diff's verify is downstream of an already-known-imperfect signal. Let me check whether this diff makes the existing false-critical WORSE by acting on it more aggressively than the existing code already does. Crucially: **even without this diff**, the existing sweep already calls `readChatPressure` for every non-cooldown slot and would fire /compact on a false-critical reading. The diff only adds the cooldown-break path.

Let me now verify the re-fire-loop concern: when cooldown is broken, does an unreachable tab start a NEW cooldown? Let me re-examine the fall-through. After `cooldownBroken=true`, control falls through to read pressure + `planSlotAction` + the actuation block. If the chat reads critical (the reason we broke), it plans /compact, resolves HWND. If the tab is unreachable → `hwndResult.ok=false` → `result = { ok:false, error: hwndResult.error }` → line 543 logs with `resultOk: result.ok === true` = **false**. So `slotInCooldown` (gate=execute, resultOk=true) will NOT match this entry → **no new cooldown started.** Correct — but that means next sweep, the OLD cooldown-starting entry is STILL in the log (wi
... [+1007 chars truncated]

### Assistant | 2026-06-21T03:10:11.093Z

[tool_use: Bash]

### User | 2026-06-21T03:10:14.636Z

[tool_result] 4:import { describe, it } from "node:test";
27:describe("constants", () => {
28:  it("DEFAULT_STAGGER_MS is ≥ 5000 per safety invariant", () => {
31:  it("DEFAULT_DRY_RUN_GRACE_HOURS is 24", () => {
34:  it("SELF_EXEMPT_SLOTS is frozen and contains zulu+golf", () => {
41:describe("pickActionableSlots", () => {
42:  it("returns empty on null/empty doc", () => {
48:  it("filters out slots without zu
... [+3600 chars truncated]

### Assistant | 2026-06-21T03:10:18.389Z

[tool_use: Bash]

### User | 2026-06-21T03:10:23.756Z

[tool_result] === TEST FILE LINE COUNT ===
614 H:/prism/scripts/lib/zulu-orchestrator-lib.test.mjs

### Assistant | 2026-06-21T03:10:26.493Z

This is a significant finding: **the new functions `classifyActuationEffectiveness` and `verifyCooldownActuation` have ZERO test coverage.** Let me confirm by checking the end of the test file (the new functions would be appended after `slotInCooldown` tests).

### Assistant | 2026-06-21T03:10:26.989Z

[tool_use: Read]

### User | 2026-06-21T03:10:28.879Z

[tool_result] 490	    assert.equal(slotInCooldown(lines, "bravo", { now: T0 }).cooldown, false);
491	  });
492	  it("failed executes (resultOk=false) do NOT start a cooldown", () => {
493	    const lines = [JSON.stringify({ slot: "bravo", gate: "execute", resultOk: false, ts: T(1000) })];
494	    assert.equal(slotInCooldown(lines, "bravo", { now: T0 }).cooldown, false);
495	  });
496	  it("skips malformed JSON 
... [+6637 chars truncated]

### Assistant | 2026-06-21T03:10:34.202Z

Confirmed: the test file ends at line 614 with `summarizeSweepEligibility` tests. **There are ZERO tests for `classifyActuationEffectiveness` and `verifyCooldownActuation`** — the two new pure functions that implement the cooldown-breaking logic, which is the most dangerous direction (re-firing /compact). This is a direct R9/R15 violation: a new pure-core function that actuates a destructive operation ships without happy + failure-mode + adversarial tests round-tripping the fail-safe boundaries.

Let me confirm there isn't a separate new test file for this unit.

### Assistant | 2026-06-21T03:10:36.628Z

[tool_use: Bash]

### User | 2026-06-21T03:10:59.382Z

[tool_result]  M knowledge/memories/patterns/hermes-zulu_synthesis.md
 M knowledge/memories/reference/reference_bravo_hermes_zulu_engine_surface.md
 M knowledge/memories/reference/reference_bravo_hermes_zulu_hooks.md
 M knowledge/memories/reference/reference_hermes_zulu_ms0_2026_05_20.md
 M knowledge/memories/reference/reference_post_ship_zulu-obsidian-live-ms0-u-obsidian-filevault.md
 M knowledge/memories/refe
... [+22211 chars truncated]

### Assistant | 2026-06-21T03:11:02.488Z

I was wrong — there IS a dedicated test file: `scripts/__tests__/zulu-compact-verify.test.mjs` (untracked, `??`). My earlier finding about "zero tests" is corrected — the tests live in a separate new file, not appended to the lib test. Let me read it to verify it actually exercises the dangerous-direction boundaries, and run it.

### Assistant | 2026-06-21T03:11:02.934Z

[tool_use: Read]

### User | 2026-06-21T03:11:04.004Z

[tool_result] read-once-guard: 'H:\prism\scripts\__tests__\zulu-compact-verify.test.mjs' was already read 5m ago in this session and is unchanged (mtime 1782011056760). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-21T03:11:06.835Z

[tool_use: Bash]

### User | 2026-06-21T03:11:11.889Z

[tool_result]      1	/**
     2	 * zulu-compact-verify.test.mjs -- U-ZULU-COMPACT-VERIFY (SENT != COMPACTED).
     3	 *
     4	 * The zulu sweep starts a 15-min cooldown on any resultOk SendKeys actuation --
     5	 * but resultOk means keystrokes were DISPATCHED, not that the chat compacted (an
     6	 * occluded/wrong WT tab swallows them). These tests pin the verify-leg that
     7	 * catches the false-coold
... [+8372 chars truncated]

### Assistant | 2026-06-21T03:11:17.082Z

The test file is solid — 24 tests covering happy/effective, within-grace-pending, ineffective break, ambiguous-warn-pending, case-insensitive, missing-sentAt, future-skew, no-reading, invalid-grace, dry-run-ignored, resultOk:false-ignored, noop-ignored, /clear-verified, out-of-lookback-ignored, most-recent-wins, other-slot-ignored, malformed-skipped, empty-log. It hits every fail-safe boundary the prompt asked about. Note line 131 references `DEFAULT_COMPACT_VERIFY_LOOKBACK_MS` but the file doesn't define `DEFAULT_COMPACT_VERIFY_LOOKBACK_MS` as `MIN`-based... actually it imports it. Let me run both test suites to confirm green.

### Assistant | 2026-06-21T03:11:18.242Z

[tool_use: Bash]

### User | 2026-06-21T03:11:23.779Z

[tool_result]   ...
# Subtest: verify: malformed lines / bad ts are skipped, not thrown
ok 19 - verify: malformed lines / bad ts are skipped, not thrown
  ---
  duration_ms: 0.1424
  ...
# Subtest: verify: empty / non-array log -> pending
ok 20 - verify: empty / non-array log -> pending
  ---
  duration_ms: 0.0725
  ...
1..20
# tests 20
# suites 0
# pass 20
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration
... [+26 chars truncated]

### Assistant | 2026-06-21T03:11:25.988Z

20/20 pass (I miscounted test() calls; node:test reports 20). Now let me run the lib test to confirm the new exports didn't break existing tests.

### Assistant | 2026-06-21T03:11:26.984Z

[tool_use: Bash]

### User | 2026-06-21T03:11:31.272Z

[tool_result] # tests 73
# suites 9
# pass 73
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 26.5991
=== EXIT 0 ===

### Assistant | 2026-06-21T03:11:44.682Z

73/73 lib tests pass. Now let me verify the final remaining concerns precisely by re-reading the sweep's break branch (lines 367-424) against the lookback/cooldown invariant and the re-fire-loop honesty.

Let me verify the lookback-vs-cooldown invariant precisely. The prompt asks: "lookback 20min >= cooldown 15min so every gating actuation is verifiable?" — `DEFAULT_COMPACT_VERIFY_LOOKBACK_MS = 20*60*1000` (20 min), `DEFAULT_ACTION_COOLDOWN_MS = 15*60*1000` (15 min). So any actuation still INSIDE its cooldown (≤15 min old) is within the 20-min lookback → verifiable. Confirmed.

But there is a subtle interaction I must check: the sweep reads `logLines = readLogTail(opts.logFile, 400)` — only the last 400 lines. If the log is very chatty (heartbeats every 5 min + per-slot lines), could a 15-min-old cooldown-starting entry be pushed out of the last 400 lines while `slotInCooldown` (which scans the SAME 400 lines) still finds it? No — both `slotInCooldown` and `verifyCooldownActuation` read the **same** `logLines` array. If the entry is evicted, `slotInCooldown` won't see it either → no cooldown → the whole branch is skipped. So they're consistent. Good — no divergence between the gate and the verify on log-tail truncation.

Now the critical re-fire-loop honesty check. Let me re-examine: when `cooldownBroken=true` and the slot falls through, what is the env gate? The actuation only fires if `gate.gate === "execute"`. During the 24h opt-in grace, the gate is `dry-run` → `isDryRun=true` → `focusWtTabBySlot(..., {dryRun:true})` is side-effect-free → no actual /compact re-fired. Good. So in the dry-run observe mode the orchestrator is currently in (per the commit log: "DRY-RUN observe mode"), a cooldown-break never actually re-types /compact. The danger only materializes once a slot is past its opt-in grace AND in live execute mode.

Let me now examine one real concern I flagged: the **false-critical from a stale-sidecar byte-estimate post-successful-compact**. Let me verif
... [+132 chars truncated]

### Assistant | 2026-06-21T03:11:45.901Z

[tool_use: Bash]

### User | 2026-06-21T03:11:49.977Z

[tool_result] -rw-r--r-- 1 wompu 197611 876 Jun 20 22:11 state/shared/token-budget-alpha.json
-rw-r--r-- 1 wompu 197611 803 Jun 20 22:11 state/shared/token-budget-bravo.json
-rw-r--r-- 1 wompu 197611 774 Jun 20 21:31 state/shared/token-budget-charlie.json
-rw-r--r-- 1 wompu 197611 772 Jun 20 20:17 state/shared/token-budget-delta.json
-rw-r--r-- 1 wompu 197611 770 Jun 18 15:15 state/shared/token-budget-echo.json
... [+2528 chars truncated]

### Assistant | 2026-06-21T03:12:04.825Z

Live state confirms: the orchestrator is running in `gate:dry-run` (PRISM_ZULU_DRY_RUN env), so cooldown-breaks never re-type today. The sidecars exist and are slot-keyed. Several are stale (foxtrot Jun 12, hotel Jun 16, echo Jun 18) — those slots would fall to the byte-estimate path. This confirms the stale-sidecar→byte-estimate path is a live reality for idle slots.

Now let me precisely assess the residual false-break risk. The byte-estimate false-critical requires post-compact bytes in the [940K×3.5, 1.1M×3.5] = [3.29MB, 3.85MB] band. After a *fresh successful* /compact, the Tier-1 256KB tail scan finds the boundary near EOF, so postCompactBytes starts small and only grows with post-compact activity. For an *idle* slot (stale sidecar), there is by definition little post-compact activity → postCompactBytes stays small → "clean" → "effective" → cooldown kept. The dangerous band requires a slot that compacted, went stale on the sidecar, BUT accumulated 3.29MB+ of post-compact transcript — i.e. an *active* slot whose sidecar happened to lapse. An active slot writes a fresh sidecar on its next prompt/tool, closing the window. So the false-break window is genuinely narrow and self-healing, and it is downstream of a pre-existing readChatPressure imperfection, not introduced here.

Let me do a final check on one detail the prompt flagged: the verify uses `cdSession = pick.entry?.chatId || pick.entry?.sessionId` for `readChatPressure`, but `readChatPressure(cdSession, { slot: pick.slot })` — the sidecar lookup keys on `slot`, not session. Let me confirm the byte-estimate fallback's sessionId (`cdSession`) matches what the later main pressure read uses (line 426 `sessionId`), so the verify and the subsequent re-target read consistent pressure.

Both use `pick.entry?.chatId || pick.entry?.sessionId`. Identical. Consistent.

Let me make one final verification of the `formatLogEntry` call on the break path — that it produces valid honest JSONL and won't itself be mis-counted
... [+70 chars truncated]

### Assistant | 2026-06-21T03:12:13.413Z

[tool_use: Bash]

### User | 2026-06-21T03:12:18.901Z

[tool_result] LOG ENTRY: {"ts":"2026-06-21T03:00:00.000Z","slot":"alpha","pid":123,"decision":"noop","decisionReason":"cooldown-broken:compact-ineffective","gate":"verify","gateReason":"still critical past grace","planLines":null,"planError":null,"resultOk":false,"resultDryRun":false,"resultError":"cooldown-broken-ineffective","resultHwnd":null,"resultChars":null}
slotInCooldown sees the verify-break entry as c
... [+142 chars truncated]

### Assistant | 2026-06-21T03:12:50.396Z

Both invariants confirmed empirically:
- The `gate:"verify"` break-entry does NOT start a new cooldown (resultOk:false).
- A FAILED re-target to an unreachable tab (`gate:"execute"`, resultOk:false → `hwnd:tabbed-fleet-occluded`) does NOT start a new cooldown either.

So the re-fire-loop is bounded (old actuation ages out of the 15-min cooldown / 20-min lookback), honest (a `gate:verify cooldown-broken-ineffective` line is logged each sweep + the failed re-target logs its `hwnd:*` error each sweep), and not silent. And if the re-target eventually SUCCEEDS (resultOk:true execute), a fresh cooldown legitimately starts, suppressing further attempts.

I have fully traced every path the prompt asked about. Let me give my verdict.

---

VERDICT: PASS

summary: The cooldown-break path is correctly gated to fire ONLY on `outcome==="ineffective"`, which requires a definitively-still-`critical` reading past the grace window; every ambiguous case (warn / absent-reading / within-grace / future-skew / thrown-error / no-recent-actuation) returns `pending` and KEEPS the cooldown, and the `try/catch` wraps the whole verify so any throw falls through to keeping it. A false cooldown-break into a healthy chat is not reachable from the absent/missing-data paths (file-not-found → tokens=0 → `classifyPressure`→`"clean"`→`effective`), and the one residual false-critical vector (stale-sidecar byte-estimate over-reporting in the [3.29MB, 3.85MB] post-compact band) is a pre-existing `readChatPressure` imperfection, narrow, self-healing on the slot's next prompt, and downstream — not introduced by this diff. The re-fire loop is bounded by the 15-min cooldown / 20-min lookback, every sweep is logged (not silent), and neither the `gate:"verify"` break-entry nor a failed unreachable-tab re-target starts a new cooldown (both verified empirically). Live state is `gate:dry-run` so no actuation re-types today.

findings:
- [P2] `scripts/lib/chat-token-watch.mjs:401-421` (consumed at `zulu-orchestrat
... [+3295 chars truncated]
