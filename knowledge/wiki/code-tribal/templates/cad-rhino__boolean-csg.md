---
title: "CAD function template — rhino / boolean-csg"
software: rhino
function: boolean-csg
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — rhino / boolean-csg

**Software:** `rhino` · **Function category:** `boolean-csg`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <boolean-csg> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.41)

> me see if I can show you by going back to the sit assembly mechanism I think it was there okay it's here okay it's here

me see if I can show you by going back to the sit assembly mechanism I think it was there okay it's here okay it's here okay it's here perfect so in this case you would join them first and then you would first apply a Boolean Philip apply a Boolean Philip apply a Boolean Philip with some radius with some radius with some radius and then you would apply another fillet but that needs to be less than the fillet that you have used so it can be let's say a flat of radius one okay so like that you are able to smooth the knob part um how much do you which how do you know how do we know which

_Signals: camOps:2_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `boolean-csg` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation