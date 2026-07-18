# HOTEL/U-EMPLOYEE-PAYROLL-GROSS-PAY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-PAYROLL-GROSS-PAY (slot:hotel iter19 /goal): ERP capstone — gross-pay synthesis from FLSA OT + shift differentials + holiday + PTO-paid + per-op bonus, with cents-resolution + reconciliation invariant

**Commit:** `f673354a6545` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T21:34:44-05:00
**Tags:** hotel, u-employee-payroll-gross-pay, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-PAYROLL-GROSS-PAY (slot:hotel iter19 /goal): ERP capstone — gross-pay synthesis from FLSA OT + shift differentials + holiday + PTO-paid + per-op bonus, with cents-resolution + reconciliation invariant

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-PAYROLL-GROSS-PAY (slot:hotel iter19 /goal): ERP capstone — gross-pay synthesis from FLSA OT + shift differentials + holiday + PTO-paid + per-op bonus, with cents-resolution + reconciliation invariant

— EmployeePayrollGrossPayEngine: computeGrossPay() splits regular_hours into reg/OT(1.5×)/double-time(2.0×) per OT policy (FLSA 29 CFR 778: 40h/wk threshold, 60h DT threshold defaults; configurable). Adds holiday hours at 1.5×, PTO-paid hours at base. Shift differential (day 0%, swing 5%, night 10%) applied to regular+OT only, NOT holiday/PTO. Per-op completion bonus added flat. Output in integer cents (Math.round at every component). reconcile() returns {ok, expected, actual, delta} — fails loud if components don't sum to gross.

— Tests: 23/23 PASS with hand-calculated reference values:
   • Straight $32.50/hr × 40h = $1300.00 ✓
   • $40/hr × 32h reg + 8h PTO = $1600 ✓
   • 48h → 40 reg + 8 OT at $30/hr = $1560 ✓
   • 70h → 40 reg + 20 OT + 10 DT at $20/hr = $1800 ✓
   • Union policy (35h threshold): $1062.50 ✓
   • All 3 shift differentials (0%/5%/10%) verified + mixed shift (20d/10s/10n) = $60 diff
   • Holiday 8h × 1.5× = $480; per-op bonus added flat
   • Reconciliation invariant holds across complex mixed-input scenarios
   • ≥5 R12 failure modes: missing employee_id, negative/NaN/Infinity rate, shift_mix sum ≠ regular_hours, 168h/wk physical max, negative pto_paid_hours

— businessDispatcher: +2 actions (payroll_compute_gross, payroll_reconcile_gross). Lazy import.

— /system-viz synergy: payroll_ regex already in ACCOUNTING classifier — actions auto-route to ghost.realtime_accounting roost on next regen.

This is the consumer that closes the loop: time-clock signals + PTO ledger + shift schedule + per-op tracker → actual paycheck. Hotel-soul "numbers must reconcile both ways" enforced via reconcile() — sum-of-parts MUST equal gross or surfaces silent drift loud.
```

## Files touched (4)
- .../EmployeePayrollGrossPayEngine.test.ts          | 397 +++++++++++++++++++++
- .../src/engines/EmployeePayrollGrossPayEngine.ts   | 228 ++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  14 +
- 3 files changed, 639 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f673354a6545`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._