---
name: hypermill-probe_wcs-surface_probe
description: hypermill CAM template for probe_wcs (native: surface probe)
metadata:
  type: cam-template
  op: probe_wcs
  system: hypermill
  nativeKey: surface_probe
---
## Purpose

The **probe_wcs** operation in **hypermill** — exposed natively as "surface probe" (catalog key `surface_probe`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "surface probe". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `probe_wcs`
- CAM system: `hypermill`
- Native catalog key: `surface_probe`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
