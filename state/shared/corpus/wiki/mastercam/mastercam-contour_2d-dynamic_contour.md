---
name: mastercam-contour_2d-dynamic_contour
description: mastercam CAM template for contour_2d (native: Dynamic Contour)
metadata:
  type: cam-template
  op: contour_2d
  system: mastercam
  nativeKey: dynamic_contour
---
## Purpose

The **contour_2d** operation in **mastercam** — exposed natively as "Dynamic Contour" (catalog key `dynamic_contour`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In mastercam, this operation is reached via its catalog UI under the function family that owns "Dynamic Contour". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `contour_2d`
- CAM system: `mastercam`
- Native catalog key: `dynamic_contour`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
