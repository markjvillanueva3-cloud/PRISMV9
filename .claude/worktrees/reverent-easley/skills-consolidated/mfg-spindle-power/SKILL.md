---
name: mfg-spindle-power
description: Check if spindle can deliver required power at operating RPM (continuous vs peak rating)
---

## When To Use
- When planning high-speed machining operations that demand full spindle power
- When running multiple tools in sequence and need sustained power output
- Before running aggressive roughing programs on smaller machines
- NOT for low-RPM torque-limited operations (use mfg-spindle-torque)

## How To Use
### Check Spindle Power
```
prism_safety action=check_spindle_power params={
  required_power_kW: 15,
  spindle_rpm: 8000,
  machine: "haas_vf2"
}
```

### Check With Continuous Rating
```
prism_safety action=check_spindle_power params={
  required_power_kW: 20,
  spindle_rpm: 10000,
  machine: "haas_vf2",
  duty_cycle: 0.9,
  duration_min: 30
}
```

## What It Returns
```json
{
  "power_adequate": true,
  "available_power_kW": 22.4,
  "required_power_kW": 15.0,
  "power_utilization": 0.67,
  "continuous_rating_kW": 18.6,
  "peak_rating_kW": 22.4,
  "at_rpm": 8000,
  "in_constant_power_range": true,
  "thermal_derating": false,
  "warnings": [],
  "recommendation": "Power adequate at 67% utilization. Continuous rating 18.6kW supports sustained machining."
}
```

## Examples
### Heavy Roughing on VF-2
- Input: `prism_safety action=check_spindle_power params={required_power_kW: 15, spindle_rpm: 8000, machine: "haas_vf2"}`
- Output: Adequate. 22.4 kW peak available, 18.6 kW continuous at 8000 RPM. 15 kW is within continuous rating for sustained operation.
- Edge case: Spindle power rating assumes clean drive belts and proper spindle warmup -- cold spindle delivers 10-15% less

### Exceeding Continuous Rating
- Input: `prism_safety action=check_spindle_power params={required_power_kW: 20, spindle_rpm: 8000, machine: "haas_vf2", duty_cycle: 0.9, duration_min: 30}`
- Output: WARNING -- 20 kW exceeds continuous rating (18.6 kW) at 90% duty cycle. Peak rating allows short bursts. For 30 min sustained: reduce to 18 kW or add cooldown pauses. Spindle thermal protection may trigger at 15 min.
- Edge case: Repeated thermal shutdowns degrade spindle bearings over time -- better to reduce power than overheat
