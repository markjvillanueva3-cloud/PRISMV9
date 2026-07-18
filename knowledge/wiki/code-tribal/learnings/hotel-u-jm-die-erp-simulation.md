# HOTEL/U-JM-DIE-ERP-SIMULATION — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-JM-DIE-ERP-SIMULATION (slot:hotel iter25 /goal /yolo): E2E 90-day synergy proof harness — proves iter15-iter24 hotel stack works under realistic JM Die load with ZERO invariant violations

**Commit:** `c203fd0bc2a2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T22:14:14-05:00
**Tags:** hotel, u-jm-die-erp-simulation, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-JM-DIE-ERP-SIMULATION (slot:hotel iter25 /goal /yolo): E2E 90-day synergy proof harness — proves iter15-iter24 hotel stack works under realistic JM Die load with ZERO invariant violations

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-JM-DIE-ERP-SIMULATION (slot:hotel iter25 /goal /yolo): E2E 90-day synergy proof harness — proves iter15-iter24 hotel stack works under realistic JM Die load with ZERO invariant violations

— JMDieErpSimulationEngine: seeded PRNG (Mulberry32) drives a 90-day shop-floor simulation through 9 hotel engines: hires 12-employee JM Die roster (apprentice→owner across 4 tenure tiers), auto-injects role-curriculum (iter15), schedules ~75%/day of roster across 8 JM machines × 3 shifts (iter17), accrues PTO biweekly (iter18), feeds 3 daily perf signals per employee (iter16), computes biweekly payroll for all 12 with shift mix + reconciliation invariant (iter19), raises 2%/day NCRs with full 8D close-out 70% effectiveness gate (iter23), receives 1%/day customer complaints (iter24). Returns SimulationReport with reconciliation invariants verified across the full run.

— Tests: 21/21 PASS in 1.20s. **ZERO invariant violations** under 90-day seed=42 run + 30-day runs at seeds 1/99/12345 (variability floor). Determinism: identical seeds produce identical signal/payroll/PTO counts. Confirmed counts: 12 employees, 3240 perf signals (3×12×90), 72 payroll periods (6 biweekly × 12 employees), 144 PTO ledger entries (6 cycles × 12 × 2 categories), payroll_reconciliation_ok=true, ncrs_closed_with_effectiveness_ok=true. R12 modes: negative seed, non-integer seed, out-of-range days, zero days.

— businessDispatcher: +1 action (jm_die_sim_run) — exposes the simulation harness as an MCP dispatcher call for regression sweeps.

— /system-viz synergy: hotel-domain classifier extended (jm_die_sim_ regex → business axis).

This is the deliverable for "simulations of real world application using JM documents, fleet and our vast resources". 90-day synergy proven E2E. Future hotel engine changes can re-run this harness as anti-regression validation.
```

## Files touched (17)
- .../helpers/__tests__/chat-slots-bindings.test.mjs |  66 ++++-
- .claude/helpers/chat-slots.mjs                     |  33 +++
- .../wiki/architecture/slot-bridge-auto-seed.md     | 140 +++++++++
- mcp-server/src/__tests__/DynamicShopRate.test.ts   | 120 +++++++-
- .../src/__tests__/JMDieErpSimulationEngine.test.ts | 130 +++++++++
- mcp-server/src/engines/DynamicShopRateEngine.ts    | 102 ++++++-
- mcp-server/src/engines/JMDieErpSimulationEngine.ts | 321 +++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts     |   7 +-
- .../src/tools/dispatchers/businessDispatcher.ts    |   8 +
- .../src/tools/dispatchers/quotingDispatcher.ts     |   6 +-
_(+7 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c203fd0bc2a2`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._