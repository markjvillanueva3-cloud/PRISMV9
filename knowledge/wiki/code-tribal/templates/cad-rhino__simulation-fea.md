---
title: "CAD function template — rhino / simulation-fea"
software: rhino
function: simulation-fea
source: video-tribal-aggregation
tip_count: 2
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — rhino / simulation-fea

**Software:** `rhino` · **Function category:** `simulation-fea`
**Source:** aggregated from 2 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <simulation-fea> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> split select the mesh split command I have the create Eng gon option set to know I'll select the mesh to split and The C

split select the mesh split command I have the create Eng gon option set to know I'll select the mesh to split and The Cutting object will be that that that line I'll select the part of the result that I care about and then use the invert command followed by delete to remove every everything I don't need next I'll go into the mesh tools again and use shrink again and use shrink again and use shrink wrap I'll enable preview as well as hide input input input objects The Fill mesh holes option will fill any holes in the input objects and the target Edge length will allow us to capture more

_Signals: howto:7_

_Source: [Rhino 8   The Secret Sauce!](https://www.youtube.com/watch?v=4sC131_cO6U) — channel `Rhino 3D (Rhinoceros3d official)`_

### Tip 2 (confidence 0.4)

> hi everybody this is Brian James from Rhino 3d

hi everybody this is Brian James from Rhino 3d.com and in this video I'd like to share with you one of my favorite workflows in Rhino workflows in Rhino workflows in Rhino 8 here we have a low poly scan of an armchair this mesh has a number of issues including holes and issues including holes and issues including holes and self-intersecting topology I'd like to end up with a closed solid poly surface and I'll start in the front view I'll draw a line with the polyline command and I'll hold down shift to keep the line straight I'll go into the mesh tools and select the mesh split select the mesh

_Signals: camOps:1 · howto:2_

_Source: [Rhino 8   The Secret Sauce!](https://www.youtube.com/watch?v=4sC131_cO6U) — channel `Rhino 3D (Rhinoceros3d official)`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `simulation-fea` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation