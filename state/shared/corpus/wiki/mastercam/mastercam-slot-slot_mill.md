---
name: mastercam-slot-slot_mill
description: mastercam CAM template for slot (native: Slot Mill)
metadata:
  type: cam-template
  op: slot
  system: mastercam
  nativeKey: slot_mill
---
## Purpose

The **slot** operation in **mastercam** — exposed natively as "Slot Mill" (catalog key `slot_mill`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "Slot Mill". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `slot`
- CAM system: `mastercam`
- Native catalog key: `slot_mill`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
