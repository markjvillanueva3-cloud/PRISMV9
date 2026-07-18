# QUOTING-SYNERGY-MS0/U-QP-OUTBOUND-PROMOTE-GATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-OUTBOUND-PROMOTE-GATE (slot:charlie): wire real outbound-price distribution alignment as a secondary OODA promote gate

**Commit:** `d294957c4d2b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T18:22:33-05:00
**Tags:** quoting-synergy-ms0, u-qp-outbound-promote-gate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-OUTBOUND-PROMOTE-GATE (slot:charlie): wire real outbound-price distribution alignment as a secondary OODA promote gate

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-OUTBOUND-PROMOTE-GATE (slot:charlie): wire real outbound-price distribution alignment as a secondary OODA promote gate

gateOutboundAlignment() + prism_quoting:outbound_promote_check action. The
quoting closed-loop now has a SECOND grain-correct promote gate alongside the
provenance gate (4c12a75a8d): before calibration factors promote, compare the
predicted-quote PRICE distribution against the real OUTBOUND sold-price
distribution (OutboundPriceIndexEngine.compareToPredicted, against:"line" =
per-part-job FMV ext_price grain). Predicted materially above realized sold
prices (ratio > 1+tol on a RELIABLE reference) -> withheld-outbound-drift,
block:true. Fail-closed: an unreliable/empty reference -> unverified,
block:false (a withheld live write is reversible; promoting a drifted factor
poisons real customer quotes).

WHY outbound distribution, not ActualCostEngine.profitability(): that loader is
COST-grain (estimated_cost/actual_cost). Feeding it into the PRICE-grain
predicted_quote_usd/actual_invoice_usd slots would train out JM's 20% margin ->
systematic under-quotes (charlie soul refuse #4). Investigated grain BEFORE
building (R13 logical order) and redirected to the real price distribution.

LIVE-DATA finding (R15 validate): the real against:"line" ext_price reference
median is OCR-$1 noise (~$1.005) while IQR stays wide, so the IQR-collapse
reliability check reads reliable falsely -> real $-magnitude quotes read
predicted-high. The gate LOGIC is correct; the reference DATA is not clean
enough to gate live yet. Captured as a hermetic always-run regression
(OCR-noise fixture). The runCycle deps-wire (U-QP-OUTBOUND-OODA-DEPS-WIRE) is
gated on ext_price OCR cleanup so it cannot false-block every real quote.

Tests: 62 pass (47 engine + 15 dispatcher), tsc clean. Hermetic tmpdir
fixtures (CLEAN + OCR), no dependency on the gitignored jm-sold-orders.json.
3-of-3 scrutiny PASS (A logic / B test-integrity / C wiring), 0 P0/P1.

Files:
- engines/QuotingClosedLoopEngine.ts: +gateOutboundAlignment + OutboundMatchLike/OutboundAlignmentGate types
- schemas/quotingActionSchemas.ts: +outbound_promote_check (predicted[], against, drift/reliability knobs)
- tools/dispatchers/quotingDispatcher.ts: +outbound_promote_check handler (compareToPredicted -> gate)
- __tests__/QuotingClosedLoopEngine.test.ts: +7 pure gate tests
- __tests__/quotingDispatcher.test.ts: +7 hermetic round-trip tests (identity/drift/grain/unverified/OCR/maxConcentration)
```

## Files touched (6)
- mcp-server/src/__tests__/QuotingClosedLoopEngine.test.ts |  50 ++++++++++++++++++++++++++++
- mcp-server/src/__tests__/quotingDispatcher.test.ts       | 100 ++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/engines/QuotingClosedLoopEngine.ts        |  90 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts           |  13 ++++++++
- mcp-server/src/tools/dispatchers/quotingDispatcher.ts    |  13 ++++++++
- 5 files changed, 265 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d294957c4d2b`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._