---
name: nxcam-drill_spot-hole_feature_recognition
description: nxcam CAM template for drill_spot (native: Hole Feature Recognition (FBM_FIND_HOLES))
metadata:
  type: cam-template
  op: drill_spot
  system: nxcam
  nativeKey: hole_feature_recognition
---
## Purpose

The **drill_spot** operation in **nxcam** — exposed natively as "Hole Feature Recognition (FBM_FIND_HOLES)" (catalog key `hole_feature_recognition`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.target_solid` | [object Object] |
| `geometry.wcs_reference` | [object Object] |
| `hole_types.recognize_simple` | [object Object] |
| `hole_types.recognize_counterbore` | [object Object] |
| `hole_types.recognize_countersink` | [object Object] |
| `hole_types.recognize_threaded` | [object Object] |
| `hole_types.recognize_tapered` | [object Object] |
| `hole_types.recognize_through` | [object Object] |
| `hole_types.recognize_blind` | [object Object] |
| `dimensions.min_hole_diameter_mm` | [object Object] |
| `dimensions.max_hole_diameter_mm` | [object Object] |
| `dimensions.pattern_detect_tolerance_mm` | [object Object] |
| `output.detect_patterns` | [object Object] |
| `output.group_coaxial` | [object Object] |
| `output.color_by_function` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Hole Feature Recognition (FBM_FIND_HOLES)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `drill_spot`
- CAM system: `nxcam`
- Native catalog key: `hole_feature_recognition`
- Parameter count: 15

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
