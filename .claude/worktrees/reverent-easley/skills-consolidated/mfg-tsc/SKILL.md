---
name: mfg-tsc
description: Check through-spindle coolant compatibility, flow rate, and pressure at tool tip
---

## When To Use
- When selecting tools that require through-spindle coolant (TSC)
- Before running deep hole drilling, gun drilling, or deep pocket operations
- When verifying machine TSC capability matches tool requirements
- NOT for external flood coolant validation (use mfg-coolant-flow)

## How To Use
### Check TSC Compatibility
```
prism_safety action=check_through_spindle_coolant params={
  spindle_type: "BT40",
  pressure_bar: 70,
  tool_has_tsc: true
}
```

### Check With Detailed Tool Data
```
prism_safety action=check_through_spindle_coolant params={
  spindle_type: "HSK63A",
  pressure_bar: 70,
  tool_has_tsc: true,
  coolant_hole_diameter_mm: 1.5,
  tool_length: 150,
  operation: "gun_drilling",
  hole_diameter: 6,
  hole_depth: 120
}
```

## What It Returns
```json
{
  "tsc_compatible": true,
  "flow_rate_at_tip_lpm": 8.5,
  "pressure_at_tip_bar": 55.0,
  "pressure_drop_bar": 15.0,
  "chip_evacuation_adequate": true,
  "cooling_adequate": true,
  "spindle_max_pressure_bar": 70,
  "warnings": [],
  "recommendation": "TSC adequate for this operation. Pressure drop 21% through tool -- within acceptable range."
}
```

## Examples
### Deep Hole Drilling With TSC
- Input: `prism_safety action=check_through_spindle_coolant params={spindle_type: "BT40", pressure_bar: 70, tool_has_tsc: true, coolant_hole_diameter_mm: 1.2, hole_depth: 100, hole_diameter: 8}`
- Output: TSC compatible. 55 bar at tip after 21% drop. Adequate for 12.5xD hole. Chip evacuation effective.
- Edge case: At very high RPM (>12000), centrifugal force can reduce effective TSC flow -- verify flow at operating speed

### BT40 Machine Without High Pressure
- Input: `prism_safety action=check_through_spindle_coolant params={spindle_type: "BT40", pressure_bar: 20, tool_has_tsc: true, operation: "gun_drilling", hole_depth: 150, hole_diameter: 4}`
- Output: INSUFFICIENT -- 20 bar drops to 8 bar at tip. Gun drilling 37.5xD requires minimum 40 bar at tip. Upgrade to high-pressure coolant system or use peck drilling.
- Edge case: BT40 retention knob blocks coolant path on some machines -- verify pull stud is TSC-compatible
