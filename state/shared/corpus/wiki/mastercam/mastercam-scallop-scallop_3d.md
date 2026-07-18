---
name: mastercam-scallop-scallop_3d
description: mastercam CAM template for scallop (native: 3D Scallop)
metadata:
  type: cam-template
  op: scallop
  system: mastercam
  nativeKey: scallop_3d
---
## Purpose

The **scallop** operation in **mastercam** — exposed natively as "3D Scallop" (catalog key `scallop_3d`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "3D Scallop". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `scallop`
- CAM system: `mastercam`
- Native catalog key: `scallop_3d`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
