---
name: cost-estimation-guide
description: 'Manufacturing cost estimation guide. Use when the user needs part cost breakdowns, should-cost analysis, make-vs-buy decisions, or competitive quoting support.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Costing
---

# Manufacturing Cost Estimation Guide

## When to Use
- Estimating per-part cost for quoting
- Should-cost analysis for procurement negotiations
- Make-vs-buy decision support
- Batch size optimization for cost reduction

## How It Works
1. Define part: material, features, tolerances, quantity
2. Estimate material cost via `prism_calc→material_cost` (weight × $/kg + buy-to-fly)
3. Estimate machining cost via `prism_calc→cost_estimate` (cycle time × shop rate)
4. Add tooling amortization via `prism_calc→tooling_cost`
5. Apply overhead, markup, and lot surcharges

## Returns
- Cost breakdown: material, machining, tooling, finishing, inspection, overhead
- Cost curve across quantities (1, 10, 100, 500, 1000 pcs)
- Sensitivity analysis (what-if on material price, shop rate, batch size)
- Break-even point for dedicated tooling/fixtures

## Example
**Input:** "Cost 7075-T6 bracket, 3-axis milling, Qty 100 and 500"
**Output:** Qty 100: Material $3.20, Machining $12.80 (7.4min @ $104/hr), Tooling $1.50, Finish $0.80, QC $1.20, OH 25% = $24.38/pc. Qty 500: $19.10/pc (setup amortization drops $3.40, tooling $1.20). Break-even for dedicated fixture at Qty 180.
