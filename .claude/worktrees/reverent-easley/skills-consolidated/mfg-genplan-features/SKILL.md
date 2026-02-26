---
name: Feature Recognition
description: Automatic feature recognition from part geometry for process planning
---

## When To Use
- When analyzing part geometry to identify machinable features
- When breaking down complex parts into manufacturing features
- As a first step before operation sequencing or tool selection
- NOT for generating the full process plan — use mfg-genplan instead
- NOT for CAM feature trees — use mfg-cam-analyze instead

## How To Use
```
prism_intelligence action=genplan_features params={
  part_id: "bracket-001",
  geometry: { type: "prismatic", envelope: [200, 150, 50] },
  feature_types: ["pockets", "holes", "slots", "profiles"]
}
```

## What It Returns
- List of recognized features with type classification
- Geometric parameters for each feature (depth, width, diameter)
- Tolerance and surface finish requirements per feature
- Feature relationships and accessibility analysis
- Suggested machining direction and approach for each feature

## Examples
- Input: `genplan_features params={part_id: "plate-C3", geometry: {type: "prismatic", envelope: [400,300,25]}}`
- Output: 12 features found — 4 through-holes, 3 pockets, 2 slots, 2 profiles, 1 counterbore

- Input: `genplan_features params={part_id: "shaft-D4", geometry: {type: "rotational", od: 60, length: 200}}`
- Output: 8 features — 3 diameters, 1 thread, 2 grooves, 1 keyway, 1 chamfer
