# QUOTING-SYNERGY-MS0/U-QP-ACTUAL-OUTCOME-LOADER-SCRUTINY-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-ACTUAL-OUTCOME-LOADER-SCRUTINY-FIX (slot:charlie): close 2 arm-C P1s on the closed-loop loader (3-of-3 panel: A+B PASS, C FAIL->fixed). (P1a) provenanceCheck() swallowed the catch -> a crashed ActualCostEngine looked IDENTICAL to 'no data yet' (silent infra-failure, ironic for a fail-loud engine). Fix: distinguish verdict:'error' (source threw -> signals carries 'loader-error: <msg>') from verdict:'empty' (genuine no-data); both stay may_promote:false. Extended OutcomeProvenance.verdict union +'error' (type-safe, downstream blocks promotion same as synthetic). (P1b) listJobIds() reached into actualCostEngine.estimates (a PRIVATE field) via runtime cast -> silent crash on any rename, 0 compile guard. Fix: added public ActualCostEngine.listJobIds() accessor; loader calls it (no private reach-in). +2 R9 tests (error-verdict-not-empty pin + listJobIds accessor pin), 13->15 pass. Independently re-verified: error surfaced, 0 private reach-in, 15/15.

**Commit:** `6b0f4d2718af` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T23:34:48-05:00
**Tags:** quoting-synergy-ms0, u-qp-actual-outcome-loader-scrutiny-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-ACTUAL-OUTCOME-LOADER-SCRUTINY-FIX (slot:charlie): close 2 arm-C P1s on the closed-loop loader (3-of-3 panel: A+B PASS, C FAIL->fixed). (P1a) provenanceCheck() swallowed the catch -> a crashed ActualCostEngine looked IDENTICAL to 'no data yet' (silent infra-failure, ironic for a fail-loud engine). Fix: distinguish verdict:'error' (source threw -> signals carries 'loader-error: <msg>') from verdict:'empty' (genuine no-data); both stay may_promote:false. Extended OutcomeProvenance.verdict union +'error' (type-safe, downstream blocks promotion same as synthetic). (P1b) listJobIds() reached into actualCostEngine.estimates (a PRIVATE field) via runtime cast -> silent crash on any rename, 0 compile guard. Fix: added public ActualCostEngine.listJobIds() accessor; loader calls it (no private reach-in). +2 R9 tests (error-verdict-not-empty pin + listJobIds accessor pin), 13->15 pass. Independently re-verified: error surfaced, 0 private reach-in, 15/15.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-ACTUAL-OUTCOME-LOADER-SCRUTINY-FIX (slot:charlie): close 2 arm-C P1s on the closed-loop loader (3-of-3 panel: A+B PASS, C FAIL->fixed). (P1a) provenanceCheck() swallowed the catch -> a crashed ActualCostEngine looked IDENTICAL to 'no data yet' (silent infra-failure, ironic for a fail-loud engine). Fix: distinguish verdict:'error' (source threw -> signals carries 'loader-error: <msg>') from verdict:'empty' (genuine no-data); both stay may_promote:false. Extended OutcomeProvenance.verdict union +'error' (type-safe, downstream blocks promotion same as synthetic). (P1b) listJobIds() reached into actualCostEngine.estimates (a PRIVATE field) via runtime cast -> silent crash on any rename, 0 compile guard. Fix: added public ActualCostEngine.listJobIds() accessor; loader calls it (no private reach-in). +2 R9 tests (error-verdict-not-empty pin + listJobIds accessor pin), 13->15 pass. Independently re-verified: error surfaced, 0 private reach-in, 15/15.
```

## Files touched (5)
- mcp-server/src/__tests__/QuotingActualOutcomeLoaderEngine.test.ts | 49 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ActualCostEngine.ts                        |  5 +++++
- mcp-server/src/engines/QuotingActualOutcomeLoaderEngine.ts        | 56 ++++++++++++++++++++++++++++++++++++++++----------------
- mcp-server/src/engines/QuotingClosedLoopEngine.ts                 |  6 ++++--
- 4 files changed, 98 insertions(+), 18 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6b0f4d2718af`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._