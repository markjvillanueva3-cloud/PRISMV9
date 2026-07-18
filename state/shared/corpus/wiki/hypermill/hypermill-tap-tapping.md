---
name: hypermill-tap-tapping
description: hypermill CAM template for tap (native: tapping)
metadata:
  type: cam-template
  op: tap
  system: hypermill
  nativeKey: tapping
---
## Purpose

The **tap** operation in **hypermill** — exposed natively as "tapping" (catalog key `tapping`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "tapping". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `tap`
- CAM system: `hypermill`
- Native catalog key: `tapping`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
