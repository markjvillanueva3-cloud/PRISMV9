---
title: "CAD function template — catia / sketch-3d"
software: catia
function: sketch-3d
source: video-tribal-aggregation
tip_count: 3
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — catia / sketch-3d

**Software:** `catia` · **Function category:** `sketch-3d`
**Source:** aggregated from 3 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <sketch-3d> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.53)

> length of our overall height of the helix let's make our pitch 25 millimetres and our height 250 millimeters next create

length of our overall height of the helix let's make our pitch 25 millimetres and our height 250 millimeters next create another helix [Music] [Music] [Music] this time the starting point is 0.1 and again the axis is the z axis pitch 25 millimeters and height 50 millimeters the two helixes would look like this [Music] [Music] now we are going to connect these two helixes at the top we will be using connect curve you can find this by clicking on the small arrow of the circle icon and click on connect curve the first curve would have helix 1 [Music] [Music] [Music] click on this point and this

_Signals: toolpath:3 · howto:3_

_Source: [CATIA V5 TUTORIAL: Surface Modelling SPIRAL LAMP! *From START to FINISH*](https://www.youtube.com/watch?v=0wwI15VzOBA) — channel `Nizua Inas`_

### Tip 2 (confidence 0.5)

> [Music] so create another point on this curve and just like before create another helix after that hide all the curves b

[Music] so create another point on this curve and just like before create another helix after that hide all the curves by going to tools hi all groups now join all these surfaces if this error pops up it is because you have not selected all of their surfaces so try to connect all of the surfaces again unhide helix three and now let's move on to solidifying this surveys head on to the art design workbench workbench workbench start mechanical design part design now we are going to thicken surveys right click on part body click behind it work object and then click on the stick surface bicorn

_Signals: toolpath:2 · howto:5_

_Source: [CATIA V5 TUTORIAL: Surface Modelling SPIRAL LAMP! *From START to FINISH*](https://www.youtube.com/watch?v=0wwI15VzOBA) — channel `Nizua Inas`_

### Tip 3 (confidence 0.42)

> like 20 I will hit apply you're going to see that with 20 it is a little bit better but still around the corners it will

like 20 I will hit apply you're going to see that with 20 it is a little bit better but still around the corners it will it will not be that well defined so we have the initial sectioning with blue and after we have the 3D curve over here so I will add this to be 30 if I will click okay again we're going to see that in some areas the newly defined Curve will look like that therefore I can go with a high value for example 50 if I will click now click now click now apply you're going to see that even though though though visually we don't see visually we don't see visually we don't see that

_Signals: camOps:1 · howto:4_

_Source: [CATIA V5 - Reverse Engineering (Curve from 3D scan)](https://www.youtube.com/watch?v=oa-rP9PD7Tw) — channel `3D Comparison`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `sketch-3d` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation