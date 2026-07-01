---
name: reference_hotel_payroll_filing_wire_2026_06_09
description: Hotel completeness audit (2026-05-29) is STALE — its
type: reference
slot: hotel
galaxy: business
source: prism-memory
synced: 2026-06-27T20:30:46.612Z
aliases: reference_hotel_payroll_filing_wire_2026_06_09
---


# Hotel payroll-filing wire — and the stale-audit lesson (2026-06-09, slot:hotel)

**Commits:** `e44a3a1592` (4 methods) + `e649790e76` (5th: remitLiability) on `cad-fusion-live-ms0`.

## The stale-audit trap (the real lesson — R8 dedup saved 3 duplicate builds)
The 2026-05-29 hotel galaxy completeness audit (`reference_hotel_galaxy_completeness_audit_2026_05_29`)
named **"Tax engine — the #1 missing pillar, highest-value new build."** That backlog is **STALE.**
Read-before-write found the tax pillar is already built + wired:
- `salesUseTax` engine + `sales_use_tax_calc` action
- `Form1099NECEngine` (244 LOC) + `form_1099nec_generate`
- `FinanceChargeDunningEngine` (405 LOC) — the audit's "AR: no dunning" thin-spot is also built
- **`PayrollLiabilityFilingEngine.generateW2()`** — a complete W-2 (boxes 1-6,16,17, SS-cap, addl-Medicare, SSN mask) ALREADY EXISTS. Building a `FormW2Engine` would have been a **direct duplicate**.

The dedup discipline (R8 / duplicationGuard) caught **3 near-duplicates** in one session. **Lesson: a
galaxy completeness audit goes stale fast — verify each "missing" item against live code before building.**

## The real gap: R15 wiring orphans
`PayrollLiabilityFilingEngine` (437 LOC, built + unit-tested) exposed only `compute941` via
`prism_business`. Its siblings were invokable **in-process only**. Wired all 5:
| action | method |
|---|---|
| `payroll_compute_940` | `compute940()` (annual FUTA) |
| `payroll_generate_w2` | `generateW2()` (W-2 statements) |
| `payroll_reconcile_w2_941` | `reconcileW2sTo941()` (year-end cross-check) |
| `payroll_contractor_1099_totals` | `contractor1099Totals()` (1099 bridge) |
| `payroll_remit_liability` | `remitLiability()` (balanced GL DR Tax Payable/CR Cash) |
`maskSsn` stays internal (PII helper — correctly NOT exposed).

## Gotcha (R8): remitLiability is POSITIONAL
`remitLiability(amount, date)` takes positional args, NOT a single options object like the other 4.
The dispatcher normalizes `params.amount/params.date`; cloning the object-arg pattern blindly would
pass an object as `amount` → `Number.isFinite(obj)===false` → throw. Engine guards are the fail-loud gate.

## Verification
Test `businessDispatcher.payroll-filing-wire.test.ts` — 14 round-trip cases THROUGH the dispatcher with
hand-computed 2025 IRS values (FUTA $72.00; W-2 box4 $3,100; SS-cap high earner $176,100→$10,918.20;
addl-Medicare $4,075; 1099 $1,500; remit half-even 100.125→100.12; W-2↔941 reconcile balances + throws
on drift; double-entry Σdebit===Σcredit; raw SSN never leaks). 14/14 pass, 0 new tsc errors. 3-of-3
scrutiny PASS (reviewer B caught the 5th orphan → fixed before close).

Related: [[reference_hotel_galaxy_completeness_audit_2026_05_29]] (now partly stale) · [[feedback_wire_test_validate_all_galaxies]] (R15) · [[feedback_psn_definition]].
