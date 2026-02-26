---
name: mfg-spindle-speed
description: Validate spindle speed against machine max RPM, tool diameter limits, and peripheral speed safety
---

## When To Use
- When programming high-RPM operations with large-diameter tools
- When verifying tool manufacturer speed limits against machine capability
- Before running unbalanced tool assemblies at high speed
- NOT for calculating optimal cutting speed (use mfg-speed-feed)

## How To Use
### Validate Spindle Speed
```
prism_safety action=validate_spindle_speed params={
  requested_rpm: 15000,
  tool_diameter: 50,
  tool_type: "face_mill",
  machine: "haas_vf2"
}
```

### Validate With Balance Grade
```
prism_safety action=validate_spindle_speed params={
  requested_rpm: 20000,
  tool_diameter: 12,
  tool_type: "endmill",
  machine: "dmg_hsc75",
  holder_type: "shrink_fit",
  balance_grade: "G2.5"
}
```

## What It Returns
```json
{
  "speed_safe": false,
  "requested_rpm": 15000,
  "max_safe_rpm": 8500,
  "machine_max_rpm": 8100,
  "peripheral_speed_m_min": 2356,
  "max_peripheral_speed_m_min": 1335,
  "limiting_factor": "machine_max_rpm",
  "tool_max_rpm": 8500,
  "warnings": [
    "Requested 15000 RPM exceeds machine max 8100 RPM",
    "50mm face mill peripheral speed would be 2356 m/min -- far exceeds safe limit"
  ],
  "recommendation": "Reduce to max 8100 RPM (machine limit). Even at max, peripheral speed is 1272 m/min -- verify insert rating."
}
```

## Examples
### Large Face Mill Speed Check
- Input: `prism_safety action=validate_spindle_speed params={requested_rpm: 15000, tool_diameter: 50, tool_type: "face_mill", machine: "haas_vf2"}`
- Output: UNSAFE -- 15000 RPM on 50mm tool = 2356 m/min peripheral speed. Machine max is 8100 RPM. Face mill insert rating typically 800-1200 m/min max. Reduce to 5000-7000 RPM.
- Edge case: Indexable insert face mills have lower max RPM than solid tools due to centrifugal force on inserts

### Small Endmill at High Speed
- Input: `prism_safety action=validate_spindle_speed params={requested_rpm: 20000, tool_diameter: 6, tool_type: "endmill", machine: "dmg_hsc75"}`
- Output: Safe. 20000 RPM on 6mm tool = 377 m/min peripheral speed. Within HSC 75 max of 42000 RPM and tool rated speed. Balance grade should be G2.5 or better at this RPM.
- Edge case: Collet runout amplifies at high RPM -- 0.01mm runout at 20000 RPM creates significant centrifugal imbalance
