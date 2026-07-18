---
name: reference_business_phase3_cost_to_cash_2026_06_13
description: "Business (hotel) Phase-3 deeper anchor — Hermes-planned. Integrated cost-to-cash automation: ASC 606 5-step + job-order costing variance analysis (material/labor/overhead) -> a JOURNAL-ENTRY MATRIX tightly coupled to ERP/QuickBooks + EDI X12 (810 invoice / 830 forecast / 855 PO-ack); FLSA exempt/non-exempt labor into ASC 606 price allocation; AS9100/ISO9001 Clause 8.5.1 (production control) + 9.1.3 (data analysis) -> predictive variance thresholds; rolling 13-WEEK cash-flow forecast tied to job-order WIP; NIST 800-171 3.4.3 cost-data protection. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.489Z
aliases: reference_business_phase3_cost_to_cash_2026_06_13
---


**Context:** Phase-3 business anchor — **Hermes-planned**. Deepens [[reference_business_gaap_costaccounting_erp_2026_06_13]]
(Phase-2). Spec §hotel.

## The next layer: integrated cost-to-cash automation
- **Cost-to-cash spine:** quote (charlie) → order → job-order WIP → completion → ASC 606 revenue recognition →
  invoice (EDI X12 **810**) → cash. Each stage auto-posts to the GL. Tightly coupled to QuickBooks + EDI X12
  (**830** planning/forecast schedule, **855** PO acknowledgement) so customer transactions drive the ledger.
- **Variance → journal-entry matrix:** job-order costing variances (material price/usage, labor rate/efficiency,
  overhead spending/volume) each map to specific GL journal entries (a documented matrix) → automated month-end
  variance posting + the quote-vs-actual signal back to charlie's Bayesian cost model.
- **Labor costing into ASC 606:** FLSA exempt/non-exempt + OT rules feed the labor cost that flows into the
  transaction-price allocation (step 4) — correct labor burden in revenue timing.
- **Predictive variance thresholds (AS9100/ISO 9001):** Clause **8.5.1** (production control) + **9.1.3**
  (analysis of data) → set statistical control limits on cost variances; flag jobs trending over-cost BEFORE
  completion (early-warning, not post-mortem).
- **Rolling 13-week cash-flow forecast** tied to job-order WIP (the standard treasury horizon): WIP + AR aging +
  AP schedule → weekly cash projection. The owner-facing financial control.
- **Compliance:** NIST 800-171 **3.4.3** (audit/track config + cost-data protection) for defense-customer CUI.

## Wiring / consumers (R15)
- GALAXY: `engines/business/` (hotel). INPUTS: charlie (quotes), shop-floor (WIP/labor actuals), juliett (stores).
  OUTPUTS: the actuals + variance signal that charlie's reconciliation loop consumes; owner cash-flow dashboard.
  DOMAIN: business; the variance-journal + 13-week-forecast pattern is hotel-specific.
- AUTO-INVOCATION: month-end variance posting + weekly cash-flow refresh (scheduled), WIP-trend over-cost alert.

## Next (Phase-4, per Hermes — hotel's build)
Build the variance→journal-entry matrix + the 13-week cash-flow engine off job-order WIP; wire QuickBooks API +
EDI X12 810/830/855; seed JM customers (the standing open thread). Pairs with charlie (reconciliation) + shop-floor.

Sources (Hermes-planned): FASB ASC 606 + ASC 330; job-order costing + variance analysis (Horngren); ANSI X12
(810/830/855); SAE AS9100 / ISO 9001:2015 cl. 8.5.1 + 9.1.3; NIST SP 800-171 3.4.3; 13-week cash-flow (treasury
standard). Planner: Hermes (xAI Grok, :8645).
