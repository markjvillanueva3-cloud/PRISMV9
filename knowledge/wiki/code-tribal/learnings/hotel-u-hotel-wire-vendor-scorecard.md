# HOTEL/U-HOTEL-WIRE-VENDOR-SCORECARD — [MAIN-FORCE] [HOTEL]/U-HOTEL-WIRE-VENDOR-SCORECARD (slot:hotel): FE-ready vendor scorecard adapter -- VendorScorecardPage now live (was empty/NaN table)

**Commit:** `796be2c6f165` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T12:39:27-05:00
**Tags:** hotel, u-hotel-wire-vendor-scorecard, auto-distilled

## Subject
[MAIN-FORCE] [HOTEL]/U-HOTEL-WIRE-VENDOR-SCORECARD (slot:hotel): FE-ready vendor scorecard adapter -- VendorScorecardPage now live (was empty/NaN table)

## Body
```
[MAIN-FORCE] [HOTEL]/U-HOTEL-WIRE-VENDOR-SCORECARD (slot:hotel): FE-ready vendor scorecard adapter -- VendorScorecardPage now live (was empty/NaN table)

ROOT CAUSE (per-file 2-arm scrutiny on the reverted pipeline/vendor cluster): VendorScorecardPage
calls vendorList() and reads .data as a rich Vendor[] (quality_score/delivery_score/price_score/
composite_score 0..100 + total_orders/ncr_count/on_time_pct/avg_lead_days), but vendor_list_all
returns string[] (vendor ids) -> the page rendered an empty/NaN table. "action exists" != "pure-wire"
when the engine return shape != what the page reads -> needs a shape ADAPTER (CostEstimatorPage class).

FIX (engine adapter, not a route hack):
  - VendorPerformanceTrackerEngine.listScorecards(args): composes computeScorecard per vendor (skips
    <3-PO vendors like rankVendors), maps the engine 0..1 metrics -> page 0..100 fields, derives
    ncr_count + SIGNED avg_lead_days (received-promised; negative=early) from the same in-window PO set
    computeScorecard uses (so ncr_count can never contradict quality_score -- identical window cutoff).
  - businessDispatcher: NEW action vendor_list_scorecards (enum + case, lazy import).
  - erp.ts: GET /vendor-list -> vendor_list_scorecards (rfqRoute envelope-unwrap); GET
    /vendor-scorecard/:vendor_id -> vendor_compute_scorecard (raw single card, future detail view).
  - 7 new R9 tests (24/24): happy path pins delivery_score=67/quality_score=0/composite=57/ncr=1/
    avg_lead_days=0.33/tier=probation; <3-PO skip; empty []; out-of-window exclusion; sorted+frozen;
    bad-as_of->[]; PII-free.

P2s fixed inline (both scrutiny arms): dead -Infinity cutoff branch removed (computeScorecard throws
on bad as_of first); adversarial test given teeth (toEqual([])); avg_lead_days signed-variance semantic
documented. No regression: vendorList()s only consumer is this page; the old string[] lives in a
separate untouched vendorListAll()/vendor_list_all. Dead client calls 52->50. build:fast + tsc clean.
```

## Files touched (5)
- .../VendorPerformanceTrackerEngine.test.ts         | 89 ++++++++++++++++++++++
- .../src/engines/VendorPerformanceTrackerEngine.ts  | 69 +++++++++++++++++
- mcp-server/src/routes/erp.ts                       | 13 ++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  8 ++
- 4 files changed, 179 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 796be2c6f165`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._