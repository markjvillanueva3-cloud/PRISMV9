---
title: "CAD function template — inventor / generative"
software: inventor
function: generative
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — inventor / generative

**Software:** `inventor` · **Function category:** `generative`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <generative> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.47)

> to your model tab at any time and i can dig out these origin planes or any other work plane that's in here but i happen

to your model tab at any time and i can dig out these origin planes or any other work plane that's in here but i happen to have a plane in the middle of the part right there i can select it right out of the model browser and then go back to cam and finish what i was doing now your options here keep the original tool path i do want to keep the originals originals originals because i want both sides an operation order order order since i have five different operations i can preserve the order which basically says it's going to completely finish one side before it does the mirror i can do order

_Signals: toolpath:1 · camOps:2 · howto:1_

_Source: [Autodesk Inventor CAM   Work Smarter, Not Harder](https://www.youtube.com/watch?v=T-YE8SmmnSE) — channel `Hagerman & Company`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `generative` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation