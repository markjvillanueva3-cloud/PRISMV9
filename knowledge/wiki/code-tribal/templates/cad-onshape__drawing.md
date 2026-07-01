---
title: "CAD function template — onshape / drawing"
software: onshape
function: drawing
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — onshape / drawing

**Software:** `onshape` · **Function category:** `drawing`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <drawing> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.45)

> in the model let's use the keyboard shortcut p to turn off turn off turn off the display of the planes let's then take o

in the model let's use the keyboard shortcut p to turn off turn off turn off the display of the planes let's then take our part and we can right click on it and choose assign material material material and then from the list i am going to look for let's grab look for let's grab look for let's grab an aluminum and i would just grab the generic aluminum in here generic aluminum in here generic aluminum in here and hit the check mark and we can also go to go to go to this icon over on the right which becomes available once you start putting in some sheet metal walls you can display the can

_Signals: camOps:3 · howto:1_

_Source: [Onshape - Sheet Metal - Flange Features](https://www.youtube.com/watch?v=4yGEheWJRqg) — channel `Creo Parametric`_

### Tip 2 (confidence 0.44)

> that fully defined sketch and turn it into a sheet metal model using the extrude option so I'm going to take this geomet

that fully defined sketch and turn it into a sheet metal model using the extrude option so I'm going to take this geometry this geometry here extrude it to a thickness of 4 mm with a radius of 6 mm so 4X 6 and then I'm going to bring this out to 120 over2 that should give me enough room to kind of cut that thing down the last thing I want to look at is the direction of the sheet metal the dimension that I put in here for 65 is from the floor to the peak of the sheet metal or to the the top of that top surface so this needs to go the other direction so whenever you're doing sheet metal you

_Signals: camOps:1 · params:2_

_Source: [Onshape Sheet Metal Tutorial – FLARED BRACKET - LIVE!](https://www.youtube.com/watch?v=cShoxXtbUbk) — channel `Too Tall Toby`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `drawing` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation