---
name: fusion360-probe_wcs-probe_wcs_web
description: fusion360 CAM template for probe_wcs (native: PROBE_WCS_WEB)
metadata:
  type: cam-template
  op: probe_wcs
  system: fusion360
  nativeKey: PROBE_WCS_WEB
---
## Purpose

The **probe_wcs** operation in **fusion360** — exposed natively as "PROBE_WCS_WEB" (catalog key `PROBE_WCS_WEB`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "PROBE_WCS_WEB". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `probe_wcs`
- CAM system: `fusion360`
- Native catalog key: `PROBE_WCS_WEB`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
