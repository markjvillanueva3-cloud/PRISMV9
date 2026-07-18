---
name: nxcam-combined_cycle-feature_cad_sync
description: nxcam CAM template for combined_cycle (native: CAD Associativity / Feature Sync (FBM_SYNC))
metadata:
  type: cam-template
  op: combined_cycle
  system: nxcam
  nativeKey: feature_cad_sync
---
## Purpose

The **combined_cycle** operation in **nxcam** — exposed natively as "CAD Associativity / Feature Sync (FBM_SYNC)" (catalog key `feature_cad_sync`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `linkage.source_solid` | [object Object] |
| `linkage.linked_feature_group` | [object Object] |
| `linkage.linkage_mode` | [object Object] |
| `propagation.auto_re_recognize_on_update` | [object Object] |
| `propagation.auto_regenerate_paths` | [object Object] |
| `propagation.notify_on_geometry_change` | [object Object] |
| `propagation.preserve_manual_painting` | [object Object] |
| `conflicts.on_feature_disappearance` | [object Object] |
| `conflicts.on_topology_change` | [object Object] |
| `conflicts.require_user_ack_before_regen` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "CAD Associativity / Feature Sync (FBM_SYNC)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `combined_cycle`
- CAM system: `nxcam`
- Native catalog key: `feature_cad_sync`
- Parameter count: 10

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
