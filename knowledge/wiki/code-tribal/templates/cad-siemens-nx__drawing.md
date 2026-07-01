---
title: "CAD function template — siemens-nx / drawing"
software: siemens-nx
function: drawing
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / drawing

**Software:** `siemens-nx` · **Function category:** `drawing`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <drawing> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> We're going to utilize the associative drawing with all the appropriate dimensions, annotations, appropriate dimensions,

We're going to utilize the associative drawing with all the appropriate dimensions, annotations, appropriate dimensions, annotations, appropriate dimensions, annotations, GD&T, GD&T, GD&T, um, feature control frames. We're going to convert them back into the 3D space. So, we have several options. We can use drawings. We can use a sheet if there are multiple sheets. Um so we can select a sheet or select all the views or we can just select which view we want our conversion to take place. In this case we have multiple views and then we can also select annotation.

_Signals: camOps:1 · howto:4_

_Source: [How to Quickly Convert Drawing Annotations to 3D PMI in Siemens NX](https://www.youtube.com/watch?v=USk4rjqm1JM) — channel `The Mech Conductor`_

### Tip 2 (confidence 0.42)

> once we select the new button NX presents us with a new dialogue where we can choose the type of file that we are trying

once we select the new button NX presents us with a new dialogue where we can choose the type of file that we are trying to create so here we can choose to do a new model a model a model a drawing an additive manufacturing model or anything else currently we are interested in a manufacturing file so we will choose manufacturing and then inside templates we will choose black we can also refer to an existing file in case we already have a 3D model and we want to create a new project based on an existing model we can also change the units if we want but right now I will go with the default which

_Signals: camOps:1 · howto:4_

_Source: [Master NX CAM with this Crash Course!](https://www.youtube.com/watch?v=XiSCDtbowXo) — channel `CAM Learning Partner`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `drawing` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation