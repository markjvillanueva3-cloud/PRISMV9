---
title: "CAD function template — onshape / query-measure"
software: onshape
function: query-measure
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — onshape / query-measure

**Software:** `onshape` · **Function category:** `query-measure`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <query-measure> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> little bit of clearance and we're ready to take that geometry and turn it into an extrusion so we go go into Extrusion h

little bit of clearance and we're ready to take that geometry and turn it into an extrusion so we go go into Extrusion here and now this is where things are going to be a little different because this sketch and this Extrusion started out co- planer to an existing solid the default Behavior here is to add meaning it's just another Extrusion but we're going to choose new which is going to create now a new solid body or a new part in this onshape part studio so you can see here that I can then say that I want that to go up to a height of 2 mm and we can see here that now when we hit the green

_Signals: camOps:1 · params:1 · howto:1_

_Source: [Designing Parts Together (In-Context Features)](https://www.youtube.com/watch?v=kKsVUTRPM3k) — channel `Onshape`_

### Tip 2 (confidence 0.4)

> additional padding distance enforces additional padding distance enforces additional padding along the boundary edges no

additional padding distance enforces additional padding distance enforces additional padding along the boundary edges notice how the direction changes when i select the right plane or plane 2 which is rotated 45 degrees if you'd like to isolate or exclude specific regions for patterning an advanced technique incorporates the advanced technique incorporates the advanced technique incorporates the split feature split feature split feature sketch an area to isolate and split the target face next use the fill pattern as previously explained explained explained as a final step use delete face with

_Signals: params:1 · howto:2_

_Source: [Tech Tip: How to use the Fill Pattern Custom Feature](https://www.youtube.com/watch?v=7QKdqy8cnSg) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `query-measure` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation