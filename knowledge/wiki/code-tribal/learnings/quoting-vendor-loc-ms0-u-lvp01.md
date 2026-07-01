# QUOTING-VENDOR-LOC-MS0/U-LVP01 — [MAIN-FORCE] [QUOTING-VENDOR-LOC-MS0]/U-LVP01 (slot:charlie): location/logistics/vendor-aware pricing + alternative-vendor suggestions

**Commit:** `864f8f6e430f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T13:19:02-05:00
**Tags:** quoting-vendor-loc-ms0, u-lvp01, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING-VENDOR-LOC-MS0]/U-LVP01 (slot:charlie): location/logistics/vendor-aware pricing + alternative-vendor suggestions

## Body
```
[MAIN-FORCE] [QUOTING-VENDOR-LOC-MS0]/U-LVP01 (slot:charlie): location/logistics/vendor-aware pricing + alternative-vendor suggestions

Adds the directive feature: pricing based off location, logistics, available vendors and
distributors -- uses CURRENT JM vendors AND offers alternative-vendor options with suggestions.

LocationAwareVendorPricingEngine: total LANDED cost (part + freight + customs) across current
+ alternative JM vendors by buyer region, ranked, with a sourcing suggestion. Composes the
existing GeoLogisticsRoutingEngine (landed cost, zone rate card) + the 482-vendor JM catalog
(vendor-catalog-db). Local/domestic vendors win on delivered cost despite higher unit price.
Advisory (soul): alternatives are a ranked suggestion, never an auto-switch.

Wired prism_quoting:location_vendor_pricing (enum + schema + dispatcher) + quoteLocationVendorPricing()
client + a Location & vendor sourcing panel on QuoteBuilderPage (current vendor + ranked
alternatives + savings badge). 14 tests (11 engine reference-value + 3 dispatcher round-trip).

Caught + fixed a real cwd-path bug: catalog path was process.cwd()-relative assuming repo root,
but the server + tests run from mcp-server/ -> vendors_considered=0. Now tries both cwd bases.
Validated LIVE on the 482-vendor catalog: JM material lot -> 43 vendors, ACTION METALS/Alro Steel/
Bohler-Uddeholm by name, $8150 landed, correct current-competitive verdict. 0 web tsc errors.

slot:charlie
```

## Files touched (8)
- ...cationAwareVendorPricingEngine.dispatch.test.ts |  26 ++
- .../LocationAwareVendorPricingEngine.test.ts       | 191 +++++++++++
- .../engines/LocationAwareVendorPricingEngine.ts    | 375 +++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts     |  17 +
- .../src/tools/dispatchers/quotingDispatcher.ts     |   8 +
- mcp-server/web/src/api/client.ts                   |  56 +++
- mcp-server/web/src/pages/QuoteBuilderPage.tsx      | 110 +++++-
- 7 files changed, 782 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 864f8f6e430f`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-VENDOR-LOC-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._