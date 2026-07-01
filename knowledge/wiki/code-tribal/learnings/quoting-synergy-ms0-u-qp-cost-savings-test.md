# QUOTING-SYNERGY-MS0/U-QP-COST-SAVINGS-TEST — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-COST-SAVINGS-TEST (slot:charlie): make CostSavingsTrackerEngine testable + real R9 test

**Commit:** `7e42f1475672` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T04:01:17-05:00
**Tags:** quoting-synergy-ms0, u-qp-cost-savings-test, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-COST-SAVINGS-TEST (slot:charlie): make CostSavingsTrackerEngine testable + real R9 test

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-COST-SAVINGS-TEST (slot:charlie): make CostSavingsTrackerEngine testable + real R9 test

The one genuinely-untested quoting engine (0 prior test refs; the other 9
"untested" cost/quote engines are integration-covered). Two changes:

1. CostSavingsTrackerEngine constructor now accepts { storePath? } so tests can
   inject a temp ledger instead of polluting the operator's real
   ~/.prism/savings.json. No-arg singleton path unchanged (definite-assignment
   safe in both branches).

2. CostSavingsTrackerEngine.test.ts (vitest, 13/13) — asserts all 6 savings
   formulas with reference values computed from DEFAULT_COSTS (crash=500,
   scrap=75, util 0.5h=42.5, cycle 10min/12%=1.7, tool 20%=5, energy 5min=0.075),
   the explicit-override path, the persistence round-trip across instances
   (eventCount=2/total=575), configureCosts effect, logOutcome delta+accuracy
   (est75/act90 -> d15/acc120), the reset confirm-guard, and the exact
   missing-event + unknown-action error strings. No `as any`; reads the
   Record<string,unknown> return directly.

Verify: cd mcp-server && npx vitest run src/__tests__/CostSavingsTrackerEngine.test.ts
(full tsc --noEmit OOM-aborts at project scale; change is provably type-safe +
my 2 files produce zero tsc diagnostics in the partial run.)
```

## Files touched (3)
- mcp-server/src/__tests__/CostSavingsTrackerEngine.test.ts | 114 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/CostSavingsTrackerEngine.ts        |  18 +++++++++++++-----
- 2 files changed, 127 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- til 0.5h=42.5, cycle 10min/12%=1.7, tool 20%=5, energy 5min=0.075),

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7e42f1475672`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._