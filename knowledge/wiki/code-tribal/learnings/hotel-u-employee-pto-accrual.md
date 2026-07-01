# HOTEL/U-EMPLOYEE-PTO-ACCRUAL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-PTO-ACCRUAL (slot:hotel iter18 /goal): PTO/sick/personal accrual + request workflow + payroll bridge + shift-scheduler integration

**Commit:** `75b555c1f929` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T21:29:48-05:00
**Tags:** hotel, u-employee-pto-accrual, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-PTO-ACCRUAL (slot:hotel iter18 /goal): PTO/sick/personal accrual + request workflow + payroll bridge + shift-scheduler integration

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-PTO-ACCRUAL (slot:hotel iter18 /goal): PTO/sick/personal accrual + request workflow + payroll bridge + shift-scheduler integration

— EmployeePTOAccrualEngine: 4 tenure tiers (lt_1yr 10d, yrs_1_4 15d, yrs_5_9 20d, yrs_10_plus 25d vacation/yr) × 26 pay periods/yr; flat sick 10d/yr at all tiers; 3d/yr personal lump-grant. accruePeriod (vacation+sick per pay-period), grantAnnualPersonal (yearly), postLedger (manual adjust/seed), computeBalance (sums ledger). Workflow: submitRequest → approveRequest (debits balance, segregation-of-duties: approver != requester, allow_negative for advance) → cancelRequest (re-credits balance) | rejectRequest (no balance change). getApprovedPTODates feeds shift-scheduler's gap detection. getLedger gives audit-trail.

— Tests: 27/27 PASS. Variability: all 4 tenure tiers exercised with correct hours/period reference values (3.0769, 4.6154, 6.1538, 7.6923 h/period); both happy + insufficient-balance + allow_negative + self-approval-refused + re-approve-refused + cancel-refund + reject-no-debit + non-finite/NaN/Infinity inputs. Hotel-soul: ledger-conservation invariant (sum of credits-debits = balance), segregation-of-duties refuse (approver != requester), financial-invariant gate (insufficient balance throws unless allow_negative), R12 fail-loud, Object.frozen returns, PII-free.

— businessDispatcher: +11 actions (pto_compute_balance, _post_ledger, _accrue_period, _grant_annual_personal, _submit_request, _approve_request, _reject_request, _cancel_request, _list_requests, _get_approved_dates, _get_ledger). Lazy import.

— /system-viz synergy: hotel-domain classifier extended (pto_ regex → business axis). Roost regenerated.

Bridges: payroll ↔ HR balance, shift-scheduler ↔ PTO conflict detection, ledger ↔ audit-trail. Closes the gap where employees had no PTO accrual mechanism + shift-scheduler had no PTO awareness.
```

## Files touched (5)
- .../src/__tests__/EmployeePTOAccrualEngine.test.ts | 442 +++++++++++++++++++++
- mcp-server/src/engines/EmployeePTOAccrualEngine.ts | 402 +++++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    | 109 +++++
- scripts/generate-hotel-domain-features.mjs         |   2 +
- 4 files changed, 955 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 75b555c1f929`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._