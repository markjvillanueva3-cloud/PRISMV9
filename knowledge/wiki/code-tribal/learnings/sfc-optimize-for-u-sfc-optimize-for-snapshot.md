# SFC-OPTIMIZE-FOR/U-SFC-OPTIMIZE-FOR-SNAPSHOT — [MAIN-FORCE] [SFC-OPTIMIZE-FOR]/U-SFC-OPTIMIZE-FOR-SNAPSHOT (slot:oscar): record the goal in CalcSnapshot -- completes the optimize_for slice (engine->request->UI->snapshot/history)

**Commit:** `0442fc32f925` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T23:34:20-05:00
**Tags:** sfc-optimize-for, u-sfc-optimize-for-snapshot, auto-distilled

## Subject
[MAIN-FORCE] [SFC-OPTIMIZE-FOR]/U-SFC-OPTIMIZE-FOR-SNAPSHOT (slot:oscar): record the goal in CalcSnapshot -- completes the optimize_for slice (engine->request->UI->snapshot/history)

## Body
```
[MAIN-FORCE] [SFC-OPTIMIZE-FOR]/U-SFC-OPTIMIZE-FOR-SNAPSHOT (slot:oscar): record the goal in CalcSnapshot -- completes the optimize_for slice (engine->request->UI->snapshot/history)

The last reviewer-flagged P2: makeSnapshot omitted optimizeFor, so history/comparison snapshots
that differ only by goal (cost vs productivity = different numbers from the same inputs) were
indistinguishable, and reloading a history entry lost the goal. Fix:
- CalcSnapshot.optimizeFor?: optional for back-compat (snapshots saved before the selector lack it).
- new pure buildCalcSnapshot helper (id+ts passed in -> testable; mirrors buildSfcRequest); makeSnapshot
  delegates to it + adds optimizeFor to its useCallback deps (was a stale-closure risk).
- handleReloadFromHistory restores entry.optimizeFor (guarded for old entries -> current goal kept).

Data-layer complete: the goal is persisted + restored; the visual badge in ComparisonView/History is a
clean follow-up (consumers degrade gracefully -- traced, all inert on the new field). 4/4 tests, web
tsc-clean. Per-file 2-arm scrutiny PASS (both traced every snapshot consumer + back-compat).
```

## Files touched (5)
- mcp-server/web/src/__tests__/buildCalcSnapshot.test.ts | 50 ++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/sfc/buildCalcSnapshot.ts | 47 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/sfc/comparison-types.ts  |  3 +++
- mcp-server/web/src/pages/SfcCalculatorPage.tsx         | 21 ++++++++-------------
- 4 files changed, 108 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0442fc32f925`
- Milestone envelope: `mcp-server/data/milestones/SFC-OPTIMIZE-FOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._