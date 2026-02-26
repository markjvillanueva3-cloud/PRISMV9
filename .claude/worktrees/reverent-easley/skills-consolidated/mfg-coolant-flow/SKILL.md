---
name: mfg-coolant-flow
description: Validate coolant flow rate and pressure for adequate chip clearing and tool cooling
---

## When To Use
- When setting up coolant for a new operation or material
- When chips are not clearing properly during machining
- When evaluating if existing coolant system is adequate for a job
- NOT for through-spindle coolant (use mfg-tsc)

## How To Use
### Validate Coolant Flow
```
prism_safety action=validate_coolant_flow params={
  flow_rate_lpm: 20,
  pressure_bar: 30,
  nozzle_count: 2,
  operation: "drilling"
}
```

### Validate With Material Context
```
prism_safety action=validate_coolant_flow params={
  flow_rate_lpm: 40,
  pressure_bar: 70,
  nozzle_count: 3,
  operation: "milling",
  material: "Ti-6Al-4V",
  depth_of_cut: 5,
  tool_diameter: 25
}
```

## What It Returns
```json
{
  "flow_adequate": true,
  "pressure_adequate": true,
  "chip_clearing_effectiveness": 0.85,
  "cooling_effectiveness": 0.78,
  "recommended_flow_lpm": 15,
  "recommended_pressure_bar": 20,
  "nozzle_velocity_m_s": 12.5,
  "coverage_assessment": "good",
  "warnings": [],
  "recommendation": "Flow and pressure adequate for drilling. Aim nozzles at drill entry point."
}
```

## Examples
### Deep Hole Drilling
- Input: `prism_safety action=validate_coolant_flow params={flow_rate_lpm: 20, pressure_bar: 30, nozzle_count: 2, operation: "drilling", depth_ratio: 8}`
- Output: WARNING -- external coolant insufficient for 8xD drilling. Chips pack in flutes below 5xD. Recommend through-tool coolant or peck drilling cycle.
- Edge case: Even with adequate flow, nozzle position matters -- coolant must reach the cutting zone, not just flood the area

### High-Speed Aluminum Milling
- Input: `prism_safety action=validate_coolant_flow params={flow_rate_lpm: 40, pressure_bar: 5, nozzle_count: 4, operation: "milling", material: "aluminum_6061"}`
- Output: Flow rate good for aluminum chip clearing. Low pressure acceptable for flood coolant. Consider air blast for HSM above 15000 RPM to avoid thermal shock.
- Edge case: Aluminum at very high speeds may perform better with mist or air blast than flood coolant
