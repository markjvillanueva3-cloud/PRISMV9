---
name: fusion360-drill_peck-laser_drilling
description: fusion360 CAM template for drill_peck (native: LASER_DRILLING)
metadata:
  type: cam-template
  op: drill_peck
  system: fusion360
  nativeKey: LASER_DRILLING
---
## Purpose

The **drill_peck** operation in **fusion360** — exposed natively as "LASER_DRILLING" (catalog key `LASER_DRILLING`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "LASER_DRILLING". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `drill_peck`
- CAM system: `fusion360`
- Native catalog key: `LASER_DRILLING`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
