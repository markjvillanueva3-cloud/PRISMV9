---
name: mfg-liftoff-moment
description: Analyze part liftoff moment vs clamping holding moment to verify part stays seated
---

## When To Use
- When cutting forces create a moment that could lift the part off the table or parallels
- When machining tall thin parts that are prone to tipping in the vise
- When clamps are far from the cutting zone creating a moment arm
- NOT for sliding force analysis (use mfg-clamp-force)

## How To Use
### Analyze Liftoff Moment
```
prism_safety action=analyze_liftoff_moment params={
  Fc: 2000,
  moment_arm: 50,
  clamp_positions: [{x: 0, y: 50}, {x: 100, y: 50}],
  part_weight_kg: 8
}
```

### Analyze With Full Geometry
```
prism_safety action=analyze_liftoff_moment params={
  Fc: 3500,
  moment_arm: 75,
  clamp_positions: [{x: 0, y: 25, force_kN: 10}, {x: 200, y: 25, force_kN: 10}],
  part_weight_kg: 15,
  part_dimensions: {length: 250, width: 50, height: 80},
  cutting_position: {x: 125, y: 25, z: -5},
  pivot_edge: "y_min"
}
```

## What It Returns
```json
{
  "liftoff_safe": true,
  "cutting_moment_Nm": 100.0,
  "holding_moment_Nm": 328.0,
  "gravity_moment_Nm": 78.4,
  "total_resisting_moment_Nm": 406.4,
  "safety_factor": 4.06,
  "pivot_point": {"x": 0, "y": 0},
  "critical_cut_position": {"x": 125, "y": 25, "z": -75},
  "max_safe_cutting_force_N": 8128,
  "warnings": [],
  "recommendation": "Liftoff safe with 4.06x margin. Gravity contributes 19% of holding -- do not rely on part weight alone."
}
```

## Examples
### Tall Part in Vise
- Input: `prism_safety action=analyze_liftoff_moment params={Fc: 2000, moment_arm: 50, clamp_positions: [{x: 0, y: 50}, {x: 100, y: 50}], part_weight_kg: 8}`
- Output: Safe with 4.06x margin. Cutting moment 100 Nm vs holding moment 406 Nm. Part weight provides 78 Nm additional holding.
- Edge case: Moment arm increases as tool moves up the part face -- worst case is at maximum Z height, not at bottom of cut

### Eccentric Cutting on Plate
- Input: `prism_safety action=analyze_liftoff_moment params={Fc: 4000, moment_arm: 100, clamp_positions: [{x: 0, y: 50, force_kN: 5}], part_weight_kg: 3}`
- Output: LIFTOFF RISK -- cutting moment 400 Nm with single clamp providing only 250 Nm resistance at 50mm from pivot. Add second clamp closer to cutting zone or reduce cutting force. Moving clamp to 80mm from pivot adds 150 Nm holding.
- Edge case: Climb milling can create upward force components that add directly to liftoff moment -- conventional milling pushes part down
