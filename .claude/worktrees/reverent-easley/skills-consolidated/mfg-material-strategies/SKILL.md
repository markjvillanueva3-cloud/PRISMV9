---
name: mfg-material-strategies
description: Get all recommended toolpath strategies for a specific material ranked by effectiveness
---

## When To Use
- Need to know which toolpath strategies work best for a given material
- Planning a job and want to see all viable approaches for the workpiece material
- Comparing roughing, semi-finishing, and finishing strategies for a material
- NOT for selecting strategy for a specific feature (use mfg-strategy-select)
- NOT for parameter calculation (use mfg-toolpath-params)

## How To Use
### Get Strategies for Titanium
```
prism_toolpath action=material_strategies params={
  material: "Ti-6Al-4V"
}
```

### Get Strategies for Stainless Steel
```
prism_toolpath action=material_strategies params={
  material: "316_stainless"
}
```

### Get Strategies with Operation Filter
```
prism_toolpath action=material_strategies params={
  material: "inconel_718",
  operation: "roughing"
}
```

## What It Returns
```json
{
  "material": "Ti-6Al-4V",
  "material_class": "titanium_alloy",
  "machinability_rating": 0.22,
  "strategies": {
    "roughing": [
      {
        "strategy": "adaptive_clearing",
        "effectiveness": 0.95,
        "key_reason": "Constant engagement prevents thermal shock in titanium",
        "typical_stepover_percent": 10,
        "typical_doc_ratio": 1.5,
        "notes": "Preferred roughing strategy for all titanium alloys"
      },
      {
        "strategy": "trochoidal_milling",
        "effectiveness": 0.88,
        "key_reason": "Excellent chip thinning for narrow features",
        "typical_stepover_percent": 8,
        "typical_doc_ratio": 1.0
      }
    ],
    "semi_finishing": [
      {
        "strategy": "rest_machining",
        "effectiveness": 0.90,
        "key_reason": "Removes stock from corners without sudden engagement spikes"
      }
    ],
    "finishing": [
      {
        "strategy": "contour_parallel",
        "effectiveness": 0.85,
        "key_reason": "Consistent chip load for predictable surface finish"
      }
    ]
  },
  "avoid": ["plunge_roughing", "zigzag_without_engagement_control"],
  "general_notes": "Titanium requires constant engagement, sharp tools, and high-pressure coolant"
}
```

## Examples
### Titanium Alloy Strategies
- Input: `prism_toolpath action=material_strategies params={material: "Ti-6Al-4V"}`
- Output: Adaptive clearing (0.95), trochoidal (0.88) for roughing; contour parallel for finishing
- Edge case: Avoid conventional milling in titanium — always climb mill to reduce rubbing

### Inconel Roughing Only
- Input: `prism_toolpath action=material_strategies params={material: "inconel_718", operation: "roughing"}`
- Output: Ceramic insert high-speed roughing (0.92) and adaptive with carbide (0.87)
- Edge case: Ceramic inserts require no coolant and 4x higher speed — wrong coolant setting destroys tools

### Aluminum Strategies
- Input: `prism_toolpath action=material_strategies params={material: "aluminum_7075"}`
- Output: HSM pocket (0.96), adaptive clearing (0.93), trochoidal (0.75) — aluminum favors high speed
- Edge case: In aluminum, chip evacuation is the primary challenge, not heat or tool wear
