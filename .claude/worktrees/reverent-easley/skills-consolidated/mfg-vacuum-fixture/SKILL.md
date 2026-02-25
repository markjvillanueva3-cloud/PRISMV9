---
name: mfg-vacuum-fixture
description: Validate vacuum fixture holding force, safety factor, and leak tolerance
---

## When To Use
- When using vacuum tables or vacuum fixtures for thin flat parts
- When evaluating if vacuum can hold a part against planned cutting forces
- When designing vacuum fixture seal layouts and channel routing
- NOT for mechanical clamping validation (use mfg-workholding-validate)

## How To Use
### Validate Vacuum Fixture
```
prism_safety action=validate_vacuum_fixture params={
  vacuum_pressure_bar: -0.85,
  seal_area_cm2: 500,
  Fc: 1000,
  Ft: 400
}
```

### Validate With Full Context
```
prism_safety action=validate_vacuum_fixture params={
  vacuum_pressure_bar: -0.90,
  seal_area_cm2: 300,
  Fc: 800,
  Ft: 300,
  Fa: -200,
  part_weight_kg: 2,
  friction_coeff: 0.25,
  seal_type: "o_ring",
  port_count: 4,
  altitude_m: 500
}
```

## What It Returns
```json
{
  "holding_force_N": 4250,
  "friction_resistance_N": 1062,
  "cutting_force_resultant_N": 1077,
  "safety_factor": 3.94,
  "vacuum_adequate": true,
  "liftoff_safety_factor": 4.25,
  "sliding_safety_factor": 0.99,
  "leak_tolerance_percent": 15,
  "min_seal_area_cm2": 127,
  "warnings": ["Sliding safety factor 0.99 -- MARGINAL. Friction alone barely resists lateral force. Add mechanical stops."],
  "recommendation": "Vacuum holds against liftoff (4.25x) but lateral sliding marginal (0.99x). Add edge stops or pins to resist horizontal cutting force."
}
```

## Examples
### Large Flat Sheet
- Input: `prism_safety action=validate_vacuum_fixture params={vacuum_pressure_bar: -0.85, seal_area_cm2: 500, Fc: 1000, Ft: 400}`
- Output: Liftoff safe (4.25x) but sliding marginal (0.99x). Vacuum excels at holding parts down but provides poor lateral resistance. Add 2 dowel pins or edge stops for horizontal force resistance.
- Edge case: Coolant on vacuum surface destroys seal -- use air blast or MQL, never flood coolant with vacuum fixtures

### Small Part Vacuum Pod
- Input: `prism_safety action=validate_vacuum_fixture params={vacuum_pressure_bar: -0.85, seal_area_cm2: 50, Fc: 500, Ft: 200}`
- Output: INADEQUATE -- 50 cm2 seal area provides only 425N holding. Cannot resist 500N cutting force even with friction. Increase seal area to 150+ cm2 or reduce cutting forces significantly.
- Edge case: Thin parts (<2mm) can deflect into vacuum channels creating scallop marks on bottom surface -- use fine-channel or porous aluminum vacuum plates

### High Altitude Shop
- Input: `prism_safety action=validate_vacuum_fixture params={vacuum_pressure_bar: -0.85, seal_area_cm2: 500, Fc: 800, Ft: 300, altitude_m: 1500}`
- Output: Altitude derating applied -- atmospheric pressure at 1500m is 0.846 bar vs 1.013 at sea level. Effective vacuum reduced 17%. Holding force 3570N instead of 4250N. Still adequate with 3.56x liftoff factor.
- Edge case: Barometric pressure changes (weather fronts) can vary vacuum effectiveness by 3-5% -- design with margin
