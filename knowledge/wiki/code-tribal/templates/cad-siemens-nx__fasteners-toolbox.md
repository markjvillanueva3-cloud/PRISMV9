---
title: "CAD function template — siemens-nx / fasteners-toolbox"
software: siemens-nx
function: fasteners-toolbox
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / fasteners-toolbox

**Software:** `siemens-nx` · **Function category:** `fasteners-toolbox`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <fasteners-toolbox> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.44)

> So you can see in this toolbox I have harness on

So you can see in this toolbox I have harness on. So therefore, this industry tab will will fill up with whatever industry I've chosen. In this case, it's harnessing. So I can have multiple different things in here. So I can do path length annotation. So I can choose my writing object. So let's say this path, if I want it to be annotated. So I can say, yep, that's 170 mm. This is 90 mm and this path will be this main rung will be 80 mm. Now, if I wanted to have a foam board face annotation, so let's say if I had a particular pin or a pin out that I wanted to see, I can have this.

_Signals: params:3_

_Source: [How to Design Electrical Routing & Harnesses in Siemens NX - Tutorial - PROLIM Tech Talk](https://www.youtube.com/watch?v=d2nNpW0Cq10) — channel `PROLIM Global Corporation`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `fasteners-toolbox` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation