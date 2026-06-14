---
name: reference_hotel_dispatcher_bucket_map_2026_05_28
description: prism_business 879 action cases mapped to 16 functional buckets
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.145Z
aliases: reference_hotel_dispatcher_bucket_map_2026_05_28
---


businessDispatcher.ts (prism_business) = 6746 lines, 879 action cases, 16 buckets: financial, gl_accounting, invoice_ar, po_ap, payroll, hr_benefits_pto, employee, customer_crm, quote, order_lifecycle, costing, scheduling_capacity, quality_ncr_capa, safety(loto/osha/sds/safety_training), asset_depreciation, orchestration(quote_to_ship_run/workflow/traveler/portal/roi/billing/analytics).
Invariants: gl_trial_balance BEFORE gl_journal_entry; quote_to_ship_run is THE canonical end-to-end orchestrator (never hand-chain order->WO->traveler->invoice).
