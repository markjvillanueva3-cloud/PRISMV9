---
name: Setup Planner
description: Optimize setup planning including part orientation and fixture strategy
---

## When To Use
- When determining how many setups a part requires
- When optimizing part orientation for feature accessibility
- When selecting fixture strategy and workholding approach
- NOT for clamp force calculations — use mfg-clamp-force instead
- NOT for fixture clearance checking — use mfg-fixture-clearance instead

## How To Use
```
prism_intelligence action=genplan_setups params={
  part_id: "bracket-001",
  features: ["top_pocket", "side_holes", "bottom_profile"],
  material: "6061-T6",
  machine_type: "3-axis VMC",
  constraints: { max_setups: 3 }
}
```

## What It Returns
- Optimal number of setups with part orientation per setup
- Feature-to-setup assignment with machining sequence
- Fixture type recommendation per setup (vise, plate, custom)
- Datum and reference surface strategy
- Setup change time estimates

## Examples
- Input: `genplan_setups params={part_id: "housing-E5", features: ["6_faces", "internal_bore"], machine_type: "5-axis"}`
- Output: 2 setups (reduced from 4 on 3-axis), tombstone fixture recommended, 15 min setup time

- Input: `genplan_setups params={part_id: "cover-F6", features: ["top_pocket", "through_holes"], machine_type: "3-axis VMC"}`
- Output: 1 setup sufficient, 6-inch vise with parallels, all features accessible from top
