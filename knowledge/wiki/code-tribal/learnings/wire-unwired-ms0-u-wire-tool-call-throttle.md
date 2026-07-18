# WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-THROTTLE — [SLOT-CHARLIE] [WIRE-UNWIRED-MS0]/U-WIRE-TOOL-CALL-THROTTLE: wire ToolCallThrottleEngine

**Commit:** `9aeb5031b486` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T11:00:54-05:00
**Tags:** wire-unwired-ms0, u-wire-tool-call-throttle, auto-distilled

## Subject
[SLOT-CHARLIE] [WIRE-UNWIRED-MS0]/U-WIRE-TOOL-CALL-THROTTLE: wire ToolCallThrottleEngine

## Body
```
[SLOT-CHARLIE] [WIRE-UNWIRED-MS0]/U-WIRE-TOOL-CALL-THROTTLE: wire ToolCallThrottleEngine

/goal compile-then-backend-dev iter 2 — ToolCallThrottleEngine was a genuine
unwired engine (0 dispatcher references in src/tools/dispatchers/ verified by
grep). Mirror of the iter-1 U-WIRE-WASTE-DETECTOR op-discriminator pattern in
the same dispatcher; comment banners + cases now adjacent.

Distinct from existing tool_call_record / tool_call_analyze / tool_call_reset
(ToolCallTracker — passive observability surface): this engine is the ACTIVE
rate-limit + burst-limit + cooldown decision gate.

- devDispatcher.ts: new prism_dev action 'tool_call_throttle' — one ACTIONS
  entry, one handler case dispatching an inner switch over 5 ops (check /
  set_rule / stats / oneliner / reset). Per-op fail-loud via ok({error}); lazy-
  imports the toolCallThrottleEngine SINGLETON (not new ToolCallThrottleEngine()
  — preserves call-log + per-tool cooldown timers across MCP server lifetime;
  the 'new' anti-pattern would silently start a fresh log per dispatch call,
  defeating the rate-limit purpose).
- devActionSchemas.ts: tool_call_throttle Zod schema in ACTION_DEV_SCHEMAS.
  'op' is 5-value z.enum matching the inner switch char-by-char. set_rule
  enforces max_per_minute > 0 integer, burst_limit >= 0 integer, cooldown_ms
  >= 0 (per schemas.md — never z.string for an enum field, never z.any).
- ToolCallThrottleEngineWiring.test.ts: case-block-scoped source-grep
  (anchor 'case "tool_call_throttle":' bounded by '// ── Skill Inlining'
  divider) + per-op round-trip incl. real-behavior burst-limit, rate-limit,
  cooldown-enforcement, default-rule application, stats/oneliner/reset.
  17 vitest cases, 17/17 PASS.

Per-file 2-reviewer scrutiny: Arm A (wiring-review-agent) PASS 0 P0/P1; Arm B
(reviewer, independent 2nd-pass) PASS 0 P0/P1 — verified snake↔camel field
mapping, positional setRule arg order, JS-default-param firing on undefined,
inner-enum char-for-char parity, singleton vs new-class, source-grep anchor
uniqueness, schema z.enum vs z.string. tsc clean for this unit (only pre-
existing TS2352 at L3813 in unrelated WEDM cast remains).

Closes WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-THROTTLE. Charlie /goal compile-then-
backend-dev iter 2/20. Compile spec at state/shared/specs/CHARLIE-LEFTOVERS-
2026-05-19.md. Next-up: U-CK11 (per-category scrutiny pass) or U-CK28
(command-utilization closure loop) per backend-dev-p0 queue.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/ToolCallThrottleEngineWiring.test.ts | 235 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  23 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  51 ++++-
- 3 files changed, 308 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tilization closure loop) per backend-dev-p0 queue.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9aeb5031b486`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._