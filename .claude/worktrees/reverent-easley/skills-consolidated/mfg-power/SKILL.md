---
name: mfg-power
description: Calculate required spindle power in kW from cutting parameters and material properties
---

## When To Use
- User asks if their machine has enough power for a cut
- Need to verify spindle load percentage before running a program
- Comparing roughing strategies by power consumption
- NOT for torque calculation only (use mfg-torque)
- NOT for energy cost optimization (use prism_calc cost_optimize)

## How To Use
### Calculate Required Power
```
prism_calc action=power params={
  material: "4140_steel",
  Vc: 200,
  f: 0.15,
  ap: 3,
  ae: 25
}
```

### With Machine Verification
```
prism_calc action=power params={
  material: "Ti-6Al-4V",
  Vc: 60,
  f: 0.12,
  ap: 2.0,
  ae: 16,
  machine_power_kW: 22,
  spindle_efficiency: 0.85
}
```

## What It Returns
```json
{
  "power_kW": 8.4,
  "specific_cutting_energy_J_mm3": 3.2,
  "MRR_cm3_min": 15.0,
  "spindle_load_percent": null,
  "machine_adequate": null,
  "model": "specific_energy",
  "power_at_spindle_kW": null,
  "warnings": []
}
```

## Examples
### Roughing 4140 Steel
- Input: `prism_calc action=power params={material: "4140_steel", Vc: 200, f: 0.15, ap: 3, ae: 25}`
- Output: 8.4 kW required — any 15kW+ machine handles this comfortably
- Edge case: At very low speeds (<30 m/min), specific energy increases due to ploughing

### Heavy Roughing on 15kW Machine
- Input: `prism_calc action=power params={material: "4140_steel", Vc: 200, f: 0.2, ap: 5, ae: 30, machine_power_kW: 15, spindle_efficiency: 0.85}`
- Output: 18.7 kW required but only 12.75 kW available — reduce parameters
- Edge case: Spindle efficiency drops at very low RPM (high torque region); use torque curve data
