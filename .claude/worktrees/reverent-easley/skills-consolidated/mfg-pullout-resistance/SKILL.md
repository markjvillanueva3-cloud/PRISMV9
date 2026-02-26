---
name: mfg-pullout-resistance
description: Check tool pullout resistance for collet, hydraulic, and shrink-fit holders
---

## When To Use
- When high axial forces in drilling or plunging could pull tool from holder
- When verifying collet torque is sufficient for the cutting operation
- When selecting between holder types for a demanding application
- NOT for radial clamping force or runout (use tool manufacturer specs)

## How To Use
### Check Pullout Resistance
```
prism_safety action=check_pullout_resistance params={
  holder_type: "ER32",
  tool_diameter: 12,
  torque_Nm: 50,
  collet_clamping_force: 15000
}
```

### Check With Axial Force Context
```
prism_safety action=check_pullout_resistance params={
  holder_type: "hydraulic",
  tool_diameter: 20,
  torque_Nm: 80,
  collet_clamping_force: 25000,
  axial_cutting_force_N: 5000,
  operation: "drilling",
  weldon_flat: false
}
```

## What It Returns
```json
{
  "pullout_resistance_N": 12750,
  "axial_cutting_force_N": 5000,
  "safety_factor": 2.55,
  "pullout_safe": true,
  "friction_coeff": 0.15,
  "grip_force_N": 15000,
  "holder_type": "ER32",
  "weldon_flat_benefit": "Not present -- would add 3000N resistance",
  "warnings": [],
  "recommendation": "Adequate with 2.55x safety factor. For extra security on deep drilling, consider Weldon flat or hydraulic holder."
}
```

## Examples
### ER Collet Drilling
- Input: `prism_safety action=check_pullout_resistance params={holder_type: "ER32", tool_diameter: 12, torque_Nm: 50, collet_clamping_force: 15000}`
- Output: 12750N pullout resistance. Safety factor 2.55 for typical drilling forces. ER collets rely on friction only -- no positive lock.
- Edge case: Coolant and oil on tool shank reduces friction from 0.15 to 0.08 -- cutting pullout resistance nearly in half. Always clean shank before insertion.

### High-Axial-Force Gun Drilling
- Input: `prism_safety action=check_pullout_resistance params={holder_type: "ER32", tool_diameter: 10, torque_Nm: 50, collet_clamping_force: 15000, axial_cutting_force_N: 8000, operation: "gun_drilling"}`
- Output: MARGINAL -- pullout resistance 10625N vs 8000N axial force = 1.33x safety factor. Below 1.5x minimum. Use Weldon flat (+3000N) or switch to hydraulic holder (+40% grip) or shrink-fit.
- Edge case: Interrupted drilling (crossing cross-holes) creates axial shock loads 2-3x steady-state force -- factor this in
