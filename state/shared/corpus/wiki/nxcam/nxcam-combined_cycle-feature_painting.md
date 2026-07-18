---
name: nxcam-combined_cycle-feature_painting
description: nxcam CAM template for combined_cycle (native: Feature Painting (FBM_PAINT_FACES))
metadata:
  type: cam-template
  op: combined_cycle
  system: nxcam
  nativeKey: feature_painting
---
## Purpose

The **combined_cycle** operation in **nxcam** — exposed natively as "Feature Painting (FBM_PAINT_FACES)" (catalog key `feature_painting`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `target.host_feature` | [object Object] |
| `target.paint_mode` | [object Object] |
| `painting.face_selection` | [object Object] |
| `painting.propagate_tangent` | [object Object] |
| `painting.propagate_angle_deg` | [object Object] |
| `painting.stop_at_crease` | [object Object] |
| `behavior.update_classification` | [object Object] |
| `behavior.invalidate_existing_template` | [object Object] |
| `behavior.preview_before_commit` | [object Object] |
| `behavior.log_painted_count` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Feature Painting (FBM_PAINT_FACES)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `combined_cycle`
- CAM system: `nxcam`
- Native catalog key: `feature_painting`
- Parameter count: 10

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
