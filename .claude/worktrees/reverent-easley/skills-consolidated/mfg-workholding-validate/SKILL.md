---
name: mfg-workholding-validate
description: Validate complete workholding setup adequacy including stability margin and force balance
---

## When To Use
- When setting up a new part in vise, clamps, or custom fixture
- When a part has moved during machining and you need to verify setup
- Before running aggressive roughing on a workholding setup
- NOT for calculating required clamp force alone (use mfg-clamp-force)

## How To Use
### Validate Workholding Setup
```
prism_safety action=validate_workholding_setup params={
  workholding_type: "vise",
  clamp_force_kN: 20,
  cutting_force_N: 3000,
  part_weight_kg: 5
}
```

### Validate With Full Setup Details
```
prism_safety action=validate_workholding_setup params={
  workholding_type: "toe_clamps",
  clamp_force_kN: 8,
  cutting_force_N: 2500,
  part_weight_kg: 12,
  clamp_count: 4,
  clamp_positions: [{x: 0, y: 0}, {x: 200, y: 0}, {x: 0, y: 100}, {x: 200, y: 100}],
  part_dimensions: {length: 250, width: 150, height: 30},
  friction_coeff: 0.3
}
```

## What It Returns
```json
{
  "setup_adequate": true,
  "stability_margin": 2.8,
  "sliding_safety_factor": 3.3,
  "liftoff_safety_factor": 4.1,
  "tipping_safety_factor": 2.8,
  "limiting_mode": "tipping",
  "force_balance": {
    "total_clamp_force_kN": 20.0,
    "total_cutting_force_kN": 3.0,
    "friction_resistance_kN": 6.0,
    "gravity_kN": 0.049
  },
  "warnings": [],
  "recommendation": "Setup adequate with 2.8x stability margin. Tipping is limiting mode -- clamp as close to cutting zone as possible."
}
```

## Examples
### Standard Vise Setup
- Input: `prism_safety action=validate_workholding_setup params={workholding_type: "vise", clamp_force_kN: 20, cutting_force_N: 3000, part_weight_kg: 5}`
- Output: Adequate with 2.8x margin. Vise provides reliable clamping. Ensure part seats on parallels before tightening.
- Edge case: Parts that are taller than they are wide in the vise jaws are prone to tipping -- check height-to-width ratio

### Marginal Toe Clamp Setup
- Input: `prism_safety action=validate_workholding_setup params={workholding_type: "toe_clamps", clamp_force_kN: 5, cutting_force_N: 4000, part_weight_kg: 3, clamp_count: 2, friction_coeff: 0.2}`
- Output: INADEQUATE -- 2 toe clamps at 5kN with 0.2 friction provides only 2.0 kN resistance against 4.0 kN cutting force. Add 2 more clamps or reduce cutting forces by 50%.
- Edge case: Toe clamps can walk loose from vibration during roughing -- retorque after first pass and use lock nuts
