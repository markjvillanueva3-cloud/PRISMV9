---
title: "CAD function template — rhino / drawing"
software: rhino
function: drawing
source: video-tribal-aggregation
tip_count: 4
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — rhino / drawing

**Software:** `rhino` · **Function category:** `drawing`
**Source:** aggregated from 4 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <drawing> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 4 by confidence)

### Tip 1 (confidence 0.58)

> perspective view based on this particular viewing angle and and over here you got projection you can select the projecti

perspective view based on this particular viewing angle and and over here you got projection you can select the projection type in this case I want to use a angle projection whereas for the options um you can decide on the T the type of lines and edges to be uh generated in this case I want the hidden lines and the scene silhouette to be generated once this are established you can click okay the 2D drawings have been generated I'm going to the top view and I'm going to use the inverse height to hide the original 3D model the top view is where we have a correct orientation of the layout the

_Signals: toolpath:3 · camOps:2 · howto:2_

_Source: [Rhino 8 Tutorial: 2D Technical Drawing from 3D Model (Updated)](https://www.youtube.com/watch?v=YkS4kye5A34) — channel `PC Sim`_

### Tip 2 (confidence 0.53)

> A faster way of getting a set of drawings would be to [music] select in the make 2D window the third angle projection or

A faster way of getting a set of drawings would be to [music] select in the make 2D window the third angle projection or the first [music] angle projection. This generates a set of four drawings, two side views, [music] a plan, and a perspective view. Now layouts. Type layout in the command line [music] and a new window will open. Here you can specify the layout you want to be using [music] or create a custom one. This will be created and you will be able to see this in the layout manager, here on the [music] right. And here also you can add more and rename them. rename them. rename them.

_Signals: toolpath:2 · camOps:1 · howto:5_

_Source: [2d Drawing, Layouts and Make2d in Rhino](https://www.youtube.com/watch?v=T5JJodbRQKU) — channel `Spaceman-84`_

### Tip 3 (confidence 0.44)

> use the nend snap and the qu snap and make sure that we are in this mode the 3D viewport mode okay and then uh I go to d

use the nend snap and the qu snap and make sure that we are in this mode the 3D viewport mode okay and then uh I go to drafting linear dimension so we got this and okay if you want to set or edit some of the parameters of the the the dimension you can do so by going to drafting firstly set the current annotation style annotation style annotation style so the current annotation uh I want to establish as this mm small click okay and then come back here again go to edit annotation style make sure that you are selecting the current annotation style and then click and then click and then click

_Signals: camOps:1 · howto:6_

_Source: [Rhino 8 Tutorial: 2D Technical Drawing from 3D Model (Updated)](https://www.youtube.com/watch?v=YkS4kye5A34) — channel `PC Sim`_

### Tip 4 (confidence 0.42)

> To add views on the layout, type detail, then select add, and by drawing a rectangle you will get [music] a view from th

To add views on the layout, type detail, then select add, and by drawing a rectangle you will get [music] a view from the top. from the top. from the top. Then you have to set the scale and find the area of the view that you want to show. show. show. You can also copy this detail view [music] to select other areas. And you can keep adding detail views manually, also maybe from other views like here by choosing right, and again set the scale, find the area [music] of interest, and perhaps use a different display mode. You can turn on and off the layers of each [music] individual detail view.

_Signals: camOps:1 · howto:4_

_Source: [2d Drawing, Layouts and Make2d in Rhino](https://www.youtube.com/watch?v=T5JJodbRQKU) — channel `Spaceman-84`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `drawing` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation