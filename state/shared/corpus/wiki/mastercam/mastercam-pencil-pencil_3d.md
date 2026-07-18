---
name: mastercam-pencil-pencil_3d
description: mastercam CAM template for pencil (native: 3D Pencil)
metadata:
  type: cam-template
  op: pencil
  system: mastercam
  nativeKey: pencil_3d
---
## Purpose

The **pencil** operation in **mastercam** — exposed natively as "3D Pencil" (catalog key `pencil_3d`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "3D Pencil". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `pencil`
- CAM system: `mastercam`
- Native catalog key: `pencil_3d`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
