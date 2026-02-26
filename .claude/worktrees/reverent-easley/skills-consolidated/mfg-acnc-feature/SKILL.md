---
name: mfg-acnc-feature
description: Recognize manufacturing features for automated programming
---

# ACNC Feature Recognition

## When To Use
- Identifying pockets, holes, slots, bosses, and other features from part geometry
- Classifying features by manufacturing process requirements
- Building a feature tree for automated process planning
- Detecting feature interactions (intersecting holes, thin walls, etc.)

## How To Use
```
prism_intelligence action=acnc_feature params={geometry: "step_file_ref", tolerance_map: {pocket_1: 0.05, hole_1: "H7"}}
```

## What It Returns
- `features` — list of recognized features with type, dimensions, and tolerances
- `feature_tree` — hierarchical structure showing parent-child feature relationships
- `manufacturing_requirements` — process requirements derived from each feature
- `interactions` — detected feature interactions that affect machining strategy
- `confidence` — recognition confidence per feature (high, medium, low)

## Examples
- `acnc_feature params={geometry: "bracket_v2.step"}` — recognize all features in a STEP file
- `acnc_feature params={features_manual: [{type: "pocket", L: 50, W: 30, D: 10, corners: "R3"}]}` — classify manually-entered features
- `acnc_feature params={geometry: "housing.step", filter: "holes_only"}` — extract only hole features for drill programming
