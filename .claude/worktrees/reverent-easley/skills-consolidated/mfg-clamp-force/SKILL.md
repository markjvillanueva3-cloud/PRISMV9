---
name: mfg-clamp-force
description: Calculate required clamping force from cutting forces, friction, and safety factor
---

## When To Use
- When designing workholding setups for new parts
- When verifying vise or clamp force is sufficient for planned cutting forces
- When parts shift during machining and you need to quantify force requirements
- NOT for specific workholding type validation (use mfg-workholding-validate)

## How To Use
### Calculate Clamp Force Required
```
prism_safety action=calculate_clamp_force_required params={
  Fc: 2000,
  Ft: 800,
  friction_coeff: 0.3,
  safety_factor: 2.5
}
```

### Calculate With Full Force Components
```
prism_safety action=calculate_clamp_force_required params={
  Fc: 3000,
  Ft: 1200,
  Fa: 500,
  friction_coeff: 0.25,
  safety_factor: 2.0,
  clamp_direction: "vertical",
  cutting_direction: "horizontal"
}
```

## What It Returns
```json
{
  "required_clamp_force_kN": 16.67,
  "required_clamp_force_lbf": 3747,
  "resultant_cutting_force_N": 2154,
  "friction_force_available_N": 5001,
  "friction_coeff_used": 0.3,
  "safety_factor_applied": 2.5,
  "force_balance": {
    "sliding_force_N": 2000,
    "resisting_friction_N": 5001,
    "margin_N": 3001
  },
  "warnings": [],
  "recommendation": "Clamp at minimum 16.67 kN (3747 lbf). Standard 6-inch vise at 30kN exceeds requirement with 1.8x margin."
}
```

## Examples
### Vise Clamping for Roughing
- Input: `prism_safety action=calculate_clamp_force_required params={Fc: 2000, Ft: 800, friction_coeff: 0.3, safety_factor: 2.5}`
- Output: Need 16.67 kN clamping. Standard 6" Kurt vise delivers 25-30 kN -- adequate with good margin. Ensure parallels seat part firmly.
- Edge case: Oil or coolant on vise jaws reduces friction coefficient from 0.3 to 0.15 -- doubling required clamp force

### Light Finishing on Smooth Part
- Input: `prism_safety action=calculate_clamp_force_required params={Fc: 200, Ft: 80, friction_coeff: 0.15, safety_factor: 3.0}`
- Output: Need 4.0 kN clamping. Low friction (smooth part surface) compensated by high safety factor. Consider serrated jaw inserts to increase friction to 0.4 and reduce required force.
- Edge case: Anodized or painted surfaces have unpredictable friction -- use safety factor of 3.0 minimum
