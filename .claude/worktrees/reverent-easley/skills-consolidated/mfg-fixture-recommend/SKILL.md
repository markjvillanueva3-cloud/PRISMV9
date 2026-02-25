---
name: Fixture Recommendation
description: Recommend fixture type and configuration for part geometry and operations.
---

## When To Use
- When selecting the best workholding method for a new part or setup
- When evaluating vise, fixture plate, vacuum, or custom fixture options
- When determining clamp positions that avoid tool interference
- When planning multi-operation setups and need fixture strategy across ops

## How To Use
```
prism_calc action=fixture_recommend params={
  part_geometry: { length: 200, width: 100, height: 50 },
  material: "6061-T6",
  operations: ["face_mill", "pocket", "drill"],
  machine: "VMC"
}
```

Required: `part_geometry`, `material`, `operations`. Optional: `machine` (VMC, HMC, lathe), `batch_size`, `accuracy_requirement` (standard, precision, ultra).

## What It Returns
- Recommended fixture type with justification (vise, plate, vacuum, tombstone, soft jaws)
- Clamp positions and forces with interference clearance notes
- Datum and locating surface recommendations
- Setup count and flip strategy for multi-sided machining
- Alternative fixture options ranked by cost and changeover time

## Examples
- Input: `fixture_recommend params={ part_geometry: { length: 200, width: 100, height: 50 }, material: "6061-T6", operations: ["face_mill", "pocket", "drill"] }`
- Output: Recommend 6" Kurt vise with soft jaws, grip on 50mm height leaving 25mm exposed, single setup for all 3 ops, clamp force 8 kN sufficient

- Input: `fixture_recommend params={ part_geometry: { length: 400, width: 300, height: 25 }, material: "Ti-6Al-4V", operations: ["profile", "pocket"], accuracy_requirement: "precision" }`
- Output: Vacuum fixture with grid plate recommended due to thin wall ratio, supplementary toe clamps at corners, 2-setup strategy with flip jig for back features
