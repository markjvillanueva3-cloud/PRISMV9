---
title: "CAD function template — inventor / layer-style"
software: inventor
function: layer-style
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — inventor / layer-style

**Software:** `inventor` · **Function category:** `layer-style`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <layer-style> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.41)

> just indicate um primitive primitive primitive objects so I can actually click on that yellow part on the top of the mod

just indicate um primitive primitive primitive objects so I can actually click on that yellow part on the top of the model and use that as a plane um so the end result is is we're trying to get an intelligent model from 3D scan data and automatic feature recognition adds a little intelligence or a layer of intelligence onto our mesh and then from that intelligence and those Primitives we were able to create um an actual solid so the next step after region grouping is to create some sketches so we'll take cross-sections through our part and we'll get a reference outline that's pink and then we

_Signals: camOps:1 · howto:3_

_Source: [Rapidform XOR to Inventor LiveTransfer Webinar](https://www.youtube.com/watch?v=GdIrN14WyZc) — channel `rapidform3d`_

### Tip 2 (confidence 0.4)

> we'll call this one length equals 1000 millimeters and then press ENTER Reid so that's our that's our dimensions for our

we'll call this one length equals 1000 millimeters and then press ENTER Reid so that's our that's our dimensions for our bounding box click finish sketch zoom out a bit I hate it when it does that that's really irritating and then press extrude and we'll go height height equals 500 right so we'll have it thousand five thousand by five hundred and I will change the appearance of this to be clear because this is just a skeletal model it doesn't exist exist exist and then there's our scale model what you can also do and just so you know where we're heading with this this is a framework for the

_Signals: camOps:1 · howto:2_

_Source: [Frame Generator Tutorial (Beginner) as Fast as I Can | Autodesk Inventor](https://www.youtube.com/watch?v=89PX745HTfU) — channel `Tech3D`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `layer-style` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation