---
name: nxcam-combined_cycle-manual_feature_create
description: nxcam CAM template for combined_cycle (native: Manual Feature Create (FBM_USER_DEFINED))
metadata:
  type: cam-template
  op: combined_cycle
  system: nxcam
  nativeKey: manual_feature_create
---
## Purpose

The **combined_cycle** operation in **nxcam** — exposed natively as "Manual Feature Create (FBM_USER_DEFINED)" (catalog key `manual_feature_create`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `identity.feature_name` | [object Object] |
| `identity.feature_type_override` | [object Object] |
| `geometry.selected_faces` | [object Object] |
| `geometry.selected_edges` | [object Object] |
| `geometry.reference_plane` | [object Object] |
| `geometry.approach_vector` | [object Object] |
| `classification.assigned_depth_mm` | [object Object] |
| `classification.assigned_min_radius_mm` | [object Object] |
| `classification.user_priority` | [object Object] |
| `output.add_to_group` | [object Object] |
| `output.auto_apply_template` | [object Object] |
| `output.lock_from_re_recognition` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Manual Feature Create (FBM_USER_DEFINED)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `combined_cycle`
- CAM system: `nxcam`
- Native catalog key: `manual_feature_create`
- Parameter count: 12

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
