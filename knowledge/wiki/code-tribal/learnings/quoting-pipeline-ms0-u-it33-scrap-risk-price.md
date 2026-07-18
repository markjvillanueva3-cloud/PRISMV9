# QUOTING-PIPELINE-MS0/U-IT33-SCRAP-RISK-PRICE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-IT33-SCRAP-RISK-PRICE (slot:foxtrot /loop iter33): ScrapRiskPricingEngine — quote-side scrap-risk markup (5th P1 closure)

**Commit:** `264f28c124fe` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T16:39:03-05:00
**Tags:** quoting-pipeline-ms0, u-it33-scrap-risk-price, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-IT33-SCRAP-RISK-PRICE (slot:foxtrot /loop iter33): ScrapRiskPricingEngine — quote-side scrap-risk markup (5th P1 closure)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-IT33-SCRAP-RISK-PRICE (slot:foxtrot /loop iter33): ScrapRiskPricingEngine — quote-side scrap-risk markup (5th P1 closure)

Closes iter20 P1 "scrap-risk pricing" gap. First-article + low-volume + high-complexity jobs
have non-zero expected scrap; quote must recover the loss in unit price. Formula:
  scrap_factor   = 1 / (1 - rate)
  parts_required = ⌈ordered × scrap_factor⌉
  scrap_loss/good = (material + machining) × (scrap_factor - 1)
  markup_pct     = scrap_loss / good_part_cost × 100
  sell_price     = good_part × scrap_factor

Auto-rates expected_scrap_rate from drivers (Boothroyd-Dewhurst §11 + Modern Machine Shop 2017):
  - Process maturity: first_article=3% / proven_out=1% / mature=0.5%
  - Complexity: simple=0 / moderate=0.5% / complex=1.5% / high_complexity=2.5%
  - Cpk shortfall: <1.0 → +3% / <1.33 → +1.5%
  - Exotic material (Inconel/Ti/hardened): +1.5%
  - Operator experience <1yr: +1.5%

Verdict tiers: acceptable (<5%) / elevated (5-10%) / high (>10%, verify capability) / reject
(>max, default 25%). First-article + qty<5 → NCR-allowance warning.

Reference: AIAG SPC §4 (capability ↔ scrap); ASME B89.7.5; Boothroyd-Dewhurst §11; Modern Machine Shop.

Files:
  + src/engines/ScrapRiskPricingEngine.ts (158 lines, 5-driver auto-rater + 4 verdict tiers)
  + src/__tests__/ScrapRiskPricingEngine.test.ts (23 tests: 6 throws + baseline-math +
    explicit-override + verdict tiers + 5-driver auto-rating + compound-stack worst-case +
    zero-cost edge + NCR-allowance warning + source cite; all 23 PASS)
  + src/tools/dispatchers/safetyDispatcher.ts — scrap_risk_price action routable

Tests: 23/23 PASS (10ms). Variability: 3 maturity tiers × 4 complexity tiers × Cpk range,
compound-driver worst-case (5-driver stack → 11.5%). Adversarial: rate≥1.0 throw, qty=0,
zero-cost path, override-vs-auto coexistence.

5th P1 closure: burr+coolant+threading+tool-cost+scrap-risk. Pathspec-staged per BOOTSTRAP-SLOT-ENFORCE.
```

## Files touched (4)
- .../src/__tests__/ScrapRiskPricingEngine.test.ts   | 157 +++++++++++++++
- mcp-server/src/engines/ScrapRiskPricingEngine.ts   | 217 +++++++++++++++++++++
- .../src/tools/dispatchers/safetyDispatcher.ts      |   8 +-
- 3 files changed, 381 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 264f28c124fe`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-PIPELINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._