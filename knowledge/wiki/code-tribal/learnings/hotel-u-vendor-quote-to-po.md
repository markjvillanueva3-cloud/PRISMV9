# HOTEL/U-VENDOR-QUOTE-TO-PO — [MAIN] [HOTEL]/U-VENDOR-QUOTE-TO-PO (slot:hotel iter19) [BOOTSTRAP-SLOT-ENFORCE]: G3 close-out — vendor-quote → purchase-order lifecycle with three-way-match invariant

**Commit:** `6569dea05715` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T19:44:45-05:00
**Tags:** hotel, u-vendor-quote-to-po, auto-distilled

## Subject
[MAIN] [HOTEL]/U-VENDOR-QUOTE-TO-PO (slot:hotel iter19) [BOOTSTRAP-SLOT-ENFORCE]: G3 close-out — vendor-quote → purchase-order lifecycle with three-way-match invariant

## Body
```
[MAIN] [HOTEL]/U-VENDOR-QUOTE-TO-PO (slot:hotel iter19) [BOOTSTRAP-SLOT-ENFORCE]: G3 close-out — vendor-quote → purchase-order lifecycle with three-way-match invariant

NEW ENGINE: VendorQuoteToPurchaseOrderEngine.ts (state engine, lifecycle: vendor_quote → PO → receipts → 3-way match)

Closes G3 from ERP-comparison audit. Vendor-side complement to existing QuoteToOrderBridgeEngine (customer-quote → sales-order, hotel iter4 2026-05-20 commit 0489e70146).

Surfaces: recordVendorQuote / convertQuoteToPO (partial-qty supported, refuses over-quote) / recordPOReceipt (multi-receipt, refuses over-receipt) / threeWayMatch (PO ↔ receipts ↔ invoice, refuses match on variance > 0.01) / getQuote / getPO / listQuotes / listPOs.

Hotel-soul:
- HOTEL-SOUL three-way-match: refuses to mark PO matched unless PO_total == receipt_total == invoice_total within 0.01; surfaces variance to operator
- HOTEL-SOUL over-receipt refusal: receipts that would push cumulative received above ordered_qty REFUSED (even partial cumulative over) — never silently absorbed
- R12 fail-loud: duplicate SKU, ordered > quoted, unknown quote/PO/SKU, non-positive qty/price, malformed ISO date, double-conversion all throw
- state-machine forward-only: quote(open→converted/expired); PO(open→partially_received→fully_received→matched/cancelled); backward moves throw
- defensive copy on every public read

Reference: APICS CSCP §4 (Purchasing & 3-way match); Garrison/Noreen Managerial Accounting 17e Ch.4.

Tests 22/22: MSC quote (2 line items, total 1985), full + partial conversion, partial + full + cumulative-over-receipt scenarios, 3-way matched success (985) and refused on variance (5 delta), state-machine guards (no further receipts after matched, no match on partial received), R12 across surface.

DISPATCHER WIRING: businessDispatcher.ts (+8 actions: vendor_quote_record/_get/_list, vendor_quote_to_po, po_receipt_record, po_three_way_match, po_get, po_list)
PHONE-APP/PWA: prismBusiness.ts (+8 typed REST wrappers + 5 result interfaces)

PSN synergy: Engines leg (vendor-side PO lifecycle) + Wiki leg (APICS + Garrison/Noreen refs) + System Viz (8 new actions) + PRISM AI (accounting reconciliation queryable for cross-domain reasoning).

Closes G3 from 13-gap ERP-comparison audit. Session total: 11 of 13 gaps closed via 8 algorithms + 5 engines + 43+ dispatcher actions + 43+ REST wrappers. Remaining 2 (G2 OCR ML + G6 X12 EDI) explicitly deferred with rationale in state/shared/CLOSE-OUT-DEFERRED.md — both genuinely need external infrastructure (Tesseract docker, X12 library) that single-loop iterations cannot honestly provision.
```

## Files touched (5)
- .../VendorQuoteToPurchaseOrderEngine.test.ts       | 250 +++++++++++++
- .../engines/VendorQuoteToPurchaseOrderEngine.ts    | 406 +++++++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  60 +++
- mcp-server/web/src/api/prismBusiness.ts            |  40 ++
- 4 files changed, 756 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6569dea05715`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._