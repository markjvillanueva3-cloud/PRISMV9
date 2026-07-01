---
title: "CAD function template — rhino / subdivision-modeling"
software: rhino
function: subdivision-modeling
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — rhino / subdivision-modeling

**Software:** `rhino` · **Function category:** `subdivision-modeling`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <subdivision-modeling> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.45)

> detail from the input the smaller this number smaller this number smaller this number is I'll choose delete input object

detail from the input the smaller this number smaller this number smaller this number is I'll choose delete input objects and click okay okay now if you wanted to 3D print this model you're done you could select this mesh and Export it as an STL file but I'd like to go one step further by using the quad remesh command in the subd tools quad remesh will create an all quad mesh you can specify a target number of quads I'll click preview as well as hide input well as hide input well as hide input objects I'll also use this convert to subd option to create a subdivision surface from the Quad

_Signals: camOps:1 · howto:7_

_Source: [Rhino 8   The Secret Sauce!](https://www.youtube.com/watch?v=4sC131_cO6U) — channel `Rhino 3D (Rhinoceros3d official)`_

### Tip 2 (confidence 0.44)

> going to change degree on this guy and then i'm going to turn the points on for the center of this and then i'm going to

going to change degree on this guy and then i'm going to turn the points on for the center of this and then i'm going to add a little bit of crown and then i'm gonna just adjust that intersection this is all nurbs stuff right we know all this this is all stuff that we know stuff that we know stuff that we know people who are new to ryan were like wait a minute i've never heard of this before before before um yeah so simple overbuild right we're just gonna grab this trim trim trim trim and look our hole that we were going to worry so much about in subd about in subd about in subd to try and

_Signals: camOps:1 · safety:1 · howto:2_

_Source: [Rhino 7- When to use SubD vs NURBS](https://www.youtube.com/watch?v=f24n2ijh2Vs) — channel `Rhino 3D (Rhinoceros3d official)`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `subdivision-modeling` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation