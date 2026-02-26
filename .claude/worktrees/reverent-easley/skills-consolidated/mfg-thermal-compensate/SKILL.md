---
name: mfg-thermal-compensate
description: Calculate axis compensation values for machine thermal drift based on temperature delta
---

## When To Use
- Machine has been warming up and dimensional accuracy is drifting
- User asks about thermal compensation or machine warm-up effects
- Need to adjust work offsets for temperature change in the shop
- NOT for cutting zone temperature (use mfg-thermal-analysis)
- NOT for coolant temperature management (use prism_safety validate_coolant_flow)

## How To Use
### Calculate Compensation
```
prism_calc action=thermal_compensate params={
  machine: "DMG_DMU50",
  current_temp: 28,
  reference_temp: 20
}
```

### With Axis-Specific Temperatures
```
prism_calc action=thermal_compensate params={
  machine: "Haas_VF2",
  spindle_temp: 35,
  column_temp: 24,
  bed_temp: 22,
  reference_temp: 20
}
```

## What It Returns
```json
{
  "compensation": {
    "X_um": -12.4,
    "Y_um": -8.1,
    "Z_um": -18.7
  },
  "delta_T": 8,
  "thermal_coefficients": {
    "X_um_per_C": -1.55,
    "Y_um_per_C": -1.01,
    "Z_um_per_C": -2.34
  },
  "machine": "DMG_DMU50",
  "recommendation": "Apply G10 offset adjustments or enable machine thermal comp",
  "warmup_stable": false,
  "estimated_stable_time_min": 45,
  "warnings": ["Z-axis shows highest thermal sensitivity — monitor closely"]
}
```

## Examples
### DMG DMU50 After 8C Temperature Rise
- Input: `prism_calc action=thermal_compensate params={machine: "DMG_DMU50", current_temp: 28, reference_temp: 20}`
- Output: X=-12.4um, Y=-8.1um, Z=-18.7um compensation needed
- Edge case: Spindle-mounted probing can capture actual drift; calculated values are estimates

### Cold Start Monday Morning
- Input: `prism_calc action=thermal_compensate params={machine: "Haas_VF2", current_temp: 15, reference_temp: 20}`
- Output: Compensation in opposite direction (machine is cold); recommend 30-min warm-up cycle
- Edge case: Temperature gradients within the machine (spindle hot, bed cold) cause non-linear errors
