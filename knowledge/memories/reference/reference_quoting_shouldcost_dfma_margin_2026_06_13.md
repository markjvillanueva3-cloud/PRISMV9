---
name: reference_quoting_shouldcost_dfma_margin_2026_06_13
description: "Quoting (charlie) Phase-2 deep-research anchor — should-cost model (material + machining cycle×rate + setup/NRE amortized over qty + finishing/outsource + margin), Boothroyd-Dewhurst DFMA machining cost, cycle-time-from-toolpath (CAM→quote link), margin theory (contribution, NRE qty-break amortization, Wright's-law learning curve), RFQ bid-win calibration + quote-vs-actual reconciliation closed loop, market shop-rate $/hr by machine class. Written 2026-06-13 slot:zulu Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.143Z
aliases: reference_quoting_shouldcost_dfma_margin_2026_06_13
---


**Context:** Phase-2 anchor for the quoting galaxy (charlie — print-to-quote product), per the 2026-06-13
knowledge-max `/goal`. Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §charlie.

## Should-cost model (the quote backbone)
`Quote = Material + Machining + Setup/NRE(amortized) + Finishing/Outsource + Overhead + Margin`
- **Material:** stock volume × density × $/lb (+ scrap/drop factor; buy-to-fly ratio for billet). From CAD bbox
  + stock allowance.
- **Machining:** Σ(operation cycle-time × machine $/hr-rate). Cycle time from toolpath (the CAM→quote link):
  cut length / feed + rapids + tool-changes + dwell + approach/retract; air-cut + engagement from the IPW. This
  is where speed-feed (oscar) + CAM (kilo) feed quoting directly.
- **Setup / NRE (non-recurring):** programming + fixture + first-article + setup hrs — **amortized over lot qty**
  (so unit price drops with quantity — the qty-break curve). NRE/qty dominates small-lot pricing.
- **Finishing / outsource:** heat-treat, plating, anodize, grinding, inspection — often vendor pass-through + markup.
- **Overhead + margin:** shop burden rate + target margin.

## Cost-estimation methods (literature)
- **Boothroyd-Dewhurst DFMA** — the canonical analytical machining-cost model (setup + process time per feature +
  tooling); also the DFM feedback (expensive features → redesign). **Feature-based / parametric** estimation maps
  recognized features (from delta AFR) → standard time. **Analogical / regression** from historical jobs (the
  reconciliation corpus). **Activity-based costing** for overhead allocation.
- **Cycle-time estimation** is the highest-leverage accuracy driver — a good toolpath-derived time beats a
  feature-table guess. Validate against machine-monitor actuals (shop-floor galaxy).

## Margin + bid strategy
- **Contribution margin** (price − variable cost) vs full-absorption. **NRE amortization** across qty breaks (1/10/
  100/1000 unit prices). **Learning curve** (Wright's law — cost per unit drops a fixed % per doubling of cumulative
  volume — relevant for repeat production). **Win-rate vs margin calibration:** higher margin → lower win
  probability; the bid-win curve optimizes expected profit = margin × P(win|margin). Competitive shop-rate
  intelligence ($/hr by machine class + region) anchors the rate.

## Closed-loop reconciliation (the self-improving lever)
- **Quote-vs-actual:** compare quoted cycle/setup/material vs shop-floor + ERP actuals → recalibrate the cost
  model (estimating error feeds back). This is charlie's closed-loop controller — the path from "decent quote"
  to "world-leading accurate quote." Pairs with hotel (ERP actuals) + shop-floor (cycle actuals).

## Integration (charlie)
- Consumes delta (features) + oscar/kilo (cycle time) + hotel (rates/actuals) + vendor-catalog-db (material +
  outsource pricing). Next deep-research (roadmap §charlie): ingest Boothroyd-Dewhurst DFMA cost equations +
  Wright's-law learning-curve model; calibrate cost-index against JM actuals (the reconciliation loop with real
  numbers). Web-verify current regional shop-rate benchmarks on the next pass.

Sources (canonical): Boothroyd, Dewhurst & Knight *Product Design for Manufacture and Assembly* (DFMA); Wright
1936 (learning curve / Wright's law); should-cost / activity-based-costing literature; competitive-bid theory
(win-rate vs margin). Expertise-authored anchor; regional rate benchmarks + DFMA equation specifics flagged for
web re-verification (web throttled this pass).
