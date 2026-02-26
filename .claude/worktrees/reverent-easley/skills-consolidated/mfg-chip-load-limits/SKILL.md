---
name: mfg-chip-load-limits
description: Check chip load against safe limits for tool diameter, material, and flute count
---

## When To Use
- When optimizing feed rates and need to know maximum safe chip load
- When troubleshooting tool chipping or premature wear
- Before increasing feed rate on an existing program
- NOT for calculating recommended feed (use mfg-speed-feed)

## How To Use
### Check Chip Load Limits
```
prism_safety action=check_chip_load_limits params={
  fz: 0.2,
  tool_diameter: 10,
  z: 4,
  material: "4140_steel"
}
```

### Get Safe Cutting Limits
```
prism_safety action=get_safe_cutting_limits params={
  tool_diameter: 10,
  z: 4,
  material: "4140_steel",
  tool_material: "carbide",
  coating: "TiAlN",
  operation: "milling"
}
```

## What It Returns
```json
{
  "chip_load_safe": true,
  "requested_fz_mm": 0.200,
  "max_safe_fz_mm": 0.250,
  "recommended_fz_mm": 0.180,
  "utilization": 0.80,
  "limiting_factor": "tool_edge_strength",
  "chip_thickness_mm": 0.173,
  "feed_per_rev_mm": 0.800,
  "safe_limits": {
    "max_fz_mm": 0.250,
    "max_ap_mm": 15.0,
    "max_ae_mm": 10.0,
    "max_Vc_m_min": 200
  },
  "warnings": ["At 80% of max chip load -- good balance of productivity and tool life"],
  "recommendation": "Chip load within safe range. 0.20mm fz provides good balance. Max 0.25mm before edge chipping risk."
}
```

## Examples
### Aggressive Feed in Steel
- Input: `prism_safety action=check_chip_load_limits params={fz: 0.2, tool_diameter: 10, z: 4, material: "4140_steel"}`
- Output: Safe at 80% utilization. 0.20mm fz is productive without excessive edge stress. Max 0.25mm for carbide in 4140. Above 0.25mm: insert chipping risk increases sharply.
- Edge case: Chip thinning in radial engagement < 50% means actual chip thickness is less than fz -- can safely increase programmed fz

### Exceeding Limits in Stainless
- Input: `prism_safety action=check_chip_load_limits params={fz: 0.3, tool_diameter: 8, z: 3, material: "316_stainless"}`
- Output: EXCEEDS LIMIT -- 0.30mm fz on 8mm tool in 316SS. Max safe 0.15mm for stainless (work hardening penalty). Reduce fz to 0.12-0.15mm. Stainless punishes edge overload with rapid crater wear.
- Edge case: 316 stainless work-hardens aggressively -- too low chip load is also dangerous as it rubs instead of cuts
