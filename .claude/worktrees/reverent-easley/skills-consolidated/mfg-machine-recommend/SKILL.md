---
name: Machine Recommender
description: Recommend optimal machine for a given part and operation combination
---

## When To Use
- When deciding which machine to run a job on from available equipment
- When a new part does not have an obvious machine assignment
- When evaluating whether current equipment can handle a new job
- When comparing machine options for capital equipment decisions
- NOT for machine specs lookup — use mfg-machine-lookup for that
- NOT for scheduling — use mfg-shop-schedule after selecting the machine

## How To Use
```
prism_intelligence action=machine_recommend params={
  part: "manifold-block",
  material: "6061-T6",
  features: ["deep_pockets", "cross_holes", "tight_tolerance_bores"],
  envelope: { x: 300, y: 200, z: 150 },
  tolerance: "±0.005",
  quantity: 200,
  available_machines: ["Haas VF-2", "Haas VF-4", "DMG Mori DMU-50"]
}
```

## What It Returns
- Ranked machine recommendations with suitability scores
- Capability match analysis (travel, spindle, accuracy, rigidity)
- Estimated cycle time difference between machines
- Fixture and tooling compatibility notes
- Warnings for capabilities that are marginal or insufficient

## Examples
- Input: `machine_recommend params={part: "impeller", features: ["5-axis contour", "thin walls"], material: "Ti-6Al-4V"}`
- Output: DMU-50 (95% fit, 5-axis simultaneous), VF-4+trunnion (72% fit, 3+2 only, longer cycle)

- Input: `machine_recommend params={part: "shaft", features: ["turning", "milling flats"], envelope: {x: 50, y: 50, z: 400}}`
- Output: NLX-2500 turn-mill (90% fit, done-in-one), alternate: lathe + VMC (2 setups, 15% longer)
