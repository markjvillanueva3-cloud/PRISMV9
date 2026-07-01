# HOTEL-PAYROLL-WIRE/U-PAYROLL-FILING-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-PAYROLL-WIRE]/U-PAYROLL-FILING-WIRE (slot:hotel): wire 4 orphaned PayrollLiabilityFilingEngine methods into prism_business

**Commit:** `e44a3a15926c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T09:26:48-05:00
**Tags:** hotel-payroll-wire, u-payroll-filing-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-PAYROLL-WIRE]/U-PAYROLL-FILING-WIRE (slot:hotel): wire 4 orphaned PayrollLiabilityFilingEngine methods into prism_business

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-PAYROLL-WIRE]/U-PAYROLL-FILING-WIRE (slot:hotel): wire 4 orphaned PayrollLiabilityFilingEngine methods into prism_business

R15 wiring close-out. PayrollLiabilityFilingEngine (437 LOC, built+unit-tested) exposed
only compute941 via prism_business; its 4 siblings were invokable in-process only:
  - payroll_compute_940            -> compute940()           (annual FUTA)
  - payroll_generate_w2            -> generateW2()           (W-2 wage/tax statements)
  - payroll_reconcile_w2_941       -> reconcileW2sTo941()    (year-end W-2<->941 cross-check)
  - payroll_contractor_1099_totals -> contractor1099Totals() (1099-NEC bridge)
Additive: 4 ACTIONS enum entries + 4 switch cases; the lazy loader (payrollLiabilityFiling)
and engine-side Zod (WageRecord/W2/941 schemas) already exist -- matches the compute941
sibling exactly (no dispatcher-level schema; engine validates + throws descriptive errors).

DEDUP NOTE (R8): this began as "build the audit's #1 missing pillar: Tax engine" but the
2026-05-29 hotel completeness audit is STALE -- read-before-write found the tax pillar is
already built+wired (salesUseTax, Form1099NECEngine, FinanceChargeDunningEngine, and
PayrollLiabilityFilingEngine.generateW2 itself). Building a FormW2Engine would have been a
direct duplicate of generateW2(). The real gap was wiring, not building.

TEST: businessDispatcher.payroll-filing-wire.test.ts -- 10 round-trip cases THROUGH the
dispatcher with hand-computed 2025 IRS reference values (FUTA $72.00; W-2 box4 $3,100.00;
SS-capped high earner $176,100 -> $10,918.20; addl-Medicare $4,075.00; 1099-NEC $1,500;
W-2<->941 reconcile balances AND throws on FIT drift; PII: raw SSN never leaks). 10/10 pass.
0 new tsc errors (657 pre-existing in unrelated files are the GOAL-TSC-FIX backlog).
```

## Files touched (3)
- mcp-server/src/__tests__/businessDispatcher.payroll-filing-wire.test.ts | 219 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/businessDispatcher.ts                  |  29 ++++++++
- 2 files changed, 248 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e44a3a15926c`
- Milestone envelope: `mcp-server/data/milestones/HOTEL-PAYROLL-WIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._