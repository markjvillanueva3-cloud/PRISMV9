# QUOTING-JM-GROUND-MS0/U-3VIEW-ADVISOR-DEPTH — [MAIN-FORCE] [QUOTING-JM-GROUND-MS0]/U-3VIEW-ADVISOR-DEPTH (slot:charlie): data-free market-gap improvement lever

**Commit:** `af184483e228` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T12:47:21-05:00
**Tags:** quoting-jm-ground-ms0, u-3view-advisor-depth, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING-JM-GROUND-MS0]/U-3VIEW-ADVISOR-DEPTH (slot:charlie): data-free market-gap improvement lever

## Body
```
[MAIN-FORCE] [QUOTING-JM-GROUND-MS0]/U-3VIEW-ADVISOR-DEPTH (slot:charlie): data-free market-gap improvement lever

The directive wants "advise where there is room for improvement". The shop-rate-gap lever only
fires with a learned AdaptiveShopRate prior (cold-start -> silent). Added a 4th DATA-FREE lever
(underpriced-vs-market / above-market) computed from the engine own optimal-vs-current views -- so
the "where is room to improve" advice fires on EVERY quote, not just when a prior exists:
- optimal > current by >5% -> "underpriced vs market, leaving margin on the table" (opportunity + $ upside)
- optimal < current by >5% -> "above market, watch price-sensitive bids" (info)

18 tests pass (11 engine + 3 dispatcher round-trip + 4 redaction). Added an advisor well-formedness
test (every lever from the known id set, finite non-negative upside, valid severity). 0 tsc errors.

slot:charlie
```

## Files touched (3)
- mcp-server/src/engines/ThreeViewPricingEngine.test.ts | 22 ++++++++++++++++++++++
- mcp-server/src/engines/ThreeViewPricingEngine.ts      | 40 ++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 62 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show af184483e228`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-JM-GROUND-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._