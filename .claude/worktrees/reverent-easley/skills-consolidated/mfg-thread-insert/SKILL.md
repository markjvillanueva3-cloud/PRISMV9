---
name: mfg-thread-insert
description: Select threading insert and calculate cutting parameters for turning or milling threads
---

## When To Use
- Selecting the right threading insert for a lathe or mill operation
- Need speed, feed, and number of passes for thread cutting
- Choosing between full-profile, partial-profile, or multi-tooth inserts
- NOT for thread milling helical interpolation (use mfg-thread-mill)
- NOT for G-code generation (use mfg-thread-gcode)

## How To Use
### Select Internal Threading Insert
```
prism_thread action=select_thread_insert params={
  thread: "M10x1.5",
  material: "4140_steel",
  internal: true
}
```

### Calculate Thread Cutting Parameters
```
prism_thread action=calculate_thread_cutting_params params={
  thread: "M10x1.5",
  material: "4140_steel",
  insert: "16IR 1.5ISO",
  method: "modified_flank"
}
```

### External Thread Insert for Stainless
```
prism_thread action=select_thread_insert params={
  thread: "M20x2.5",
  material: "316_stainless",
  internal: false,
  coolant: "flood"
}
```

## What It Returns
```json
{
  "thread": "M10x1.5",
  "material": "4140_steel",
  "insert_recommendation": {
    "designation": "16IR 1.5ISO",
    "profile": "full_profile",
    "grade": "IC908",
    "coating": "PVD_TiAlN",
    "chipbreaker": "threading"
  },
  "cutting_parameters": {
    "speed_m_min": 120,
    "infeed_method": "modified_flank",
    "infeed_angle_deg": 29.5,
    "number_of_passes": 6,
    "pass_depths_mm": [0.30, 0.25, 0.20, 0.15, 0.10, 0.05],
    "spring_passes": 2,
    "total_depth_mm": 0.812
  },
  "notes": "Modified flank infeed reduces cutting forces and improves chip control"
}
```

## Examples
### Internal Thread in Steel
- Input: `prism_thread action=select_thread_insert params={thread: "M10x1.5", material: "4140_steel", internal: true}`
- Output: 16IR 1.5ISO full-profile insert, 120 m/min, 6 passes with modified flank infeed
- Edge case: Internal boring bar overhang over 3xD requires reduced speed and more passes

### External Stainless Thread
- Input: `prism_thread action=select_thread_insert params={thread: "M20x2.5", material: "316_stainless", internal: false}`
- Output: Partial-profile insert for versatility, 80 m/min, 8 passes, radial infeed for stainless
- Edge case: Stainless work-hardens — never dwell or rub on thread flanks

### Acme Thread for Lead Screw
- Input: `prism_thread action=select_thread_insert params={thread: "1-5 ACME", material: "4140_steel", internal: false}`
- Output: Acme-profile insert, alternating flank infeed, 12+ passes for deep 29-degree form
- Edge case: Acme threads have higher cutting forces — verify machine torque capacity
