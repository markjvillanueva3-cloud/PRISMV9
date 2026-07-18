---
name: nxcam-pocket_2d-pocket_feature_recognition
description: nxcam CAM template for pocket_2d (native: Pocket Feature Recognition (FBM_FIND_POCKETS))
metadata:
  type: cam-template
  op: pocket_2d
  system: nxcam
  nativeKey: pocket_feature_recognition
---
## Purpose

The **pocket_2d** operation in **nxcam** — exposed natively as "Pocket Feature Recognition (FBM_FIND_POCKETS)" (catalog key `pocket_feature_recognition`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.target_solid` | [object Object] |
| `pocket_types.recognize_closed` | [object Object] |
| `pocket_types.recognize_open_one_side` | [object Object] |
| `pocket_types.recognize_through` | [object Object] |
| `pocket_types.recognize_stepped_floor` | [object Object] |
| `pocket_types.recognize_contoured_floor` | [object Object] |
| `walls.max_wall_draft_deg` | [object Object] |
| `walls.min_wall_height_mm` | [object Object] |
| `walls.corner_radius_min_mm` | [object Object] |
| `walls.min_wall_thickness_mm` | [object Object] |
| `output.min_pocket_area_mm2` | [object Object] |
| `output.min_pocket_depth_mm` | [object Object] |
| `output.include_islands` | [object Object] |
| `output.report_non_planar_walls` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Pocket Feature Recognition (FBM_FIND_POCKETS)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `pocket_2d`
- CAM system: `nxcam`
- Native catalog key: `pocket_feature_recognition`
- Parameter count: 14

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
