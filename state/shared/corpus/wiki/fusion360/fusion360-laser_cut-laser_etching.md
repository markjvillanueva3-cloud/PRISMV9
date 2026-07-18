---
name: fusion360-laser_cut-laser_etching
description: fusion360 CAM template for laser_cut (native: LASER_ETCHING)
metadata:
  type: cam-template
  op: laser_cut
  system: fusion360
  nativeKey: LASER_ETCHING
---
## Purpose

The **laser_cut** operation in **fusion360** — exposed natively as "LASER_ETCHING" (catalog key `LASER_ETCHING`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "LASER_ETCHING". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `laser_cut`
- CAM system: `fusion360`
- Native catalog key: `LASER_ETCHING`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
