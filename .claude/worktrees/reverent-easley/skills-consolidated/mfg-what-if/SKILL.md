---
name: What-If Scenario Analyzer
description: Scenario analysis — change parameters and see impact on cost, quality, time
---

## When To Use
- When evaluating trade-offs between cost, quality, and cycle time
- When a customer asks "what if we loosen the tolerance?"
- When comparing material alternatives for cost or lead time
- When assessing impact of batch size changes on unit cost
- NOT for parameter optimization — use mfg-param-optimize for that

## How To Use
```
prism_intelligence action=what_if params={
  baseline: {
    part: "bracket-001",
    material: "304SS",
    quantity: 500,
    tolerance: "±0.005"
  },
  scenarios: [
    { change: "material", value: "6061-T6" },
    { change: "tolerance", value: "±0.010" },
    { change: "quantity", value: 1000 }
  ]
}
```

## What It Returns
- Baseline metrics: cost, cycle time, quality risk score
- Per-scenario delta: cost change, time change, risk change
- Side-by-side comparison table across all scenarios
- Recommended scenario with reasoning
- Warnings for scenarios that violate constraints

## Examples
- Input: `what_if params={baseline: {material: "Ti-6Al-4V", quantity: 50}, scenarios: [{change: "material", value: "17-4PH"}]}`
- Output: Material swap saves 45% cost, adds 8% cycle time, comparable strength at operating temp

- Input: `what_if params={baseline: {tolerance: "±0.002"}, scenarios: [{change: "tolerance", value: "±0.005"}]}`
- Output: Loosening tolerance saves 30% cycle time, eliminates finish pass, drops from 3 tools to 2
