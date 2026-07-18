---
name: fusion360-contour_2d-2d_adaptive_clearing
description: fusion360 CAM template for contour_2d (native: 2D_ADAPTIVE_CLEARING)
metadata:
  type: cam-template
  op: contour_2d
  system: fusion360
  nativeKey: 2D_ADAPTIVE_CLEARING
---
## Purpose

The **contour_2d** operation in **fusion360** — exposed natively as "2D_ADAPTIVE_CLEARING" (catalog key `2D_ADAPTIVE_CLEARING`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "2D_ADAPTIVE_CLEARING". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `contour_2d`
- CAM system: `fusion360`
- Native catalog key: `2D_ADAPTIVE_CLEARING`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
