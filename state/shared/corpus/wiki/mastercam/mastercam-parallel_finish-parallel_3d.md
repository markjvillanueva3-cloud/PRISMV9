---
name: mastercam-parallel_finish-parallel_3d
description: mastercam CAM template for parallel_finish (native: 3D Parallel (Finishing))
metadata:
  type: cam-template
  op: parallel_finish
  system: mastercam
  nativeKey: parallel_3d
---
## Purpose

The **parallel_finish** operation in **mastercam** — exposed natively as "3D Parallel (Finishing)" (catalog key `parallel_3d`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "3D Parallel (Finishing)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `parallel_finish`
- CAM system: `mastercam`
- Native catalog key: `parallel_3d`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
