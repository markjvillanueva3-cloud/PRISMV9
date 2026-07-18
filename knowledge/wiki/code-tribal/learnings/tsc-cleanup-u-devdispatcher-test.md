# TSC-CLEANUP/U-DEVDISPATCHER-TEST — [MAIN] [TSC-CLEANUP]/U-DEVDISPATCHER-TEST: add CompactFormatterEngine engine-direct test

**Commit:** `523f3a77b064` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T14:04:28-05:00
**Tags:** tsc-cleanup, u-devdispatcher-test, auto-distilled

## Subject
[MAIN] [TSC-CLEANUP]/U-DEVDISPATCHER-TEST: add CompactFormatterEngine engine-direct test

## Body
```
[MAIN] [TSC-CLEANUP]/U-DEVDISPATCHER-TEST: add CompactFormatterEngine engine-direct test

The U-DEVDISPATCHER tsc fix exported the `Primitive` type from
CompactFormatterEngine.ts; that edit made stop_on_unwired_assets re-scan the
engine, which had no name-matching __tests__/CompactFormatterEngine.test.ts
(it was only covered indirectly by devDispatcher.compact-formatter-wire.test.ts).

Adds 26 engine-direct cases covering all 8 public methods (table, kvPairs,
summarizeArray, compact, systemLine, compactDiffStat, compactTestResult,
truncate) with concrete reference values + edge/adversarial inputs. All 26
pass. No source change — test-only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .../src/__tests__/CompactFormatterEngine.test.ts   | 175 +++++++++++++++++++++
- 1 file changed, 175 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 523f3a77b064`
- Milestone envelope: `mcp-server/data/milestones/TSC-CLEANUP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._