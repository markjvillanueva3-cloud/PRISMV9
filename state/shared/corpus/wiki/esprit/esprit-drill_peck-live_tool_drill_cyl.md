---
name: esprit-drill_peck-live_tool_drill_cyl
description: esprit CAM template for drill_peck (native: live tool drill cyl)
metadata:
  type: cam-template
  op: drill_peck
  system: esprit
  nativeKey: live_tool_drill_cyl
---
## Purpose

The **drill_peck** operation in **esprit** — exposed natively as "live tool drill cyl" (catalog key `live_tool_drill_cyl`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `holes` | _(none)_ |
| `cycle` | _(none)_ |
| `c_axis` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "live tool drill cyl". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `drill_peck`
- CAM system: `esprit`
- Native catalog key: `live_tool_drill_cyl`
- Parameter count: 3

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
