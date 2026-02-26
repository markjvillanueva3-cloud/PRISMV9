---
name: mfg-sustain-optimize
description: Optimize machining for sustainability with eco-friendly alternatives
---

# Green Manufacturing Optimizer

## When To Use
- Reducing environmental impact of a machining process without sacrificing quality
- Finding eco-friendly alternatives to current tooling, coolant, or process parameters
- Balancing sustainability goals with cost and productivity targets
- Preparing for environmental compliance audits or green certifications

## How To Use
```
prism_intelligence action=sustain_optimize params={operation: "milling", material: "steel_4140", current_coolant: "mineral_oil", target: "reduce_waste"}
prism_calc action=eco_optimize params={material: "steel_4140", operation: "turning", objectives: ["energy", "waste", "coolant"]}
```

## What It Returns
- `optimized_params` — adjusted cutting parameters that reduce environmental impact
- `alternatives` — eco-friendly alternatives for tooling, coolant, or process
- `savings` — quantified environmental savings (energy kWh, waste kg, coolant liters)
- `tradeoffs` — impact on cycle time, tool life, and surface quality
- `sustainability_score` — composite green score (0-100) for the optimized process

## Examples
- Optimize milling for energy: `sustain_optimize params={operation: "milling", material: "aluminum_6061", target: "reduce_energy"}` — returns 18% energy reduction by adjusting to high-efficiency toolpath with 12% higher MRR, sustainability score 78
- Switch to MQL: `sustain_optimize params={operation: "turning", material: "steel_4140", current_coolant: "flood", target: "reduce_coolant"}` — recommends MQL at 50ml/hr vs. 20L/min flood, saves 2,400L/month coolant waste
- Full eco-optimization: `eco_optimize params={material: "Ti-6Al-4V", operation: "milling", objectives: ["energy", "waste", "coolant"]}` — returns Pareto-optimal parameter set balancing 22% energy reduction with 5% cycle time increase
