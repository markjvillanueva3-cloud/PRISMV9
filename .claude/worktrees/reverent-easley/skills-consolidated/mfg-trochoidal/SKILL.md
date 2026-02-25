---
name: mfg-trochoidal
description: Calculate trochoidal milling parameters for constant engagement slotting and pocketing
---

## When To Use
- Programming trochoidal (circular interpolation) milling paths
- Need stepover, arc radius, and adjusted feed for constant chip load
- Slotting or pocketing where constant engagement reduces tool stress
- NOT for general HSM parameters (use mfg-hsm)
- NOT for strategy selection (use mfg-strategy-select)

## How To Use
### Trochoidal Slot Milling
```
prism_calc action=trochoidal params={
  slot_width: 20,
  tool_diameter: 12,
  material: "4140_steel"
}
```

### Trochoidal in Hardened Steel
```
prism_calc action=trochoidal params={
  slot_width: 16,
  tool_diameter: 10,
  material: "H13_tool_steel",
  hardness_hrc: 52
}
```

### Trochoidal with Custom Engagement
```
prism_calc action=trochoidal params={
  slot_width: 25,
  tool_diameter: 16,
  material: "Ti-6Al-4V",
  max_engagement_deg: 60
}
```

## What It Returns
```json
{
  "slot_width_mm": 20,
  "tool_diameter_mm": 12,
  "material": "4140_steel",
  "trochoidal_parameters": {
    "stepover_mm": 1.2,
    "stepover_percent": 10,
    "arc_radius_mm": 4.6,
    "trochoidal_width_mm": 13.2,
    "engagement_angle_deg": 72,
    "chip_thinning_factor": 0.59,
    "adjusted_feed_mm_min": 3390,
    "base_feed_mm_min": 2000,
    "doc_mm": 18.0,
    "speed_rpm": 3180,
    "passes_to_fill_slot": 4
  },
  "notes": "Feed increased by 1/chip_thinning_factor to maintain target chip thickness"
}
```

## Examples
### Standard Steel Trochoidal Slot
- Input: `prism_calc action=trochoidal params={slot_width: 20, tool_diameter: 12, material: "4140_steel"}`
- Output: 10% stepover, arc radius 4.6mm, adjusted feed 3390 mm/min (1.7x base feed)
- Edge case: Feed increase is critical — without chip thinning compensation, tool rubs and fails

### Hardened Steel Trochoidal
- Input: `prism_calc action=trochoidal params={slot_width: 16, tool_diameter: 10, material: "H13_tool_steel", hardness_hrc: 52}`
- Output: 5% stepover, reduced DOC to 1.0xD, lower speed for hard material, higher feed compensation
- Edge case: Above 50 HRC, use AlTiN-coated carbide or CBN — uncoated tools fail immediately

### Titanium Trochoidal
- Input: `prism_calc action=trochoidal params={slot_width: 25, tool_diameter: 16, material: "Ti-6Al-4V", max_engagement_deg: 60}`
- Output: 8% stepover, 60-degree max engagement, high-pressure coolant required
- Edge case: In titanium, limit engagement to 60 degrees max — higher causes excessive heat buildup
