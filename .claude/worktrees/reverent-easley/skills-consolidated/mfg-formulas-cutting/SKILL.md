---
name: mfg-formulas-cutting
description: Cutting force formulas including Kienzle, Merchant, and Lee-Shaffer models
---

# Cutting Force Formulas

## When To Use
- Need cutting force equations (Fc, Ff, Fp components)
- Looking up Kienzle specific force constants (kc1.1, mc) for a material
- Chip formation models: shear angle, chip thickness ratio
- Verifying force predictions against empirical data
- NOT for tool life or wear — use mfg-formulas-tool-life
- NOT for power/torque — use mfg-formulas-power (though forces feed into it)

## How To Use
```
prism_data action=formula_get params={ category: "cutting_force" }
prism_calc action=cutting_force params={
  material: "steel_1045",
  depth_of_cut: 3.0,
  feed: 0.25,
  cutting_speed: 200,
  rake_angle: 6
}
```

## What It Returns
- `formulas`: ~40 formulas covering Kienzle, Merchant, Lee-Shaffer, Oxley
- `Fc`: Main cutting force via Kienzle (Fc = kc1.1 * b * h^(1-mc))
- `shear_angle`: Merchant minimum energy (phi = 45 + alpha/2 - beta/2)
- `chip_thickness_ratio`: r = t1/t2 relationship to shear angle
- `specific_force`: kc corrected for chip thickness, rake, speed, wear

## Examples
- **Kienzle for C45 steel**: kc1.1=1780 MPa, mc=0.26, at h=0.25mm gives kc=2380 MPa
- **Merchant shear angle**: rake=6deg, friction=35deg gives phi=28deg
- **Milling force**: Convert per-tooth chip load to instantaneous force with engagement angle
- **Force correction**: Worn tool (VB=0.3mm) adds 15-25% to fresh-tool force
