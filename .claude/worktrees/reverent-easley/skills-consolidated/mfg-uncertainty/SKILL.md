---
name: mfg-uncertainty
description: Propagate uncertainty through chained manufacturing calculations — GUM-compliant (MIT 1.010)
---

## When To Use
- Need to know the confidence interval on a calculated result (force, tool life, cost)
- Input parameters have known measurement uncertainty and you need to propagate it through formulas
- Validating whether a calculated value is reliable enough for decision-making
- Comparing two parameter sets where uncertainty overlap matters
- Required for quality-critical or safety-critical machining decisions
- NOT for deterministic calculations without uncertainty (use mfg-formula-lookup)
- NOT for parameter optimization (use mfg-param-optimize)

## How To Use
### Propagate uncertainty through a calculation chain
```
prism_calc action=uncertainty_chain params={
  chain: ["kienzle", "taylor", "power", "cost"],
  inputs: {
    kc11: {value: 1780, uncertainty: 50},
    mc: {value: 0.25, uncertainty: 0.02},
    h: {value: 0.15, uncertainty: 0.005},
    Vc: {value: 200, uncertainty: 5},
    taylor_C: {value: 350, uncertainty: 20},
    taylor_n: {value: 0.25, uncertainty: 0.01}
  }
}
```

### Single formula uncertainty
```
prism_calc action=uncertainty_chain params={
  chain: ["kienzle"],
  inputs: {
    kc11: {value: 1780, uncertainty: 50},
    mc: {value: 0.25, uncertainty: 0.02},
    h: {value: 0.15, uncertainty: 0.005}
  },
  confidence_level: 0.95
}
```

## What It Returns
```json
{
  "chain_results": [
    {
      "formula": "kienzle",
      "output": "kc",
      "value": 2864.5,
      "uncertainty": 185.3,
      "relative_uncertainty_pct": 6.5,
      "confidence_interval_95": [2501.2, 3227.8],
      "dominant_input": "mc (contributes 58% of output variance)"
    },
    {
      "formula": "taylor",
      "output": "tool_life_min",
      "value": 9.38,
      "uncertainty": 2.15,
      "relative_uncertainty_pct": 22.9,
      "confidence_interval_95": [5.16, 13.60],
      "dominant_input": "taylor_n (contributes 72% of output variance)"
    },
    {
      "formula": "power",
      "output": "power_kW",
      "value": 5.82,
      "uncertainty": 0.42,
      "relative_uncertainty_pct": 7.2,
      "confidence_interval_95": [5.00, 6.64]
    },
    {
      "formula": "cost",
      "output": "cost_per_part",
      "value": 3.42,
      "uncertainty": 0.68,
      "relative_uncertainty_pct": 19.9,
      "confidence_interval_95": [2.09, 4.75],
      "dominant_input": "tool_life uncertainty amplified through cost model"
    }
  ],
  "summary": {
    "total_chain_amplification": 3.06,
    "most_uncertain_output": "tool_life_min (22.9% relative uncertainty)",
    "recommendation": "Reduce mc and taylor_n uncertainty through additional material testing to improve chain reliability"
  }
}
```

## Examples
### Full Kienzle-Taylor-power-cost uncertainty chain
- Input: `prism_calc action=uncertainty_chain params={chain: ["kienzle", "taylor", "power", "cost"], inputs: {kc11: {value: 1780, uncertainty: 50}, ...}}`
- Output: Cost uncertainty is 19.9% ($2.09 - $4.75 at 95% CI), tool life is most uncertain at 22.9%, mc and taylor_n drive most variance
- Edge case: Non-linear formulas (like Taylor with exponent n) amplify input uncertainty significantly

### Identify which input to improve
- Input: Same chain, review dominant_input fields
- Output: mc contributes 58% of force variance, taylor_n contributes 72% of tool life variance
- Edge case: Reducing dominant input uncertainty by 50% typically reduces output uncertainty by 30-40% (non-linear propagation)
