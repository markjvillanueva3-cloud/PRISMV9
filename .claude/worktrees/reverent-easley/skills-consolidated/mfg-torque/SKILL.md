---
name: mfg-torque
description: Calculate spindle torque in Nm from tangential cutting force and tool diameter
---

## When To Use
- User asks about spindle torque requirements
- Need to verify torque at low RPM where spindle is torque-limited
- Comparing large-diameter face mills or drills that demand high torque
- NOT for power calculation (use mfg-power)
- NOT for spindle speed validation (use prism_safety check_spindle_torque)

## How To Use
### Calculate Torque
```
prism_calc action=torque params={
  Fc: 1500,
  D: 50
}
```

### From Cutting Parameters
```
prism_calc action=torque params={
  material: "4140_steel",
  Vc: 150,
  fz: 0.2,
  ap: 4,
  ae: 40,
  D: 63,
  z: 5
}
```

## What It Returns
```json
{
  "torque_Nm": 37.5,
  "Fc_N": 1500,
  "D_mm": 50,
  "formula": "T = Fc * D / (2 * 1000)",
  "rpm_at_Vc": null,
  "power_equivalent_kW": null,
  "warnings": []
}
```

## Examples
### 50mm Endmill with 1500N Tangential Force
- Input: `prism_calc action=torque params={Fc: 1500, D: 50}`
- Output: 37.5 Nm torque required
- Edge case: At low RPM (large tools, slow Vc), check spindle torque curve — rated power does not equal rated torque at all speeds

### Large Face Mill Roughing
- Input: `prism_calc action=torque params={Fc: 4500, D: 80}`
- Output: 180 Nm — exceeds many 40-taper spindles; verify against machine torque curve
- Edge case: BT40 spindles typically max 120 Nm; HSK-A63 handles 200 Nm+
