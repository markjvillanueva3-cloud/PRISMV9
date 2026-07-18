---
title: Hotel ERP marathon — iter32-iter38 (OSHA + ISO + full-accounting + synergy closure)
type: architecture
status: shipped
shipped: 2026-05-26
slot: hotel
session: 23da5f50-286b-4e5e-a9e0-313c96415cf9
domain: erp-hr
related:
  - hotel-erp-hr-marathon-iter14-30
  - reference_hotel_marathon_iter32_38_2026_05_26
  - reference_hotel_erp_hr_marathon_2026_05_25
  - automation-chain-telemetry
---

# Hotel ERP marathon — iter32-iter38

Sister arc to [[hotel-erp-hr-marathon-iter14-30]] (iter14-31 the day prior). Closes the operator's named /goal axes — OSHA federal compliance, ISO 9001 cross-clause coverage, full accounting cycle, app-wide synergy — with **6 new engines + 1 E2E synergy proof + 19 viz nodes + 8 React view modes** all landing on `cad-fusion-live-ms0`.

## Goal axes closed

| Dimension | Closed in | Evidence |
|---|---|---|
| OSHA federal | iter38 [[OSHA300LogEngine]] | 29 CFR §1904.7 + §1904.8 + §1904.39 — Form 300/300A + 8h/24h reporting + PII guard |
| ISO 9001 | iter33-34 spread | §8.4 (vendor + receiving) · §8.5.2 (outbound lot chain) · §8.6 (CofC release) · §10.2 (NCR + CAPA effectiveness ≥0.70 gate) |
| Full accounting | iter34-35 | 3-way match (PO ↔ receipt ↔ invoice) + 8-state PO FSM closes draft → paid → closed |
| Synergy | iter37 | E2E HTTP test chains 11 calls through 5 engines; cents reconcile exactly through round-trip |
| Self-learn | partial | iter16 EmployeePerformanceFeedback EMA + iter23 §10.2 effectiveness gate exist but no retraining cycle on iter32-38 engines — milestone-sized, tracked as `HOTEL-SELF-LEARN-MS0` |

## Engines shipped (6)

All under `mcp-server/src/engines/*.ts`, all dispatcher-wired through `prism_business`, all REST-fronted under `/api/v1/hotel-portal`.

1. **ExecutiveSummaryEngine** (iter31 engine, iter32 surface wire) — C-suite weekly rollup, 5-domain red-flag aggregator (HR/QA/finance/vendor/customer). PII-free (counts only, no names). [`exec_summary_build`]
2. **InspectionReportEngine** (iter33) — QC reports FAI/in-process/final/incoming, 4-step severity ladder by deviation-band multiple, auto-NCR flag on fail, CofC issuance only when overall pass AND zero conditionals (ISO 9001 §8.6). [`inspection_build_report`, `inspection_get_cofc`]
3. **ShippingReceivingLogEngine** (iter34) — Inbound/outbound ledger + 3-way match (PO ↔ receipt ↔ invoice). 6 discrepancy classes: short_ship (warn) · over_ship (CRITICAL hard-reject) · damaged · price_mismatch (>0.5%) · missing_po · uom_mismatch. [`shipping_log_inbound`, `shipping_log_outbound`, `shipping_three_way_match`]
4. **PurchaseOrderLifecycleEngine** (iter35) — 8-state FSM: draft → submitted → acknowledged → partially_received → received → invoiced → paid → closed (+ cancelled). Explicit `ALLOWED_TRANSITIONS` table; SoD on submit (buyer ≠ approver); change-order audit trail. [`po_create`, `po_transition`, `po_record_receipt`, `po_get_status`]
5. **EmployeeTimeClockEngine** (iter36) — Punch FSM (clocked_out → clocked_in → on_break), 4 auto-flags: forgotten_clock_out (24h+, caps 12h) · missed_break (>6h zero break) · weekly_ot_threshold (40h FLSA) · edit_without_approval. SoD on edit (approver ≠ employee). [`timeclock_record_punch`, `timeclock_daily_summary`, `timeclock_edit_punch`]
6. **OSHA300LogEngine** (iter38) — Federal 29 CFR §1904. Recordable criteria: death · days_away · restricted_work · medical_treatment · loss_of_consciousness · significant_dx_by_physician · needlestick. Reporting windows: 8h fatality · 24h inpatient/amputation/eye-loss (tightest wins). PII guard via regex. [`osha_record_incident`, `osha_annual_300a`]

## PSN bridges (the synergy story)

Proven by iter37 E2E HTTP integration — single test chains 11 calls through 5 engines:

```
Inbound receipt (iter34)
  → InspectionReport (iter33) via inspection_required: true
  → CofC issuance (iter33) when pass
  → 3-way match (iter34) reconcile cents
  → AP payment gate
  → PO state advance (iter35) auto-→ received → invoiced → paid
  → VendorPerformance (iter29): ack_date − po_date feeds responsiveness, promise_date − received_date feeds OTD
  → TimeClock (iter36) worked_minutes → Payroll (iter19) regular + OT hours
  → OSHA (iter38) recordable → NCR (iter23) via capa_required
  → Every engine → ExecutiveSummary (iter31) aggregated red-flags
```

Every JSON output is valid input to the next call. Cents reconcile exactly forward AND backward — the hotel-slot soul's *"numbers must reconcile both ways"* invariant.

## Hotel-soul invariants (enforced everywhere)

- **Cents-resolution** — `line_extension_cents`, `total_extension_cents`, `payroll_total_cents` always `Number.isInteger`; PO/invoice cents reconcile exactly through HTTP round-trip.
- **PII-free outputs** — only `*_id` strings in JSON; OSHA description scanned for SSN/email/phone/"Mr. Smith" patterns; verified via `JSON.stringify` regex on HTTP responses.
- **R12 fail-loud** — every engine ≥3 adversarial inputs (NaN, Infinity, fractional cents, invalid enum, future timestamp, over-receipt, illegal state transition) surface engine error verbatim through Express.
- **Object.frozen** — returns + nested arrays + nested objects + state_history + change_orders all frozen.
- **Segregation of duties** — PO submit (buyer ≠ approver), timeclock edit (approver ≠ employee), expense approval (approver ≠ requester).
- **Federal/regulatory compliance** — FLSA 40h weekly OT · OSHA 1904 recordable criteria + 8h/24h reporting · ISO 9001 §8.6 product release · IRS §125 QLE 30-day window.

## Test surface

~280 hotel-namespace tests passing on `cad-fusion-live-ms0`:

| Suite | Count |
|---|---|
| ExecutiveSummary unit | 17 |
| InspectionReport unit | 23 |
| ShippingReceivingLog unit | 25 |
| PurchaseOrderLifecycle unit | 30 |
| EmployeeTimeClock unit | 30 |
| OSHA300Log unit | 40 |
| hotel-portal live-integration HTTP | 40 (incl. 1 E2E synergy proof) |

Re-run:

```bash
cd H:/prism/mcp-server
npx vitest run src/__tests__/hotel-portal-live-integration.test.ts          # 40 HTTP roundtrips
npx vitest run src/__tests__/{Executive,Inspection,Shipping,Purchase,EmployeeTime,OSHA}*.test.ts  # 165 unit
```

## /system-viz wiring

Generator: [`scripts/generate-hotel-domain-features.mjs`](../../scripts/generate-hotel-domain-features.mjs) — classifier regex extended in this stretch:

- `/^inspection_/i` → BUSINESS_PATTERNS
- `/^shipping_/i` → BUSINESS_PATTERNS
- `/^timeclock_/i` → BUSINESS_PATTERNS
- `/^osha_/i` → SAFETY_PATTERNS (already present, first new safety-axis nodes this stretch)

Staging: `state/shared/system-viz/staging/hotel-domain-features.json` (357 → 376 nodes, +19).

## Where to find the work

| Surface | Path |
|---|---|
| Engines | `mcp-server/src/engines/{ExecutiveSummary,InspectionReport,ShippingReceivingLog,PurchaseOrderLifecycle,EmployeeTimeClock,OSHA300Log}Engine.ts` |
| Tests | `mcp-server/src/__tests__/<EngineName>.test.ts` + `hotel-portal-live-integration.test.ts` |
| Dispatcher | `mcp-server/src/tools/dispatchers/businessDispatcher.ts` (+24 actions) |
| REST | `mcp-server/src/routes/hotel-portal.ts` (+16 endpoints, 29 total) |
| React | `mcp-server/web/src/pages/HotelPortalPage.tsx` (8 view modes) |
| Viz | `scripts/generate-hotel-domain-features.mjs` + `state/shared/system-viz/staging/hotel-domain-features.json` |

## Commit chain

| Iter | Commit | Engine / Surface |
|---|---|---|
| 32 | `acee69cad3` (absorbed) | ExecutiveSummary 4-surface wire |
| 33 | `ab25b3bad9` | InspectionReportEngine |
| 34 | `2804806ccf` | ShippingReceivingLogEngine |
| 35 | `3bbd01970b` | PurchaseOrderLifecycleEngine |
| 36 | `7833436b88` | EmployeeTimeClockEngine |
| 37 | `4b9659427e` | E2E synergy proof + frontend close-out |
| 38 | `9299bd932e` | OSHA300LogEngine |

## Lessons (per CLAUDE.md "Recent regressions" + memory feedback)

- **Per-file scrutiny gate caught weak assertions** — iter36 timeclock test had `toBeDefined()`; test-legitimacy-gate rejected. Rewrote with concrete value assertions. The hook works.
- **FP precision at tolerance boundaries** — iter33 InspectionReport `10.050 - 10.000` IEEE 754 = 0.04999…71 < 0.05. Used `10.04999` strictly inside; documented "real metrology adds MSA buffer outside the engine, not inside". Never weakened the engine's exact comparison. See [[feedback_fp_precision_tolerance_boundary]].
- **Shared-tree commit absorption** — iter32 files absorbed into Charlie's `acee69cad3` (no named attribution per [[feedback_commit_to_slot_worktree]]). Subsequent iter33+ landed with named attribution. Race continues to be a hazard on the shared tree.
- **/loop drift discipline** — per [[feedback_autonomous_loop_drift_discipline]], cap anomaly investigation at ≤1 extra tick. After iter38 the /loop kept firing at YELLOW token state — disciplined response: close PSN legs one per tick (this wiki entry = leg #3) rather than spawn iter39 into a closed scope without operator confirmation.

## Open follow-ups

1. **Self-learn dimension** — milestone-sized, not iter-sized. Tracked as `HOTEL-SELF-LEARN-MS0` (training data corpus + persistence + retraining cycle). Should NOT be spawned without operator scope.
2. **ISO 9001 explicit compliance dashboard engine** — consolidates §4-§10 clause coverage into single auditable score. Natural follow-up if operator wants ISO surfacing beyond implicit clause coverage already shipped.
3. **`/close-out-audit`** to formalize MILESTONE_PROGRESS + envelope status for the iter14-iter38 hotel marathon.

## PSN legs

- ✓ #1 Obsidian brain — [[reference_hotel_marathon_iter32_38_2026_05_26]]
- ⚠ #2 PRISM OS — not yet (would need `prism_operating_system` action surfacing portal state)
- ✓ #3 Wiki — this entry
- ✓ #4 Memories — same reference memo as #1
- ⚠ #5 Tribal — not yet (no tribal tips on hotel ERP workflows)
- ✓ #6 System Viz — 376 nodes
- ✓ #7 Engines — 6 new
- n/a #8/#9 Algorithms/Formulas — pure business-rule engines
- n/a #10 NN/GNN — domain not RL/predictive
- ⚠ #11 PRISM AI — not yet (no `aiSystemRouterEngine.route()` integration for portal workflows)
