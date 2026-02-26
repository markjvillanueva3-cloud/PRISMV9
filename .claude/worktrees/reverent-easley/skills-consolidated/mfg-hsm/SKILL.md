---
name: mfg-hsm
description: Calculate high-speed machining parameters with light DOC, high feed, and high RPM
---

## When To Use
- Programming high-speed machining with light cuts and maximum feed rates
- Need HSM parameters for aluminum, graphite, or other high-speed-friendly materials
- Optimizing for maximum material removal rate with small depth of cut
- NOT for trochoidal milling (use mfg-trochoidal)
- NOT for heavy roughing with high engagement (use mfg-toolpath-params)

## How To Use
### HSM Pocket in Aluminum
```
prism_calc action=hsm params={
  material: "aluminum_6061",
  tool_diameter: 12,
  feature: "pocket"
}
```

### HSM Contouring in Die Steel
```
prism_calc action=hsm params={
  material: "P20_mold_steel",
  tool_diameter: 10,
  feature: "contour",
  hardness_hrc: 32
}
```

### HSM with Machine Limits
```
prism_calc action=hsm params={
  material: "aluminum_7075",
  tool_diameter: 16,
  feature: "pocket",
  max_rpm: 15000,
  max_feed: 10000
}
```

## What It Returns
```json
{
  "material": "aluminum_6061",
  "tool_diameter_mm": 12,
  "feature": "pocket",
  "hsm_parameters": {
    "speed_rpm": 20000,
    "speed_m_min": 754,
    "feed_mm_min": 12000,
    "feed_per_tooth_mm": 0.20,
    "doc_mm": 1.5,
    "doc_ratio": 0.125,
    "stepover_mm": 7.2,
    "stepover_percent": 60,
    "mrr_cm3_min": 129.6,
    "entry_method": "helical_ramp",
    "corner_strategy": "arc_fit",
    "min_corner_radius_mm": 3.6
  },
  "machine_requirements": {
    "min_spindle_rpm": 18000,
    "min_feed_rate": 10000,
    "spindle_type": "high_speed",
    "tool_balance_grade": "G2.5_at_25000rpm"
  },
  "notes": "HSM in aluminum: light DOC, high stepover, maximum speed and feed"
}
```

## Examples
### Aluminum Pocket HSM
- Input: `prism_calc action=hsm params={material: "aluminum_6061", tool_diameter: 12, feature: "pocket"}`
- Output: 20,000 RPM, 12,000 mm/min feed, 1.5mm DOC, 60% stepover, 129.6 cm3/min MRR
- Edge case: Chip evacuation becomes primary concern — air blast or through-tool coolant required

### Mold Steel HSM Contour
- Input: `prism_calc action=hsm params={material: "P20_mold_steel", tool_diameter: 10, feature: "contour", hardness_hrc: 32}`
- Output: 10,000 RPM, 5,000 mm/min, 0.5mm DOC, arc-fit corners to maintain constant feed
- Edge case: Sudden direction changes at corners cause tool deflection — use arc fitting

### Machine-Limited HSM
- Input: `prism_calc action=hsm params={material: "aluminum_7075", tool_diameter: 16, feature: "pocket", max_rpm: 15000, max_feed: 10000}`
- Output: Parameters capped at machine limits, reduced MRR but still HSM strategy
- Edge case: Machines with 40-taper spindles often cannot sustain 20,000+ RPM — always check limits
