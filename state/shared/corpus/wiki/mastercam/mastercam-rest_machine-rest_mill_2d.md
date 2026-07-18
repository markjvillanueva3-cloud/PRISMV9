---
name: mastercam-rest_machine-rest_mill_2d
description: mastercam CAM template for rest_machine (native: 2D Rest Mill)
metadata:
  type: cam-template
  op: rest_machine
  system: mastercam
  nativeKey: rest_mill_2d
---
## Purpose

The **rest_machine** operation in **mastercam** — exposed natively as "2D Rest Mill" (catalog key `rest_mill_2d`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "2D Rest Mill". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `rest_machine`
- CAM system: `mastercam`
- Native catalog key: `rest_mill_2d`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
