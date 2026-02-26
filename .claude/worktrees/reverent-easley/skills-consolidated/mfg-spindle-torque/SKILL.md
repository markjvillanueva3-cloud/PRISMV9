---
name: mfg-spindle-torque
description: Check if spindle can deliver required torque at operating RPM against machine torque curve
---

## When To Use
- When planning heavy roughing operations that demand high torque
- When machining at low RPM where torque limits are most likely hit
- Before running a new program to verify machine capability
- NOT for power checks at high RPM (use mfg-spindle-power)

## How To Use
### Check Spindle Torque
```
prism_safety action=check_spindle_torque params={
  required_torque_Nm: 150,
  spindle_rpm: 3000,
  machine: "haas_vf2"
}
```

### Check With Safety Margin
```
prism_safety action=check_spindle_torque params={
  required_torque_Nm: 200,
  spindle_rpm: 1500,
  machine: "dmg_dmu50",
  safety_factor: 1.3,
  continuous_operation: true
}
```

## What It Returns
```json
{
  "torque_adequate": true,
  "available_torque_Nm": 122.0,
  "required_torque_Nm": 150.0,
  "torque_utilization": 0.81,
  "at_rpm": 3000,
  "in_constant_torque_range": false,
  "in_constant_power_range": true,
  "peak_torque_Nm": 339.0,
  "peak_torque_rpm_range": [0, 2000],
  "warnings": ["Operating at 81% torque capacity -- monitor spindle load meter during cut"],
  "recommendation": "Torque available but near limit at 3000 RPM. Reduce RPM to 2000 for 40% more torque headroom."
}
```

## Examples
### Heavy Face Milling on VF-2
- Input: `prism_safety action=check_spindle_torque params={required_torque_Nm: 150, spindle_rpm: 3000, machine: "haas_vf2"}`
- Output: Available torque 122 Nm at 3000 RPM (constant power range). INSUFFICIENT -- need 150 Nm. Reduce to 2000 RPM where 339 Nm peak available, or reduce depth of cut.
- Edge case: Haas spindle torque curve drops significantly above base speed -- always check torque at planned RPM, not rated max

### Low-RPM Tapping
- Input: `prism_safety action=check_spindle_torque params={required_torque_Nm: 30, spindle_rpm: 500, machine: "haas_vf2"}`
- Output: Adequate. 339 Nm available at 500 RPM (constant torque range). Utilization only 9%. Large taps safe at this speed.
- Edge case: Rigid tapping reversal generates peak torque -- multiply required torque by 1.5x for tap reversal safety margin
