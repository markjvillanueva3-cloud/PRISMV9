---
name: Inverse Dimensional Solver
description: Given out-of-tolerance dimension, find root cause and corrective action
---

## When To Use
- A machined dimension is out of tolerance and you need to find why
- Parts are drifting in size over a production run
- Systematic dimensional errors appear across multiple features
- You need to distinguish between thermal, deflection, and programming causes

## How To Use
```
prism_intelligence action=inverse_dimensional params={
  nominal: 25.000,
  actual: 25.042,
  tolerance: 0.025,
  material: "4140",
  operation: "turning",
  feature: "OD",
  cutting_params: { speed: 200, feed: 0.2, depth: 1.5 }
}
```

## What It Returns
- Ranked list of probable root causes (deflection, thermal growth, tool wear, etc.)
- Estimated contribution of each cause to the total error
- Corrective actions for each identified cause
- Recommended parameter adjustments to bring dimension into tolerance

## Examples
- Input: `inverse_dimensional params={ nominal: 50.0, actual: 50.035, tolerance: 0.02, operation: "boring", material: "316L" }`
- Output: Primary cause: tool deflection (0.028mm) due to 5:1 L/D ratio; reduce depth or use damped bar

- Input: `inverse_dimensional params={ nominal: 100.0, actual: 99.965, tolerance: 0.015, feature: "length", operation: "facing" }`
- Output: Thermal contraction (0.022mm) from coolant quenching; measure at stable temperature or compensate
