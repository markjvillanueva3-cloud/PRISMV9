---
name: mastercam-morph_5axis-blend_3d
description: mastercam CAM template for morph_5axis (native: 3D Blend)
metadata:
  type: cam-template
  op: morph_5axis
  system: mastercam
  nativeKey: blend_3d
---
## Purpose

The **morph_5axis** operation in **mastercam** — exposed natively as "3D Blend" (catalog key `blend_3d`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "3D Blend". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `morph_5axis`
- CAM system: `mastercam`
- Native catalog key: `blend_3d`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
