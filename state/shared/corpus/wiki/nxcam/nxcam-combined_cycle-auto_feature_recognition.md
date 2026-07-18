---
name: nxcam-combined_cycle-auto_feature_recognition
description: nxcam CAM template for combined_cycle (native: Auto Feature Recognition (FBM_FIND_FEATURES))
metadata:
  type: cam-template
  op: combined_cycle
  system: nxcam
  nativeKey: auto_feature_recognition
---
## Purpose

The **combined_cycle** operation in **nxcam** — exposed natively as "Auto Feature Recognition (FBM_FIND_FEATURES)" (catalog key `auto_feature_recognition`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.target_solid` | [object Object] |
| `geometry.recognize_scope` | [object Object] |
| `geometry.stock_body` | [object Object] |
| `recognition.recognize_pockets` | [object Object] |
| `recognition.recognize_holes` | [object Object] |
| `recognition.recognize_bosses` | [object Object] |
| `recognition.recognize_slots` | [object Object] |
| `recognition.recognize_faces` | [object Object] |
| `recognition.recognize_fillets` | [object Object] |
| `filter.min_feature_size_mm` | [object Object] |
| `filter.max_feature_size_mm` | [object Object] |
| `filter.min_depth_mm` | [object Object] |
| `filter.ignore_open_sides` | [object Object] |
| `classification.hole_aspect_ratio_limit` | [object Object] |
| `classification.pocket_depth_to_width_limit` | [object Object] |
| `classification.slot_length_to_width_min` | [object Object] |
| `output.create_feature_group` | [object Object] |
| `output.group_name` | [object Object] |
| `output.color_by_type` | [object Object] |
| `output.report_unrecognized` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Auto Feature Recognition (FBM_FIND_FEATURES)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `combined_cycle`
- CAM system: `nxcam`
- Native catalog key: `auto_feature_recognition`
- Parameter count: 20

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
