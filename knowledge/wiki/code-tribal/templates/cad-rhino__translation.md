---
title: "CAD function template — rhino / translation"
software: rhino
function: translation
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — rhino / translation

**Software:** `rhino` · **Function category:** `translation`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <translation> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> Creo SolidWorks Alias okay so you can export your file in iges or step format which is basically a poly Surface or Surfa

Creo SolidWorks Alias okay so you can export your file in iges or step format which is basically a poly Surface or Surface in Rhino you can apply the texture and you can export it back to your native cat software okay okay okay all right so once you have applied the wavy effect as you can see you have more options here so imagine if you want to create a gradient create a gradient create a gradient of color of color of color you can right click you can right click you can right click and you can create a new material let's say a plastic material say a plastic material say a plastic material

_Signals: howto:7_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

### Tip 2 (confidence 0.4)

> triangle as a driver so I can type in a multiplication here and give it a small coefficient let's say 0

triangle as a driver so I can type in a multiplication here and give it a small coefficient let's say 0.05 we can also double-click on our number slider and set up a threshold I say this goes from 0 to 0.25 and you want the area values to be below to be below to be below one so that these pieces will be scaled down and when I connect them you can see that I can use different amounts of percentages so maximum I get is 0.25 the smallest I can get is around 0.05 so this will be kind of a multiplier for the for the scaling down and in the last step what I want to do is turn these into panels

_Signals: camOps:1 · howto:2_

_Source: [Parametric Surface Panels Grasshopper Tutorial](https://www.youtube.com/watch?v=n9ErBxRWAtY) — channel `Parametric`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `translation` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation