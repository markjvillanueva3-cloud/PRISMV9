---
name: mastercam-turn_rough-dynamic_mill
description: mastercam CAM template for turn_rough (native: Dynamic Mill)
metadata:
  type: cam-template
  op: turn_rough
  system: mastercam
  nativeKey: dynamic_mill
---
## Purpose

The **turn_rough** operation in **mastercam** — exposed natively as "Dynamic Mill" (catalog key `dynamic_mill`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "Dynamic Mill". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_rough`
- CAM system: `mastercam`
- Native catalog key: `dynamic_mill`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
