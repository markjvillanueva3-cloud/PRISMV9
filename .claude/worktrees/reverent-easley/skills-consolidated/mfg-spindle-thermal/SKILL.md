---
name: mfg-spindle-thermal
description: Monitor spindle thermal status and get safe operating envelope with cooldown recommendations
---

## When To Use
- When running extended heavy-duty machining operations
- When spindle temperature alarm triggers or load meter stays high
- For planning rest periods in long-running production programs
- NOT for cutting zone temperature (use mfg-thermal-analysis)

## How To Use
### Monitor Spindle Thermal
```
prism_safety action=monitor_spindle_thermal params={
  machine: "haas_vf2",
  current_temp_C: 45,
  duty_cycle: 0.8
}
```

### Get Spindle Safe Envelope
```
prism_safety action=get_spindle_safe_envelope params={
  machine: "haas_vf2",
  ambient_temp_C: 22,
  current_runtime_hr: 4
}
```

## What It Returns
```json
{
  "thermal_status": "caution",
  "current_temp_C": 45,
  "max_safe_temp_C": 55,
  "ambient_temp_C": 22,
  "temp_rise_C": 23,
  "thermal_margin_C": 10,
  "estimated_time_to_limit_min": 35,
  "recommended_cooldown": {
    "needed": true,
    "idle_rpm": 2000,
    "duration_min": 10,
    "target_temp_C": 35
  },
  "safe_envelope": {
    "max_continuous_power_kW": 15.0,
    "max_duty_cycle": 0.7,
    "max_rpm_sustained": 8000
  },
  "warnings": ["Spindle at 82% thermal capacity -- reduce duty cycle or add cooldown pause"],
  "recommendation": "Insert 10-min cooldown at 2000 RPM idle after next tool change. Reduce duty cycle from 80% to 70%."
}
```

## Examples
### Extended Roughing Cycle
- Input: `prism_safety action=monitor_spindle_thermal params={machine: "haas_vf2", current_temp_C: 45, duty_cycle: 0.8}`
- Output: Caution zone. 10C from thermal limit at 80% duty. Estimated 35 min to thermal protection trigger. Add cooldown or reduce depth of cut.
- Edge case: Spindle warmup routine (20 min progressive speed ramp) before precision work prevents thermal growth errors

### Cold Start Thermal Growth
- Input: `prism_safety action=get_spindle_safe_envelope params={machine: "haas_vf2", ambient_temp_C: 15, current_runtime_hr: 0}`
- Output: Cold spindle -- thermal growth of 0.02-0.05mm expected during first 30 min. Run warmup cycle before precision finishing. Avoid tight-tolerance cuts until spindle stabilizes at ~35C.
- Edge case: Monday morning cold-start is the worst case -- shop temperature overnight drop causes maximum thermal growth during warmup
