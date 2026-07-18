---
type: "chat-session"
source: "claude-code-cli"
session_id: "02436db5-5bb2-4a62-8e0d-1eeba8600240"
title: "RE-SCRUTINY (Arm B — independent reviewer) for U-DISPATCHER of RGS-TOOL-AUTOINVO"
date: "2026-05-16"
first_ts: "2026-05-16T21:40:10.697Z"
last_ts: "2026-05-16T21:40:44.692Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-a3bde2c5eec1e4a8d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# RE-SCRUTINY (Arm B — independent reviewer) for U-DISPATCHER of RGS-TOOL-AUTOINVO

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-a3bde2c5eec1e4a8d.jsonl`

## Transcript

### User | 2026-05-16T21:40:10.697Z

RE-SCRUTINY (Arm B — independent reviewer) for U-DISPATCHER of RGS-TOOL-AUTOINVOKE-MS1. Your prior pass was PASS-WITH-P1. The P1 (+ a P2 timeout) have been addressed. Verify the fixes + confirm no regression.

## Verify the P1 fix (MS0 core-lesson anti-stub gap)
`H:/prism/mcp-server/src/__tests__/devDispatcher.rgs-tool-plan-wire.test.ts`:
1. The `coverage` REAL-subprocess test's success branch must now contain `expect(r.data.totalOpen as number).toBeGreaterThan(0);` — this is the anti-stub assertion (envelope enumeration yields ~4400+ units; a hermetic stub returning totalOpen:0 now FAILS). Confirm it's present and correctly placed (in the `if (r.ok)` branch, alongside the existing `withPlan<=totalOpen` invariant).
2. The two factually-wrong comments you flagged ("the sidecar exists in-repo with hundreds of plans") must be corrected to state the sidecar may legitimately have 0 plans (populated by nightly U-CRON) and that the anti-stub guard is `totalOpen>0` in the coverage E2E, not sidecar plan count. Confirm the corrected comments are accurate.
3. P2 timeout fix: the two `build`-related `it()` timeouts must now be `130_000` (was 90_000) so the dispatcher's 120s execFileSync budget can complete + surface its structured error before vitest kills the test. Confirm both are 130_000.
4. A follow-up fix: the `query — nonexistent unit_key` test had `expect(r.data.plan).toBeNull()` which failed because the dispatcher's responseSlimmer strips null keys (→ undefined on the wire). It's now `expect(r.data.plan ?? null).toBeNull()`. Confirm this is slimmer-tolerant WITHOUT weakening intent (a stub returning {found:true,plan:{...}} must still fail this test — verify the `found` assertion above it still guards that).

## Also re-confirm your prior PASS findings hold
- `query` still avoids the `.plan` nesting bug (P0-6a) — `plans[unitKey]` flat, no `.plan` re-index.
- Security at subprocess boundary unchanged (execFileSync no-shell + charset regex defense-in-depth).
- No scope cre
... [+456 chars truncated]

### Assistant | 2026-05-16T21:40:15.347Z

I'll verify the fixes in the test file and confirm no regressions.

### Assistant | 2026-05-16T21:40:15.570Z

[tool_use: Read]

### User | 2026-05-16T21:40:16.492Z

[tool_result] 1	/**
2	 * devDispatcher × RGS tool-plan sidecar wire (RGS-TOOL-AUTOINVOKE-MS1 / U-DISPATCHER).
3	 *
4	 * The 948-plan sidecar (state/shared/roadmap-tool-plans.json) had no dispatcher
5	 * surface — an engine-wiring-doctrine violation per the MS1 punch-list. This
6	 * wires `roadmap_tool_plan_{query,build,coverage}` into prism_dev.
7	 *
8	 * Test strategy (per the MS0 core lesson — "hermetic fakes
... [+11704 chars truncated]

### Assistant | 2026-05-16T21:40:44.692Z

I have the current file content. Verifying each fix against the requirements.

**P1 fix #1 — anti-stub assertion (line 159):**
`expect(r.data.totalOpen as number).toBeGreaterThan(0);` is present, inside the `if (r.ok)` success branch (line 146), placed immediately before the `withPlan <= totalOpen` invariant (line 161). Correctly placed and the comment (lines 153-158) accurately explains why a hermetic stub returning `totalOpen:0` fails only this assertion. Correct.

**P1 fix #2 — corrected factually-wrong comments:**
- Lines 107-115 (`query — nonexistent` test): now states the sidecar "is populated by the nightly U-CRON replan and may legitimately contain 0 plans in a fresh checkout", explicitly notes plan-count is NOT a reliable real-wiring signal, and points to the `coverage` E2E `totalOpen>0` as the stronger anti-stub guard. Accurate.
- Lines 153-158 (`coverage` test): anti-stub rationale correctly attributes the guard to `totalOpen>0` from envelope enumeration, not sidecar plan count. Accurate.
Both prior false claims ("sidecar exists in-repo with hundreds of plans") are gone and replaced with correct statements.

**P2 timeout fix:**
- Line 202 (`build — valid-charset but unknown unit`): `}, 130_000);` with explanatory comment referencing the 120s execFileSync budget. Correct.
- Line 219 (`all 3 roadmap_tool_plan_* actions`): `}, 130_000);` — this is the other `build`-exercising test (its `roadmap_tool_plan_build` probe hits the same execFileSync path). Correct.
Both build-related timeouts are 130_000. The `coverage` test stays at 60_000 (line 168) — appropriate, deterministic enumeration, not the 120s Ollama-planner path. Correct.

**Slimmer-null fix (line 127):**
`expect(r.data.plan ?? null).toBeNull();` — slimmer-tolerant (handles `plan` stripped to `undefined` by responseSlimmer → `?? null` → null). Intent is NOT weakened:
- Line 120 `expect(r.data.found).toBe(false);` still guards above it — a stub returning `{found:true,plan:{...}}` fails on `found` (line
... [+2592 chars truncated]
