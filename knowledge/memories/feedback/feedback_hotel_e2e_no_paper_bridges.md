---
name: feedback_hotel_e2e_no_paper_bridges
description: Hotel/ERP build doctrine — every engine's JSON output must be a valid INPUT to the next engine in the chain; prove the chain with ONE end-to-end HTTP test; a "paper bridge" (output needing manual reshaping) is a defect
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.429Z
aliases: feedback_hotel_e2e_no_paper_bridges
---


In the business/ERP galaxy (slot:hotel), an engine chain is only "synergized" when **every engine's JSON output is a valid INPUT to the next engine with no hand-massaging**. The canonical chain is the AP/AR cycle: PO → shipping/receiving → inspection → CofC → 3-way-match → executive-summary. It is proven E2E by a SINGLE HTTP test that chains all the calls (the marathon's iter37 pattern: 11 calls through 5 engines, each call's response fed directly as the next call's request, one assertion chain, ZERO paper bridges).

A **"paper bridge"** = an engine output that a human (or a test fixture) has to reshape before the next engine will accept it. That is a defect, not an integration — it means the producer/consumer contract drifted.

**Why:** the hotel slot built the full ERP back-office across the HOTEL-ERP-MARATHON (iter32-38: ExecutiveSummary, InspectionReport, ShippingReceiving, the 8-state PurchaseOrderLifecycle FSM, EmployeeTimeClock, OSHA300Log). The deliverable that PROVED it was real — not a pile of disconnected engines — was the single E2E HTTP test chaining them. Disconnected engines that each pass their own unit tests but can't feed each other are a false "done." This is the business-domain instance of the producer→consumer→viz triplet doctrine.

**How to apply:**
1. When building any ERP lifecycle engine, make its output schema the next engine's input schema — design the contract first.
2. Ship a live HTTP integration test that chains producer→consumer for the whole subchain; assert the final output is correct, not just that each call returns 200.
3. If you find yourself reshaping a response before the next call, STOP — fix the contract, don't add a bridge.
4. State machines explicit (e.g. the 8-state PO FSM); 3-way-match gates AP; discrepancies flow to vendor-score → exec-summary red-flag, never a silent pass.

Links: [[reference_hotel_marathon_iter32_38_2026_05_26]] · [[reference_hotel_erp_hr_marathon_2026_05_25]] · the business-domain GSD codifies this as §2 Rule 3 (mcp-server/src/engines/business/GSD.md) · wiki `architecture/business-erp-ap-ar-cycle.md`.
