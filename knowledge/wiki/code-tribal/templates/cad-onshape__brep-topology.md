---
title: "CAD function template — onshape / brep-topology"
software: onshape
function: brep-topology
source: video-tribal-aggregation
tip_count: 3
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — onshape / brep-topology

**Software:** `onshape` · **Function category:** `brep-topology`
**Source:** aggregated from 3 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <brep-topology> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.45)

> face to ensure the result only contains faces create a constant named start condition map it needs three map it needs th

face to ensure the result only contains faces create a constant named start condition map it needs three map it needs three parameters profile index is always zero for the start condition set magnitude to the start magnitude adjacent faces are the faces that connect to the profile set adjacent faces to the adjacent faces constant add the map to the D info array set D info equal to the result of an append function append takes in two arguments an existing array and the new value set D info and start condition map as the as the as the arguments now create the appropriate functions for the end

_Signals: safety:1 · howto:6_

_Source: [Building a Complete Custom Feature (FeatureScript)](https://www.youtube.com/watch?v=yi06ZVDoevs) — channel `Onshape`_

### Tip 2 (confidence 0.44)

> going to go up to face so I'll pick this rear face here and there we go that's looking pretty good let's jump into our f

going to go up to face so I'll pick this rear face here and there we go that's looking pretty good let's jump into our fillet command and our fillet is going to have a radius of 0.25 and that'll be applied on this Edge on this Edge and on this Edge and now we will finish this whole thing off by clicking the mirror command choosing this as our body to mirror choosing this as our mirror plane and then finishing up by making sure that we're choosing to add this material so that we don't end up with two separate sheet metal bodies but instead one single merged sheet metal body so we hit the green

_Signals: camOps:3_

_Source: [Sheet Metal Beginner Tutorial (Angle Bracket)](https://www.youtube.com/watch?v=4rndxiRc0Xc) — channel `Onshape`_

### Tip 3 (confidence 0.44)

> the May connector will relocate so that it is always at the center or the midpoint of that edge so what I'd like to do i

the May connector will relocate so that it is always at the center or the midpoint of that edge so what I'd like to do is create a new mate connector here at the center of this end face of the PIN now we see that when we create that mate connector it does have an x y and z-axis I'm going to create another mate connector here by selecting this circular Edge and onshape is going to create that may connector at the very center of that circular Edge or coplanar to this end face of the hinge once I select that circular Edge and the mate connector is created we see that onshape moves those two mate

_Signals: safety:1 · howto:5_

_Source: [SW Expert Explores Mate Connectors](https://www.youtube.com/watch?v=TBWLGuLl5Nk) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `brep-topology` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation