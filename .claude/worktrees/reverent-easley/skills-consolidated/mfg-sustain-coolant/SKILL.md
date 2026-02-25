---
name: mfg-sustain-coolant
description: Optimize coolant usage and evaluate near-net-shape alternatives
---

# Coolant & Near-Net-Shape Optimizer

## When To Use
- Reducing coolant consumption and waste in machining operations
- Evaluating MQL, cryogenic, or dry machining as flood coolant alternatives
- Assessing near-net-shape manufacturing to minimize material removal
- Comparing additive vs. subtractive approaches for environmental impact

## How To Use
```
prism_intelligence action=sustain_coolant params={current_method: "flood", material: "steel_4140", operation: "turning"}
prism_intelligence action=sustain_nearnet params={part: "bracket_A", current_stock: "billet", material: "titanium_Ti6Al4V"}
```

## What It Returns
- `coolant_alternatives` — ranked alternatives with feasibility assessment
- `consumption_reduction` — projected coolant volume reduction (liters/month)
- `nearnet_options` — near-net-shape alternatives (casting, forging, additive)
- `buy_to_fly_improvement` — ratio improvement from near-net-shape vs. billet
- `environmental_savings` — waste reduction in kg and disposal cost savings

## Examples
- Evaluate MQL for turning: `sustain_coolant params={current_method: "flood", material: "steel_4140", operation: "turning", flow_rate_lpm: 15}` — MQL feasible at 50ml/hr, saves 900L/month coolant, requires coated insert upgrade ($120)
- Near-net-shape for titanium: `sustain_nearnet params={part: "bracket_A", current_stock: "billet", material: "Ti-6Al-4V", finished_weight_kg: 1.2}` — forging reduces buy-to-fly from 12:1 to 3:1, saves 10.8 kg titanium per part ($540 material savings)
- Cryogenic feasibility: `sustain_coolant params={current_method: "flood", material: "inconel_718", operation: "milling", target: "cryogenic"}` — LN2 cryogenic viable, 40% tool life improvement, eliminates coolant disposal but adds $0.80/part LN2 cost
