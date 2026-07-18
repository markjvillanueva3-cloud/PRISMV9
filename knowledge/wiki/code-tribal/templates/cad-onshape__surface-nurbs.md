---
title: "CAD function template — onshape / surface-nurbs"
software: onshape
function: surface-nurbs
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — onshape / surface-nurbs

**Software:** `onshape` · **Function category:** `surface-nurbs`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <surface-nurbs> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.48)

> implementing it actually start implementing it the map will tell you where to move the surface slightly inward surface s

implementing it actually start implementing it the map will tell you where to move the surface slightly inward surface slightly inward surface slightly inward or a lot outward and so on to morph your 3d object 3d object 3d object once you have more your 3d object you can re-run can re-run can re-run the primal aerodynamic simulation to check how much the objective function diff diff diff or drag or something else has changed you can then also rerun the adjoint simulation simulation simulation to again calculate a new sensitivity map and do the morphing all over again with each cycle you will

_Signals: camOps:4 · howto:1_

_Source: [Adjoint Optimization with AirShaper](https://www.youtube.com/watch?v=4gH-ImOIG2s) — channel `Onshape`_

### Tip 2 (confidence 0.42)

> and that would be like your up to surface end condition uh a mirr so yep you can do up surface for sure and then this fi

and that would be like your up to surface end condition uh a mirr so yep you can do up surface for sure and then this final feature here I always manag to uh uh struggle with this feature regardless of what CAD system I'm using creating this final like a tabbed area that's sticking up out of the top here uh just because of partially because of the way it's dimensioned uh but it's supposed to stick up 20 mm total off of uh off of the edge here so we'll take this edge here we'll do a here we'll do a here we'll do a flange uh we're going to reverse the direction of that flange I think it's going

_Signals: params:1 · safety:1_

_Source: [Onshape Sheet Metal Tutorial – FLARED BRACKET - LIVE!](https://www.youtube.com/watch?v=cShoxXtbUbk) — channel `Too Tall Toby`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `surface-nurbs` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation