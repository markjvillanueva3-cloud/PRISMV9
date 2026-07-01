# HOTEL/U-PO-LIFECYCLE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-PO-LIFECYCLE (slot:hotel iter35 /goal /yolo): purchase-order FSM (8 states) + line-item tracking + change-order trail

**Commit:** `3bbd01970bcf` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T03:06:10-05:00
**Tags:** hotel, u-po-lifecycle, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-PO-LIFECYCLE (slot:hotel iter35 /goal /yolo): purchase-order FSM (8 states) + line-item tracking + change-order trail

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-PO-LIFECYCLE (slot:hotel iter35 /goal /yolo): purchase-order FSM (8 states) + line-item tracking + change-order trail

Completes the AP cycle upstream half: PO drafting → vendor acknowledgement → receipts (via iter34 ShippingReceiving) → invoice 3-way match (via iter34 threeWayMatch) → payment release → close. Closes the operator-named ordering/PO gap. AP must NEVER pay an invoice whose PO is not in invoiced state.

Shipped (6 files):
- engines/PurchaseOrderLifecycleEngine.ts — createPO / transition / recordReceipt / appendChangeOrder / getStatus. Explicit ALLOWED_TRANSITIONS table for all 8 states (draft/submitted/acknowledged/partially_received/received/invoiced/paid/closed/cancelled). Over-receipt rejected (must file change order). SoD enforced on submit (buyer != approver). Line-item tally with line_extension_cents = qty × unit_price_cents.
- __tests__/PurchaseOrderLifecycleEngine.test.ts — 30 tests: happy-path full lifecycle + 5 illegal-transition rejections + SoD enforcement + partial/full/over receipt + multi-receipt accumulation + change-order trail (allowed/rejected in draft) + getStatus pct/cancellable/receivable flags + 5 R12 (empty lines, fractional cents, negative qty, bad date, bad currency) + PII-free + 5-currency variability floor + cents-resolution + frozen state_history.
- tools/dispatchers/businessDispatcher.ts — 5 new actions: po_create, po_transition, po_record_receipt, po_append_change_order, po_get_status.
- routes/hotel-portal.ts — POST /po/create + /po/transition + /po/receipt + /po/status; health bumped portal_engines=16, iter_range=iter15..iter35.
- __tests__/hotel-portal-live-integration.test.ts — 4 new HTTP roundtrips: full create+transition happy path, illegal draft→paid jump, over-receipt rejection, status summary derivation. realCallTool wired 4 new actions.
- ENGINE_DIGEST.md — alphabetical insert.

/system-viz: 364 → 368 nodes (+4 new PO actions; classifier picks them up via existing /^po_/i regex in ACCOUNTING_PATTERNS — color: cyan, axis: accounting, roost: ghost.realtime_accounting). Total 13 po_* nodes now (4 new + 9 pre-existing).

PSN bridges live:
- PO created → ShippingReceivingLogEngine (iter34): receipts cite po_number; threeWayMatch consumes PO unit_price for price reconciliation
- PO acknowledged → VendorPerformanceTrackerEngine (iter29): ack_date vs po_date feeds responsiveness; promise_date vs received_date feeds on-time-delivery
- PO state machine → ExecutiveSummaryEngine (iter31): open-PO count by state surfaces as financial workload
- PO change order → NCR (iter23): unauthorized change → R12 reject; authorized change → audit trail

Hotel-soul invariants verified end-to-end:
- Segregation of duties: submit() rejects when approver == buyer
- Cents-resolution: line_extension_cents + total_extension_cents always Number.isInteger
- State machine integrity: ALLOWED_TRANSITIONS table is the ONLY way to change state; closed/cancelled terminal
- Over-receipt: HARD REJECT at recordReceipt() — cannot silently expand qty_ordered; change order required
- PII-free: HTTP roundtrip + JSON regex confirms no vendor_name / contact_email / credit-card / SSN
- R12 fail-loud: illegal transition + over-receipt + fractional cents + negative qty all surface engine error verbatim through Express

Tests: 61/61 PASS (30 PurchaseOrderLifecycleEngine unit + 31 hotel-portal live integration including 4 new PO roundtrips).
```

## Files touched (7)
- mcp-server/data/docs/ENGINE_DIGEST.md              |   1 +
- .../__tests__/PurchaseOrderLifecycleEngine.test.ts | 346 +++++++++++++++++++
- .../hotel-portal-live-integration.test.ts          |  98 +++++-
- .../src/engines/PurchaseOrderLifecycleEngine.ts    | 381 +++++++++++++++++++++
- mcp-server/src/routes/hotel-portal.ts              |  33 +-
- .../src/tools/dispatchers/businessDispatcher.ts    |  35 ++
- 6 files changed, 890 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3bbd01970bcf`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._