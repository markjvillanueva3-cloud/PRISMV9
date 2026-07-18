---
name: mastercam-face-face_2d
description: mastercam CAM template for face (native: 2D Face)
metadata:
  type: cam-template
  op: face
  system: mastercam
  nativeKey: face_2d
---
## Purpose

The **face** operation in **mastercam** — exposed natively as "2D Face" (catalog key `face_2d`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "2D Face". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `face`
- CAM system: `mastercam`
- Native catalog key: `face_2d`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
