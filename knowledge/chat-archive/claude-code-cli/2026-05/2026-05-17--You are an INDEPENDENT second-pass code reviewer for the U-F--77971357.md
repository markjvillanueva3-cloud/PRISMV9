---
type: "chat-session"
source: "claude-code-cli"
session_id: "77971357-5bcb-4ccc-a608-c74803591428"
title: "You are an INDEPENDENT second-pass code reviewer for the U-FEEDBACK-FORCING unit"
date: "2026-05-17"
first_ts: "2026-05-17T02:13:53.852Z"
last_ts: "2026-05-17T02:15:57.832Z"
cwd: "H:\\PRISM"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/77971357-5bcb-4ccc-a608-c74803591428/subagents/agent-a54f60a1737891f10.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# You are an INDEPENDENT second-pass code reviewer for the U-FEEDBACK-FORCING unit

> **claude-code-cli** | 2026-05-17 | 26 msgs (11 user / 15 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/77971357-5bcb-4ccc-a608-c74803591428/subagents/agent-a54f60a1737891f10.jsonl`

## Transcript

### User | 2026-05-17T02:13:53.852Z

You are an INDEPENDENT second-pass code reviewer for the U-FEEDBACK-FORCING unit shipping in slot lima. Do NOT assume the wiring-review-agent has caught everything — your weighting is opposite.

**Files to review (read end-to-end):**
1. `H:/prism/.claude/hooks/pick-prefresh-inject.mjs` — adds `resolveUnitKey` 4-tier fallback for bare U-... IDs in `/pick-unit`, `/checkin`, etc. Was: only composite `MS::U-...` resolved → 0% feedback events.
2. `H:/prism/.claude/hooks/__tests__/pick-prefresh-resolve.test.mjs` — 13 hermetic tests for the new resolver.
3. `H:/prism/.claude/hooks/__tests__/pick-prefresh-tool-plan.test.mjs` — pre-existing tests; one fixture line (SAMPLE_SIDECAR_ENTRY) was de-nested to match the post-U-INTEG-FIX-P0 flat sidecar schema (this was a silent stale fixture surfaced by re-running tests).

**Context:** PRISM is a multi-chat shared repo at `H:/prism`. Project conventions in `H:/prism/CLAUDE.md`. The hook executes via Node on every UserPromptSubmit — it MUST be fast (<50ms target) and MUST NEVER block (always emit `{continue:true}`). Telemetry sinks: `roadmap-tool-plan-picked.jsonl`.

**Weight your review toward what the contract/wiring reviewer is UNLIKELY to catch:**

- **Security**: a malicious prompt typed by an operator could contain crafted U-... ids or composite keys. Can it cause path traversal, JSON injection into the JSONL, prototype-pollution via `Object.entries(claims)`, or regex catastrophic backtracking on `BARE_UNIT_ID_RX` / `COMPOSITE_RX` / the CURRENT_POSITION shapes? The regex `/\bU-[A-Z][A-Z0-9-]{0,80}\b/` — is the {0,80} cap correct, is there a ReDoS risk in any alternation?
- **Concurrency**: `appendPickedEvent` uses `fs.appendFileSync`. On Windows under multi-chat load (12 concurrent chats firing the same hook), is partial-write interleave possible? Does it matter for the downstream consumer (rgs-outcome-record-stop)?
- **State mutation**: the resolver reads `state/shared/slot-task-claims.json` and `state/shared/chat-slots.json`
... [+1455 chars truncated]

### Assistant | 2026-05-17T02:13:59.208Z

I'll review the three files end-to-end with focus on what a contract reviewer would miss: security, concurrency, telemetry integrity, and downstream consumer breakage.

### Assistant | 2026-05-17T02:13:59.283Z

[tool_use: Read]

### User | 2026-05-17T02:14:01.052Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\pick-prefresh-inject.mjs' was already read 24s ago in this session and is unchanged (mtime 1778983005051). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-17T02:14:04.188Z

[tool_use: Bash]

### User | 2026-05-17T02:14:08.623Z

[tool_result] #!/usr/bin/env node
// tier: T2
/**
 * pick-prefresh-inject.mjs — UserPromptSubmit hook for /pick-unit /pick-task /checkin.
 *
 * Surfaces freshness state BEFORE the chat picks a unit:
 *   - MILESTONE_PROGRESS mtime (warn if >30 min stale — regen suggested)
 *   - BUILD_STATE mtime + headline counts (so picker knows current wired/unwired)
 *   - CLOSE-OUT-CANDIDATES mtime + count (so picker doesn
... [+10919 chars truncated]

### Assistant | 2026-05-17T02:14:11.712Z

[tool_use: Bash]

### User | 2026-05-17T02:14:19.346Z

[tool_result]     if (matches.length === 1) {
      return { unitKey: matches[0].unitId, resolutionSource: "claim-by-bare-id" };
    }
    // Multiple matches → ambiguous; fall through rather than guess.
  }

  if (claims) {
    const own = lookupOwnSlotClaim(stdin?.session_id, claims);
    if (own) return { unitKey: own.unitId, resolutionSource: "claim-by-slot" };
  }

  const cp = readCurrentPosition();
  if 
... [+9348 chars truncated]

### Assistant | 2026-05-17T02:14:22.633Z

[tool_use: Bash]

### User | 2026-05-17T02:14:29.658Z

[tool_result]   // /loop alone is NOT a prefresh trigger — only participates in tool-plan injection
  // when the resolver returns a unit (typed composite OR fallback-resolved).
  const loopWithUnitId = LOOP_RX.test(prompt) && resolved !== null;

  if (!fullPrefreshTrigger && !loopWithUnitId) {
    // Fast path: emit minimal continue:true, no hookSpecificOutput
    process.stdout.write(JSON.stringify({ continue
... [+791 chars truncated]

### Assistant | 2026-05-17T02:14:31.548Z

Now let me check the test files and downstream consumers.

### Assistant | 2026-05-17T02:14:32.236Z

[tool_use: Read]

### User | 2026-05-17T02:14:32.823Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\__tests__\pick-prefresh-resolve.test.mjs' was already read 55s ago in this session and is unchanged (mtime 1778983022657). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-05-17T02:14:35.402Z

[tool_use: Bash]

### User | 2026-05-17T02:14:41.487Z

[tool_result] /**
 * pick-prefresh-resolve.test.mjs — U-FEEDBACK-FORCING (RGS-TOOL-AUTOINVOKE-MS1)
 *
 * Exercises the 4-tier resolveUnitKey fallback chain in pick-prefresh-inject.mjs:
 *   1. composite-typed   — prompt contains MS::U-ID
 *   2. claim-by-bare-id  — prompt has bare U-... + matching fresh slot-task-claim
 *   3. claim-by-slot     — chat's own fresh slot-task-claim (no ID in prompt)
 *   4. curren
... [+13477 chars truncated]

### Assistant | 2026-05-17T02:14:44.538Z

[tool_use: Read]

### User | 2026-05-17T02:14:47.040Z

[tool_result] 1	/**
2	 * pick-prefresh-tool-plan.test.mjs
3	 *
4	 * Tests for the tool-plan surfacing extension of pick-prefresh-inject.mjs.
5	 * Verifies that when a /pick-unit or /checkin prompt contains a unit-key,
6	 * the hook injects the RGS tool plan from the sidecar into additionalContext.
7	 *
8	 * Uses node:test (hermetic — spawns hook as subprocess, feeds stdin JSON,
9	 * uses temp sidecar via PRISM_
... [+14125 chars truncated]

### Assistant | 2026-05-17T02:14:50.239Z

Now let me check downstream consumers for telemetry breakage.

### Assistant | 2026-05-17T02:14:50.400Z

[tool_use: Glob]

### User | 2026-05-17T02:15:03.303Z

[tool_result] .claude\hooks\rgs-outcome-record-stop.mjs

### Assistant | 2026-05-17T02:15:05.930Z

I have enough context to review. Let me check the downstream consumer quickly for the new `resolutionSource` field.

### Assistant | 2026-05-17T02:15:07.365Z

[tool_use: Bash]

### User | 2026-05-17T02:15:13.591Z

[tool_result] 13: *   4. Append new records (dedup on {unitKey,outcome}).
120:        if (rec && rec.unitKey && Array.isArray(rec.predictedPipelines)) {
122:            unitKey: rec.unitKey,
124:            predictedPipelines: rec.predictedPipelines,
230:  // Load existing outcomes to build dedup set on {unitKey,outcome}
240:          if (rec && rec.unitKey && rec.outcome) {
241:            existingKeys.add(`${
... [+92 chars truncated]

### Assistant | 2026-05-17T02:15:19.588Z

[tool_use: Read]

### User | 2026-05-17T02:15:20.489Z

[tool_result] 100	  try {
101	    _stdinRaw = readFileSync(0, "utf-8");
102	  } catch {
103	    // stdin closed or unreadable — safe to proceed without it
104	  }
105	
106	  // --- 1. Load picked events -----------------------------------------------
107	  if (!existsSync(PICKED_PATH)) {
108	    // No picked.jsonl → nothing to classify → no-op
109	    approve(true);
110	  }
111	
112	  let pickedEvents = [];
113
... [+4521 chars truncated]

### Assistant | 2026-05-17T02:15:57.832Z

Good — I have what I need. The consumer reads via `rec.unitKey`/`rec.predictedPipelines`/`rec.tier`/`rec.verdict` only and ignores extra fields (e.g., `resolutionSource`), so the new field is forward-compatible.

# REVIEW — U-FEEDBACK-FORCING — FAIL

Three P0 issues, two P1. Refer to file:line below.

## P0 — Test fixture is broken / will time out under `vitest run`

**`pick-prefresh-tool-plan.test.mjs:158-194`** — The "STALE prefix when plan has stale:true flag" test (line 158) AND "stale-on-pickup event appended" test (line 183) still write the OLD nested shape `{ plan: SAMPLE_PLAN, sourceHash, stale:true }` to the sidecar. After the U-INTEG-FIX-P0 flat-schema cutover (noted on line 103-108 of the same file as the rationale for de-nesting `SAMPLE_SIDECAR_ENTRY`), `loadToolPlan` returns this object as the plan itself; `plan.stale === true` so the STALE warning still fires by coincidence, but `plan.pipelines` is `undefined`, `plan.tribal` is `undefined`, etc. Test 158 only asserts `ctx.includes("STALE")` so it passes by luck; test 183 asserts only the event presence and also passes by luck. These two fixtures were missed by the "de-nest one line" change — they're regression-blind: a future bug that drops the entire stale section would still pass. **Fix:** replace both `{ plan: SAMPLE_PLAN, sourceHash:..., stale: true }` literals with `{ ...SAMPLE_PLAN, stale: true }`.

## P0 — Test concurrency / leakage across hermetic boundary

**`pick-prefresh-resolve.test.mjs` `runHook()` lines 47-65** — `env: { ...process.env, ... }` inherits the **real** `PRISM_RGS_*` and `PRISM_*_PATH` env vars from the parent. If the parent shell happens to have any of these set (operators do — see CLAUDE.md knob list), the spawned hook sees BOTH the override AND the parent value via the spread. Because the test overrides come last (good), the override wins for the listed knobs — but `PRISM_PICK_PREFRESH_DISABLE=1`, `PRISM_RGS_TOOL_PLAN_INJECT=0`, or `PRISM_VIZ_FIRST_REDIRECT_DISABLE` set in 
... [+3041 chars truncated]
