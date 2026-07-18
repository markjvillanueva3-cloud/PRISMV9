---
name: mastercam-pocket_2d-core_mill_3d
description: mastercam CAM template for pocket_2d (native: 3D Core Mill)
metadata:
  type: cam-template
  op: pocket_2d
  system: mastercam
  nativeKey: core_mill_3d
---
## Purpose

The **pocket_2d** operation in **mastercam** — exposed natively as "3D Core Mill" (catalog key `core_mill_3d`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "3D Core Mill". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `pocket_2d`
- CAM system: `mastercam`
- Native catalog key: `core_mill_3d`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
