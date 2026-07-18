---
name: nxcam-pocket_2d-adaptive_milling
description: nxcam CAM template for pocket_2d (native: Adaptive Milling (ADAPTIVE_MILLING))
metadata:
  type: cam-template
  op: pocket_2d
  system: nxcam
  nativeKey: adaptive_milling
---
## Purpose

The **pocket_2d** operation in **nxcam** — exposed natively as "Adaptive Milling (ADAPTIVE_MILLING)" (catalog key `adaptive_milling`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_geometry` | [object Object] |
| `geometry.blank_geometry` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `tool.loc_mm` | [object Object] |
| `engagement_control.max_radial_engagement_pct` | [object Object] |
| `engagement_control.max_axial_doc_mm` | [object Object] |
| `engagement_control.trochoid_step_mm` | [object Object] |
| `path_settings.cut_pattern` | [object Object] |
| `path_settings.smooth_path` | [object Object] |
| `path_settings.min_cut_length_mm` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |
| `speeds_feeds.feed_per_tooth_mm` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Adaptive Milling (ADAPTIVE_MILLING)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `pocket_2d`
- CAM system: `nxcam`
- Native catalog key: `adaptive_milling`
- Parameter count: 14

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
