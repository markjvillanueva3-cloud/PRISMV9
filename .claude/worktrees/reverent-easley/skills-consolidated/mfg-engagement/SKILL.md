---
name: mfg-engagement
description: Calculate cutter engagement angle and chip thickness variation for milling operations
---

## When To Use
- Analyzing cutter engagement angle for a given radial depth of cut
- Understanding chip thickness variation across the engagement arc
- Optimizing entry strategies to control engagement spikes
- NOT for trochoidal parameter calculation (use mfg-trochoidal)
- NOT for chip load per tooth (use mfg-chip-load)

## How To Use
### Calculate Engagement Angle
```
prism_calc action=engagement params={
  ae: 15,
  D: 50,
  entry_type: "straight"
}
```

### Engagement for Slot Milling
```
prism_calc action=engagement params={
  ae: 20,
  D: 20,
  entry_type: "full_slot"
}
```

### Engagement with Arc Entry
```
prism_calc action=engagement params={
  ae: 10,
  D: 25,
  entry_type: "arc",
  arc_radius: 15
}
```

## What It Returns
```json
{
  "radial_depth_ae_mm": 15,
  "tool_diameter_mm": 50,
  "ae_ratio": 0.30,
  "entry_type": "straight",
  "engagement_angle_deg": 72.5,
  "max_chip_thickness_mm": 0.095,
  "min_chip_thickness_mm": 0.0,
  "average_chip_thickness_mm": 0.061,
  "chip_thinning_factor": 0.64,
  "contact_length_mm": 31.6,
  "simultaneous_teeth_in_cut": 2.4,
  "force_variation_percent": 42,
  "notes": "30% radial engagement gives 72.5 degree arc — moderate force variation"
}
```

## Examples
### Moderate Radial Engagement
- Input: `prism_calc action=engagement params={ae: 15, D: 50, entry_type: "straight"}`
- Output: 72.5 degree engagement, chip thinning factor 0.64, 42% force variation
- Edge case: Straight entry causes instantaneous engagement jump — arc entry reduces shock

### Full Slot (180-degree Engagement)
- Input: `prism_calc action=engagement params={ae: 20, D: 20, entry_type: "full_slot"}`
- Output: 180-degree engagement, maximum force variation, recutting on exit side
- Edge case: Full slotting doubles heat input and prevents climb-only cutting — avoid when possible

### Controlled Arc Entry
- Input: `prism_calc action=engagement params={ae: 10, D: 25, entry_type: "arc", arc_radius: 15}`
- Output: Gradual engagement ramp from 0 to 53 degrees, reduced entry shock by 60%
- Edge case: Arc radius should be at least 1x tool diameter for smooth engagement transition
