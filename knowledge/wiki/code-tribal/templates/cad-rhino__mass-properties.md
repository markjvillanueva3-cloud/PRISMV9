---
title: "CAD function template — rhino / mass-properties"
software: rhino
function: mass-properties
source: video-tribal-aggregation
tip_count: 3
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — rhino / mass-properties

**Software:** `rhino` · **Function category:** `mass-properties`
**Source:** aggregated from 3 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <mass-properties> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.45)

> hey guys welcome back and today we are finally transitioning into 3d mode so first off gonna set up a box here there it

hey guys welcome back and today we are finally transitioning into 3d mode so first off gonna set up a box here there it is in all of its glory so how do you set up a simple box same procedure as always we simply simply write in brick you can also write it write it in some other elements but today which is gonna keep it simple and just setting up a simple brick exactly this the same way as we set up our other to the elements okay next up I want to show you how to look into volume how to calculate a volume we simply write in volume then the simple the same example as we did with the with the

_Signals: camOps:1 · safety:1 · howto:3_

_Source: [How to Set a Brep, get its Volume and Deconstruct - Rhino/GH Tutorial](https://www.youtube.com/watch?v=1pcRvGVIo2s) — channel `Axocraft`_

### Tip 2 (confidence 0.42)

> area except it gives you the volume instead of the actual area and also its centrally okay good of course if you wish to

area except it gives you the volume instead of the actual area and also its centrally okay good of course if you wish to look into its value we can simply set up a text tag get the volume value into into the text input and of course the centroid into its lo location and then we we have its designated volume on display okay now the the other element I want to show you is one that I find very useful which is the deconstruct Brep which is right right here you can use this for both 3d and two and 2d elements but what this does exactly is is that it allows you to decompose your breath into its

_Signals: camOps:2 · howto:1_

_Source: [How to Set a Brep, get its Volume and Deconstruct - Rhino/GH Tutorial](https://www.youtube.com/watch?v=1pcRvGVIo2s) — channel `Axocraft`_

### Tip 3 (confidence 0.41)

> you plug it in and it's going to do that so if you turn this off and you turn all this other old stuff off it's gonna re

you plug it in and it's going to do that so if you turn this off and you turn all this other old stuff off it's gonna read as one giant volume well sort of how many did it make oh sorry there's one thing I forgot this needs to be flattened right because let me explain why let me explain why let me explain why these extrusions that were trying to join join join they're joining to each other in their in their pair right so that that one frame gets rejoined and that's what you see between these two here and that's what these two close be reps are but outside of that each of these individual sets

_Signals: camOps:2_

_Source: [41 - Grasshopper for Rhino - Preparing a Subtractive Volume with Solid Union](https://www.youtube.com/watch?v=1KeM3w-foxo) — channel `PrepARE With Kevin`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `mass-properties` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation