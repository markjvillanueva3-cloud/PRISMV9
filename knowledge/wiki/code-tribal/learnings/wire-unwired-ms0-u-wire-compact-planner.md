# WIRE-UNWIRED-MS0/U-WIRE-COMPACT-PLANNER — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-COMPACT-PLANNER: CompactPlannerEngine → prism_context (4 actions)

**Commit:** `6233822bc12a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T23:55:27-05:00
**Tags:** wire-unwired-ms0, u-wire-compact-planner, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-COMPACT-PLANNER: CompactPlannerEngine → prism_context (4 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-COMPACT-PLANNER: CompactPlannerEngine → prism_context (4 actions)

Files
  mcp-server/src/tools/dispatchers/contextDispatcher.ts            +55 LOC
  mcp-server/src/schemas/contextActionSchemas.ts                   +83 LOC
  mcp-server/src/__tests__/contextDispatcher.compactPlanner.test.ts +208 LOC (17 cases, 17/17 PASS)

What ships
  Engine unmodified — CompactPlannerEngine already exports the singleton
  compactPlannerEngine with 4 pure-compute methods. Wiring exposes them as
  prism_context dispatcher actions:
    compact_plan              items + targetTokens → CompactPlan
    compact_categorize        content              → ContentCategory enum
    compact_estimate_capacity targetTokens [+avg]  → { capacity }
    compact_summary           plan                 → { summary } multi-line render

  Schemas mirror engine types exactly:
    compactContentCategorySchema — 9-value enum (active-task..stale)
    compactContentItemSchema     — { category, summary, tokens, priority 0..5, age }
    compactPlanResultSchema      — used as compact_summary input
  All .strict() — extra keys rejected at Zod boundary.

Why prism_context (not prism_orchestrate)
  BUILD_STATE.NEEDS_WIRING.sample_engines suggested prism_orchestrate but
  semantic match is prism_context: this engine plans CONTENT PRESERVATION
  during /compact (context-window pressure). prism_context already owns
  context_compaction_create_context, kv_*, memory_externalize, checkpoint_*
  — natural neighborhood. Cross-checked: no existing context_compact_*
  actions, no duplicate wiring.

Coverage (17 cases, all real-value assertions — no toBeDefined() stubs)
  compact_plan (5):
    * exact-fit budget → tokensAfter == tokensBefore, 0 drops
    * priority=1 always-keeps even when overflowing (10000 tok kept under 1000 target)
    * empty items → 0/0/0/0% (verifies slimResponse-safe shape)
    * dropped priority<=2 → /high-priority/ AND /handoff/ in preservationNotes
    * stale-drop count → notes include 'stale' and the count
  compact_categorize (4):
    * 'TODO ...'        → active-task
    * 'error during X'  → error-context
    * 'user wants ...'  → user-preference
    * unrecognized      → tool-result (default)
  compact_estimate_capacity (3):
    * default avgItemTokens=150 → 1500/150 = 10
    * custom avgItemTokens=300  → 1500/300 = 5
    * zero budget               → 0
  compact_summary (1):
    * round-trip with compact_plan output; matches /Compact: 1000 → 500 tokens \(50% reduction\)/
      AND /Keep: 1 items \| Drop: 1 items/ AND /Dropped: stale:1/
  adversarial (4):
    * compact_plan extra key → middleware rejects (.strict())
    * compact_categorize missing content → schema reject
    * compact_estimate_capacity targetTokens=-1 → nonnegative() reject
    * compact_plan priority=99 → out-of-range reject

Round-trip discipline
  Test invokes through registerContextDispatcher → prism_context tool handler
  (fakeServer pattern, mirrors cadDispatcher.cadBridgeStatus.test.ts +
  devDispatcher.wiringPotential.test.ts). Engine singleton is NEVER called
  directly — every assertion flows handler({action,params}) → JSON parse.

Pre-stage audit
  Verified diff contains ONLY my changes (no peer-uncommitted sweep —
  the U-WIRE-CADBRIDGE 2026-05-17 lesson). git diff --stat reports
  exactly 138 lines across the 2 modified files.

Action enum count: prism_context 74 → 78 (+4).
```

## Files touched (4)
- .../contextDispatcher.compactPlanner.test.ts       | 276 +++++++++++++++++++++
- mcp-server/src/schemas/contextActionSchemas.ts     |  83 +++++++
- .../src/tools/dispatchers/contextDispatcher.ts     |  55 ++++
- 3 files changed, 414 insertions(+)

## Lessons surfaced in commit body
- lesson). git diff --stat reports

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6233822bc12a`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._