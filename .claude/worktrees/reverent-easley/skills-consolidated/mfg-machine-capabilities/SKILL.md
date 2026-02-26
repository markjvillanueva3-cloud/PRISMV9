---
name: mfg-machine-capabilities
description: Retrieve detailed capability profile for a machine including torque curves, axis speeds, and accuracy specs (MIT 2.854)
---

## When To Use
- Need to check if a machine can handle a specific cutting condition (torque at RPM, power at speed)
- Evaluating whether a machine has sufficient rigidity, accuracy, or speed for a job
- Comparing machine capabilities against calculated cutting forces or power requirements
- Need torque curve data to verify spindle can deliver required torque at operating RPM
- NOT for basic machine specs like travels or tool capacity (use mfg-machine-lookup)
- NOT for finding machines by requirements (use mfg-machine-search)

## How To Use
### Get full capability profile
```
prism_data action=machine_capabilities params={
  machine: "haas_vf2"
}
```

### Get specific capability domain
```
prism_data action=machine_capabilities params={
  machine: "dmg_dmu50",
  domain: "spindle"
}
```

## What It Returns
```json
{
  "machine": "haas_vf2",
  "spindle": {
    "max_rpm": 8100,
    "max_power_kW": 22.4,
    "max_torque_Nm": 122,
    "constant_power_range": [1800, 8100],
    "torque_curve": [
      {"rpm": 500, "torque_Nm": 122, "power_kW": 6.4},
      {"rpm": 1800, "torque_Nm": 122, "power_kW": 22.4},
      {"rpm": 4000, "torque_Nm": 53.5, "power_kW": 22.4},
      {"rpm": 8100, "torque_Nm": 26.4, "power_kW": 22.4}
    ]
  },
  "axis_dynamics": {
    "x": {"rapid_m_min": 25.4, "accel_m_s2": 3.0, "resolution_um": 1},
    "y": {"rapid_m_min": 25.4, "accel_m_s2": 3.0, "resolution_um": 1},
    "z": {"rapid_m_min": 25.4, "accel_m_s2": 5.0, "resolution_um": 1}
  },
  "accuracy": {
    "positioning_mm": 0.0050,
    "repeatability_mm": 0.0025,
    "circular_interpolation_mm": 0.010
  },
  "rigidity": {
    "static_stiffness_N_um": 25,
    "dynamic_compliance_um_N": 0.04,
    "first_natural_freq_Hz": 65
  }
}
```

## Examples
### Check spindle torque for heavy roughing
- Input: `prism_data action=machine_capabilities params={machine: "haas_vf2"}`
- Output: Torque curve shows 122 Nm up to 1,800 RPM (constant torque), 22.4 kW constant power to 8,100 RPM
- Edge case: Some machines have gear ranges that shift the torque curve; both ranges are returned when present

### Evaluate 5-axis machine for precision finishing
- Input: `prism_data action=machine_capabilities params={machine: "dmg_dmu50", domain: "accuracy"}`
- Output: Positioning 0.004mm, repeatability 0.002mm, volumetric accuracy specs for 5-axis
- Edge case: Accuracy specs are at 20 degrees C; thermal compensation status is included when available
