---
type: "chat-session"
source: "claude-code-cli"
session_id: "77971357-5bcb-4ccc-a608-c74803591428"
title: "Review the recent edits to `H:/prism/.claude/hooks/pick-prefresh-inject.mjs` aga"
date: "2026-05-17"
first_ts: "2026-05-17T02:13:30.485Z"
last_ts: "2026-05-17T02:14:18.681Z"
cwd: "H:\\PRISM"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/77971357-5bcb-4ccc-a608-c74803591428/subagents/agent-a775424dd377b458a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review the recent edits to `H:/prism/.claude/hooks/pick-prefresh-inject.mjs` aga

> **claude-code-cli** | 2026-05-17 | 10 msgs (4 user / 6 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/77971357-5bcb-4ccc-a608-c74803591428/subagents/agent-a775424dd377b458a.jsonl`

## Transcript

### User | 2026-05-17T02:13:30.485Z

Review the recent edits to `H:/prism/.claude/hooks/pick-prefresh-inject.mjs` against the U-FEEDBACK-FORCING unit spec from `H:/prism/docs/superpowers/specs/2026-05-16-rgs-tool-autoinvoke-MS1-punchlist.md`.

**Context (you have no other conversation history):**
- This is the RGS-TOOL-AUTOINVOKE-MS1 unit U-FEEDBACK-FORCING in the PRISM project at `H:/prism`.
- Unit spec (from punchlist line 28): "Feedback loop will never accumulate data: operators don't type composite `MS::unit` keys → picked events never fire. Needs the hook to fall back to active-claim / CURRENT_POSITION.md."
- This unit replaces the previous `extractUnitKey(prompt)`-only resolution with a 4-tier `resolveUnitKey(prompt, stdin)` fallback chain.
- The hook is a UserPromptSubmit T2 hook for `/pick-unit`, `/pick-task`, `/checkin`, `/pick-build-close`, `/rgs continue`, `/continue-roadmap`. Pure info injection (must NEVER block).
- Sidecar location: `state/shared/roadmap-tool-plans.json`. Picked-events JSONL: `state/shared/roadmap-tool-plan-picked.jsonl`. Schema for picked events: `{v:1, ts, unitKey, sid, resolutionSource, predictedPipelines, tier, verdict, event}`.

**Verify:**
1. The 4-tier resolution chain order is correct (composite-typed > claim-by-bare-id > claim-by-slot > current-position) and each tier is strictly more specific than the next.
2. Resolver returns null cleanly when no signal exists (must not throw — hook contract requires `continue:true` on every path).
3. Stale claims (heartbeat > 30 min OR expiresAt past) are excluded — using a stale claim corrupts the feedback loop.
4. Ambiguous bare-ID matches (two claims tail-match same U-... id) MUST fall through, not pick arbitrary one.
5. The `resolutionSource` field is correctly threaded through `appendPickedEvent` for BOTH `picked` and `stale-on-pickup` events so downstream re-rank can distinguish typed vs fallback-resolved.
6. Env knobs `PRISM_SLOT_TASK_CLAIMS_PATH`, `PRISM_CHAT_SLOTS_PATH`, `PRISM_CURRENT_POSITION_PATH` are honored at ev
... [+1033 chars truncated]

### Assistant | 2026-05-17T02:13:36.201Z

I'll read the relevant files to verify the implementation against the spec.

### Assistant | 2026-05-17T02:13:36.579Z

[tool_use: Read]

### Assistant | 2026-05-17T02:13:36.703Z

[tool_use: Read]

### User | 2026-05-17T02:13:37.679Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * pick-prefresh-inject.mjs — UserPromptSubmit hook for /pick-unit /pick-task /checkin.
5	 *
6	 * Surfaces freshness state BEFORE the chat picks a unit:
7	 *   - MILESTONE_PROGRESS mtime (warn if >30 min stale — regen suggested)
8	 *   - BUILD_STATE mtime + headline counts (so picker knows current wired/unwired)
9	 *   - CLOSE-OUT-CANDIDATES mtime + coun
... [+23858 chars truncated]

### User | 2026-05-17T02:13:37.852Z

[tool_result] 1	/**
2	 * pick-prefresh-resolve.test.mjs — U-FEEDBACK-FORCING (RGS-TOOL-AUTOINVOKE-MS1)
3	 *
4	 * Exercises the 4-tier resolveUnitKey fallback chain in pick-prefresh-inject.mjs:
5	 *   1. composite-typed   — prompt contains MS::U-ID
6	 *   2. claim-by-bare-id  — prompt has bare U-... + matching fresh slot-task-claim
7	 *   3. claim-by-slot     — chat's own fresh slot-task-claim (no ID in prompt)

... [+14694 chars truncated]

### Assistant | 2026-05-17T02:13:40.833Z

Now let me verify the `stable-session-id.mjs` convention to confirm the chatId derivation.

### Assistant | 2026-05-17T02:13:41.135Z

[tool_use: Read]

### User | 2026-05-17T02:13:42.955Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * stable-session-id.mjs — Generates a stable session ID that persists across hook invocations
4	 *
5	 * Problem: Hooks get new PIDs each invocation, so using $PPID creates phantom sessions.
6	 * Solution: Generate a UUID on first invocation for this terminal window, cache it by
7	 *           a stable identifier (WT_SESSION, terminal title hash, or fallback to machin
... [+16794 chars truncated]

### Assistant | 2026-05-17T02:14:18.681Z

I have everything I need. Here is the verdict.

---

**GRADE: PASS**

No P0 or P1 defects found. All 10 spec invariants hold.

---

**Invariant-by-invariant findings:**

**1. Resolution chain order — CORRECT.**
`resolveUnitKey` (lines 235-266) is strictly ordered: composite-typed short-circuits at 235-236, claim-by-bare-id at 240-254, claim-by-slot at 256-258, current-position at 260-264. Each tier is strictly more specific than the next. No tier can interfere with a higher-priority result because all paths `return` immediately on success.

**2. Null on no-signal — CORRECT.**
Line 266 returns `null` cleanly. `main()` handles `resolved === null` gracefully at lines 503, 520. The outer `try/catch` at line 532-533 guarantees `continue:true` on any uncaught exception.

**3. Stale claim exclusion — CORRECT.**
`isClaimFresh` (lines 153-165) checks `expiresAt` first (authoritative), then `lastHeartbeat` against `CLAIM_FRESH_MS = 30 * 60 * 1000`. Both `loadSlotTaskClaims` (claim-by-bare-id loop at line 247) and `lookupOwnSlotClaim` (line 212) gate on `isClaimFresh`. A claim with stale `expiresAt` past AND stale `lastHeartbeat` returns false at line 164.

**4. Ambiguous bare-ID fall-through — CORRECT.**
Lines 244-253: iterates all claims, collects all fresh tail-matches into `matches[]`. Only proceeds when `matches.length === 1`. Two claims matching the same bare id produce `matches.length === 2`, hits the comment at 253, and falls through to claim-by-slot. The test at line 168 ("TWO claims tail-matching same id") exercises this exact path and asserts no event recorded and no tool-plan section emitted.

**5. `resolutionSource` threading — CORRECT.**
`resolveUnitKey` returns `{ unitKey, resolutionSource }` and `main()` passes this object as-is to `buildToolPlanSection(resolved, sid)` at line 515. Inside `buildToolPlanSection`, `resolutionSource` is destructured at line 289 and threaded into both the `stale-on-pickup` event (line 311) and the `picked` event (line 366). Both ev
... [+2689 chars truncated]
