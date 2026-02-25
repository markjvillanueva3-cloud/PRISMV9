---
name: mfg-coolant-recommend
description: Get recommended coolant type, concentration, and delivery method for material and operation
---

## When To Use
- When selecting coolant for a new material or operation
- When switching from one material class to another
- When troubleshooting tool life or surface finish issues related to coolant
- NOT for validating existing coolant flow (use mfg-coolant-flow)

## How To Use
### Get Coolant Recommendations
```
prism_safety action=get_coolant_recommendations params={
  material: "Ti-6Al-4V",
  operation: "milling",
  Vc: 60
}
```

### Get With Detailed Requirements
```
prism_safety action=get_coolant_recommendations params={
  material: "inconel_718",
  operation: "turning",
  Vc: 40,
  depth_of_cut: 2.0,
  tool_coating: "TiAlN",
  machine_coolant_type: "semi_synthetic",
  environmental_restrictions: ["no_chlorine", "low_mist"]
}
```

## What It Returns
```json
{
  "recommended_coolant_type": "semi_synthetic_emulsion",
  "concentration_percent": 8,
  "delivery_method": "high_pressure_flood",
  "recommended_pressure_bar": 70,
  "recommended_flow_lpm": 30,
  "alternatives": [
    {"type": "full_synthetic", "concentration": 6, "notes": "Better for mist control"},
    {"type": "neat_oil", "concentration": 100, "notes": "Best lubricity for titanium"}
  ],
  "additive_recommendations": ["EP_additive", "anti_foam"],
  "warnings": ["Titanium reactive with chlorinated oils -- use chlorine-free formulation"],
  "recommendation": "Semi-synthetic at 8% with high-pressure delivery. Critical: maintain concentration -- titanium burns if coolant fails."
}
```

## Examples
### Titanium Milling
- Input: `prism_safety action=get_coolant_recommendations params={material: "Ti-6Al-4V", operation: "milling", Vc: 60}`
- Output: Semi-synthetic emulsion at 8% concentration, high-pressure flood at 70 bar. Titanium fire risk if coolant supply interrupted during cut. Use chlorine-free EP additives.
- Edge case: Titanium chips are combustible -- never use air blast alone, and avoid chip accumulation near hot zones

### Aluminum High-Speed Machining
- Input: `prism_safety action=get_coolant_recommendations params={material: "aluminum_6061", operation: "milling", Vc: 500}`
- Output: Two options: (1) flood with 5% semi-synthetic, or (2) MQL with ester oil at 50 ml/hr. At 500 m/min, MQL often outperforms flood due to thermal shock avoidance. Alcohol-based MQL provides best chip evacuation.
- Edge case: Aluminum staining can occur with high-pH coolants -- keep pH below 9.5 for aerospace parts
