---
name: mfg-part-deflection
description: Calculate part deflection under cutting forces for thin walls, plates, and slender workpieces
---

## When To Use
- When machining thin-wall features that may deflect under cutting pressure
- When finishing aerospace or medical parts with tight tolerances on thin sections
- When planning support strategies for flexible workpieces
- NOT for tool deflection (use mfg-deflection from the calc dispatcher)

## How To Use
### Calculate Part Deflection
```
prism_safety action=calculate_part_deflection params={
  material: "aluminum_6061",
  part_length: 200,
  part_width: 50,
  part_height: 10,
  Fc: 500,
  support_type: "simply_supported"
}
```

### Calculate With Detailed Geometry
```
prism_safety action=calculate_part_deflection params={
  material: "Ti-6Al-4V",
  part_length: 150,
  part_width: 2,
  part_height: 40,
  Fc: 300,
  support_type: "cantilever",
  force_position_mm: 120,
  E_GPa: 114,
  yield_MPa: 880
}
```

## What It Returns
```json
{
  "max_deflection_mm": 0.142,
  "deflection_at_cut_mm": 0.118,
  "within_tolerance": false,
  "tolerance_used_mm": 0.05,
  "stress_at_support_MPa": 45.0,
  "yield_safety_factor": 6.2,
  "natural_frequency_Hz": 85,
  "chatter_risk": "low",
  "spring_back_mm": 0.142,
  "warnings": ["Deflection 0.142mm exceeds typical finish tolerance of 0.05mm"],
  "recommendation": "Part deflects 0.142mm under 500N force. Reduce cutting force to <175N or add mid-span support. Consider multiple light finishing passes."
}
```

## Examples
### Thin Aluminum Plate
- Input: `prism_safety action=calculate_part_deflection params={material: "aluminum_6061", part_length: 200, part_width: 50, part_height: 10, Fc: 500, support_type: "simply_supported"}`
- Output: 0.142mm deflection at center. Exceeds 0.05mm tolerance. Reduce force to 175N or support mid-span. Spring-back will leave material high after cut.
- Edge case: Spring-back causes over-cutting on return pass -- program finish allowance accounting for deflection, not just nominal

### Thin-Wall Titanium Rib
- Input: `prism_safety action=calculate_part_deflection params={material: "Ti-6Al-4V", part_length: 150, part_width: 2, part_height: 40, Fc: 300, support_type: "cantilever"}`
- Output: CRITICAL -- 2mm thin wall deflects 0.85mm as cantilever under 300N. Use alternating side machining strategy (machine 1mm each side alternately). Wax or ice support for final passes.
- Edge case: Residual stress release during thin-wall machining causes part to move independently of cutting forces -- stress-relieve before finishing
