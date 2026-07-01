---
title: "CAD function template — inventor / schematic-electrical"
software: inventor
function: schematic-electrical
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — inventor / schematic-electrical

**Software:** `inventor` · **Function category:** `schematic-electrical`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <schematic-electrical> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.52)

> already added you can click right click choose 3D move and rotate so this will be that x y z that you can control in you

already added you can click right click choose 3D move and rotate so this will be that x y z that you can control in your 3D Parts okay for for your wiring okay A bit problematic if everything need to be done manually okay A bit problematic problematic problematic okay what if if I want to make it more custom so since normally electrical they will have a 2d schematic okay so I want to link in between my with the 3D modeling with the 3D modeling with the 3D modeling so the step I need to install the same version inventor plus AutoCAD electrical with the same version so that will be the first

_Signals: camOps:6 · howto:2_

_Source: [Autodesk Inventor - Wire Modelling for Control Panel](https://www.youtube.com/watch?v=jk9wEgNzRtI) — channel `Acad Systems Sdn Bhd`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `schematic-electrical` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation