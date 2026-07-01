# TSC-CLEANUP/U-DEVDISPATCHER — [MAIN] [TSC-CLEANUP]/U-DEVDISPATCHER: fix 4 pre-existing devDispatcher.ts tsc errors

**Commit:** `1f1fec299d22` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T08:12:23-05:00
**Tags:** tsc-cleanup, u-devdispatcher, auto-distilled

## Subject
[MAIN] [TSC-CLEANUP]/U-DEVDISPATCHER: fix 4 pre-existing devDispatcher.ts tsc errors

## Body
```
[MAIN] [TSC-CLEANUP]/U-DEVDISPATCHER: fix 4 pre-existing devDispatcher.ts tsc errors

All 4 errors pre-dated the WIRE-UNWIRED-MS0 work (flagged by every reviewer as
unrelated); fixed here now they were "come across". All fixes behaviour-preserving.

- L2555 edit_impact_build_graph (TS2783 nodeCount duplicate key): the explicit
  `nodeCount` was placed before `...stats` which also carries nodeCount, so the
  spread silently overwrote it. Reordered to `{...stats, nodeCount}` — the
  explicit buildGraph() return is now authoritative; no overwrite conflict.
- L3944 ollama_hook_query (TS2783 success duplicate key): `{success:
  queryResult.success, ...queryResult}` — the explicit `success` was redundant
  (queryResult already has it, identical value). Reduced to `{...queryResult}`.
- L5070/5080 compact_table + compact_kv_pairs (TS2345): the params were cast to
  Record<string,unknown> but CompactFormatterEngine.table/kvPairs expect
  Record<string,Primitive>. Exported the `Primitive` type from
  CompactFormatterEngine and tightened both casts to match the real signature.

Verified: tsc --noEmit clean for both files (4 errors → 0, no new errors);
95 tests pass (74 WIRE-UNWIRED engine tests + 21 compact-formatter-wire tests).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- mcp-server/src/engines/CompactFormatterEngine.ts  |  2 +-
- mcp-server/src/tools/dispatchers/devDispatcher.ts | 13 +++++++++----
- 2 files changed, 10 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1f1fec299d22`
- Milestone envelope: `mcp-server/data/milestones/TSC-CLEANUP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._