# HOTEL-PAYROLL-WIRE/U-PAYROLL-FILING-WIRE-REMIT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-PAYROLL-WIRE]/U-PAYROLL-FILING-WIRE-REMIT (slot:hotel): wire the 5th orphan remitLiability — completes the R15 close-out (scrutiny reviewer-B P2)

**Commit:** `e649790e76a7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:04:09-05:00
**Tags:** hotel-payroll-wire, u-payroll-filing-wire-remit, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-PAYROLL-WIRE]/U-PAYROLL-FILING-WIRE-REMIT (slot:hotel): wire the 5th orphan remitLiability — completes the R15 close-out (scrutiny reviewer-B P2)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-PAYROLL-WIRE]/U-PAYROLL-FILING-WIRE-REMIT (slot:hotel): wire the 5th orphan remitLiability — completes the R15 close-out (scrutiny reviewer-B P2)

3-of-3 scrutiny reviewer B caught that the prior commit's "4 siblings" framing was incomplete:
PayrollLiabilityFilingEngine has a 5th unwired computational method, remitLiability (emits
balanced GL journal lines DR Tax Payable / CR Cash; unit-tested), making the "wire ALL orphaned
methods" claim only 4/5 true. This closes it: payroll_remit_liability -> remitLiability().

SIGNATURE NOTE (R8): remitLiability takes POSITIONAL args (amount, date), NOT a single options
object like the other 4 -- so the case normalizes params.amount/params.date in the dispatcher
(per dispatchers/CLAUDE.md "param normalization in the dispatcher, not the engine"). Cloning the
object-arg pattern blindly would have passed an object as `amount` -> NaN. The engine's own guards
(throws on non-finite amount / non-positive / missing date) are the validation gate.

TEST: +4 round-trip cases (14 total, all pass) -- balanced GL lines + Σdebit===Σcredit invariant;
half-even rounding 100.125 -> 100.12; non-positive rejected; UNDEFINED amount fails loud
("must be finite", proving no silent NaN). Now all 5 PayrollLiabilityFilingEngine computational
methods (940/W2/W2-941-reconcile/1099-totals/remit) are reachable via prism_business; maskSsn
stays internal (PII helper). 0 new tsc errors.
```

## Files touched (3)
- mcp-server/src/__tests__/businessDispatcher.payroll-filing-wire.test.ts | 37 ++++++++++++++++++++++++++++++++++++-
- mcp-server/src/tools/dispatchers/businessDispatcher.ts                  |  9 +++++++++
- 2 files changed, 45 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e649790e76a7`
- Milestone envelope: `mcp-server/data/milestones/HOTEL-PAYROLL-WIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._