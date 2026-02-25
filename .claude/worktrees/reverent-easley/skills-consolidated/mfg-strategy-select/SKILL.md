---
name: mfg-strategy-select
description: Select optimal toolpath strategy for a machining feature based on geometry, material, and constraints
---

## When To Use
- Need to choose the best toolpath strategy for a specific feature (pocket, slot, contour, etc.)
- Mapping feature geometry and material to the right cutting approach
- Comparing strategy options with trade-off reasoning
- NOT for calculating strategy parameters after selection (use mfg-toolpath-params)
- NOT for looking up strategy details by name (use mfg-strategy-search)

## How To Use
### Select Strategy for a Pocket
```
prism_toolpath action=strategy_select params={
  feature: "pocket",
  material: "aluminum_6061",
  depth: 20,
  width: 50
}
```

### Select Strategy for a Deep Slot
```
prism_toolpath action=strategy_select params={
  feature: "slot",
  material: "4140_steel",
  depth: 40,
  width: 12,
  length: 150
}
```

### Select Strategy with Constraints
```
prism_toolpath action=strategy_select params={
  feature: "pocket",
  material: "Ti-6Al-4V",
  depth: 30,
  width: 80,
  constraints: {
    max_tool_diameter: 16,
    thin_wall: true,
    min_corner_radius: 4
  }
}
```

## What It Returns
```json
{
  "feature": "pocket",
  "material": "aluminum_6061",
  "recommended_strategy": "adaptive_clearing",
  "confidence": 0.92,
  "reasoning": "Deep pocket in aluminum favors constant engagement with high MRR",
  "alternatives": [
    { "strategy": "high_speed_machining", "score": 0.85, "note": "Better surface finish but lower MRR" },
    { "strategy": "trochoidal_slotting", "score": 0.78, "note": "Better for narrow sections" }
  ],
  "key_parameters": {
    "stepover_percent": 25,
    "doc_mm": 20,
    "entry_method": "helical_ramp",
    "corner_strategy": "morphed_spiral"
  },
  "warnings": []
}
```

## Examples
### Aluminum Pocket — Adaptive Clearing
- Input: `prism_toolpath action=strategy_select params={feature: "pocket", material: "aluminum_6061", depth: 20, width: 50}`
- Output: Adaptive clearing at 25% stepover, full depth, helical ramp entry
- Edge case: For pockets narrower than 2x tool diameter, switches to trochoidal entry

### Steel Deep Slot — Trochoidal
- Input: `prism_toolpath action=strategy_select params={feature: "slot", material: "4140_steel", depth: 40, width: 12}`
- Output: Trochoidal milling to maintain constant chip load in deep narrow slot
- Edge case: Slot depth over 4xD requires reduced speed and pecking strategy

### Titanium Thin Wall — Low Engagement
- Input: `prism_toolpath action=strategy_select params={feature: "pocket", material: "Ti-6Al-4V", depth: 30, width: 80, constraints: {thin_wall: true}}`
- Output: Morph spiral with alternating climb/conventional to balance wall deflection
- Edge case: Thin walls under 2mm need support strategies — rest machining or wax fill
