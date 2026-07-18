---
title: "CAD function template — inventor / feature-recog"
software: inventor
function: feature-recog
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — inventor / feature-recog

**Software:** `inventor` · **Function category:** `feature-recog`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <feature-recog> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.41)

> just indicate um primitive primitive primitive objects so I can actually click on that yellow part on the top of the mod

just indicate um primitive primitive primitive objects so I can actually click on that yellow part on the top of the model and use that as a plane um so the end result is is we're trying to get an intelligent model from 3D scan data and automatic feature recognition adds a little intelligence or a layer of intelligence onto our mesh and then from that intelligence and those Primitives we were able to create um an actual solid so the next step after region grouping is to create some sketches so we'll take cross-sections through our part and we'll get a reference outline that's pink and then we

_Signals: camOps:1 · howto:3_

_Source: [Rapidform XOR to Inventor LiveTransfer Webinar](https://www.youtube.com/watch?v=GdIrN14WyZc) — channel `rapidform3d`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `feature-recog` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation