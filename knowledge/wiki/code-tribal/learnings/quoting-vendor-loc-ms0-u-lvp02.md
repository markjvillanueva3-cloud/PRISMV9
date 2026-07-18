# QUOTING-VENDOR-LOC-MS0/U-LVP02 — [MAIN-FORCE] [QUOTING-VENDOR-LOC-MS0]/U-LVP02 (slot:charlie): per-vendor advisory unit-price band -- differentiate vendors on real unit cost, not just freight

**Commit:** `7fb49f6b1806` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T13:52:17-05:00
**Tags:** quoting-vendor-loc-ms0, u-lvp02, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING-VENDOR-LOC-MS0]/U-LVP02 (slot:charlie): per-vendor advisory unit-price band -- differentiate vendors on real unit cost, not just freight

## Body
```
[MAIN-FORCE] [QUOTING-VENDOR-LOC-MS0]/U-LVP02 (slot:charlie): per-vendor advisory unit-price band -- differentiate vendors on real unit cost, not just freight

VendorUnitPriceEngine resolves a per-vendor ADVISORY unit-price band keyed on the catalog price-discovery tier (api/catalog/quote/unknown via pricing_access+has_api) and a region supply-cost factor, anchored to the quote's own material/part basis. Closes the U-LVP01 gap where LVP fed every vendor the SAME part value (ranking was freight-only).

WIRE: consumed inside LocationAwareVendorPricingEngine.priceVendor (per-UNIT anchor = part_value_usd/quantity, band, then band lot mid as partValueUsd -- no quantity^2) + standalone prism_quoting:vendor_unit_price action + schema + QuoteBuilderPage tier badges + advisory-band line (additive). VendorLandedOption carries unit_price_band so tier+confidence+'not a firm quote' travels (R12).

TEST: 36 tests (happy + 4 failure + 3 adversarial + dispatcher round-trip + live integration); band bounds derived from tier policy (R9). LVP refs re-derived for EU factor 1.08 (euro-alloys 1290->1372.40, savings 200->282.40 -- correct, not softened).

VALIDATE: live on the 482-vendor JM catalog -- EU api-vendor at 1.08 ($324/unit, $6480 lot); EU buyer surfaces ACTION METALS at 1.08 ($5400 vs $5000 US). No inlined shop-rate/material/margin constants. 2-arm engine + 2-arm integration scrutiny PASS.
```

## Files touched (11)
- mcp-server/src/data/vendor-price-discovery-tiers.ts             | 148 +++++++++++++++++++++++++++++
- mcp-server/src/engines/LocationAwareVendorPricingEngine.test.ts |  46 ++++++++--
- mcp-server/src/engines/LocationAwareVendorPricingEngine.ts      |  85 +++++++++++++++--
- mcp-server/src/engines/VendorUnitPriceEngine.dispatch.test.ts   | 108 ++++++++++++++++++++++
- mcp-server/src/engines/VendorUnitPriceEngine.test.ts            | 240 ++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/VendorUnitPriceEngine.ts                 | 191 ++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts                  |  12 +++
- mcp-server/src/tools/dispatchers/quotingDispatcher.ts           |  11 ++-
- mcp-server/web/src/api/client.ts                                |  19 ++++
- mcp-server/web/src/pages/QuoteBuilderPage.tsx                   |  31 ++++++-
_(+1 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7fb49f6b1806`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-VENDOR-LOC-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._