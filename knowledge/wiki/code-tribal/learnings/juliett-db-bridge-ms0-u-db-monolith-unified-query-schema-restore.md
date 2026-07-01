# JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-UNIFIED-QUERY-SCHEMA-RESTORE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JULIETT-DB-BRIDGE-MS0]/U-DB-MONOLITH-UNIFIED-QUERY-SCHEMA-RESTORE (slot:juliett /goal /loop): restore monolith_query Zod schema after shared-tree absorption.

**Commit:** `c8e8a290493f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T10:02:41-05:00
**Tags:** juliett-db-bridge-ms0, u-db-monolith-unified-query-schema-restore, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JULIETT-DB-BRIDGE-MS0]/U-DB-MONOLITH-UNIFIED-QUERY-SCHEMA-RESTORE (slot:juliett /goal /loop): restore monolith_query Zod schema after shared-tree absorption.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JULIETT-DB-BRIDGE-MS0]/U-DB-MONOLITH-UNIFIED-QUERY-SCHEMA-RESTORE (slot:juliett /goal /loop): restore monolith_query Zod schema after shared-tree absorption.

Context: The companion dispatcher handler + 304-line round-trip test for
this action shipped 2 commits ago via 4a3551938f (absorbed by foxtrot's
U-PTS-VIDEO-EXTRACTION commit during a shared-tree race — code shipped,
attribution lost — the slot-worktree-disabled regression operator
already knows about). This commit restores the lone schema-side holdout
so the wiring is internally consistent across all 3 surfaces.

What this schema defines:
  - 12-value MONOLITH_SUBJECT_ENUM (controllers/machine_specs/
    stock_positions/roughing_configs/macro_schema/fusion_posts/
    mfr_catalog/gateway/zeni/consolidated/final/major_mfrs)
  - monolith_query: subject (req) + query|id (opt) + limit ≤50 (opt)
  - registered in ACTION_INTELLIGENCE_SCHEMAS export map

Verifies the dispatcher → schema → handler triangle:
  - dispatcher already shipped 'monolith_query' action enum (4a3551938f L542)
  - handler at L1276 already imports + uses this schema's subject enum
  - test at L78 already imports ACTION_INTELLIGENCE_SCHEMAS['monolith_query']
    and runs 9 schema-contract assertions against it; 20/20 PASS.

Tests: 20/20 PASS on the existing round-trip test (no test changes here).
TypeScript: clean.
```

## Files touched (8)
- .../src/algorithms/BlockNumberOptimizer.test.ts    | 114 +++++++++++++++
- mcp-server/src/algorithms/BlockNumberOptimizer.ts  | 138 ++++++++++++++++++
- .../src/algorithms/ClimbConventionalPicker.test.ts |  99 +++++++++++++
- .../src/algorithms/ClimbConventionalPicker.ts      | 160 +++++++++++++++++++++
- .../src/algorithms/FlushStrategyPicker.test.ts     | 136 ++++++++++++++++++
- mcp-server/src/algorithms/FlushStrategyPicker.ts   | 160 +++++++++++++++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts |  27 ++++
- 7 files changed, 834 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c8e8a290493f`
- Milestone envelope: `mcp-server/data/milestones/JULIETT-DB-BRIDGE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._