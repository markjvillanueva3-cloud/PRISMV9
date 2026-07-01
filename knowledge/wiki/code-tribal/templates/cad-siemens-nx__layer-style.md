---
title: "CAD function template — siemens-nx / layer-style"
software: siemens-nx
function: layer-style
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / layer-style

**Software:** `siemens-nx` · **Function category:** `layer-style`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <layer-style> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.43)

> We'll put it in number three

We'll put it in number three. Finish. Select the wire. Simple enough. You've seen me do this three to four times already. Select. You know what? We'll select a different color. different color. different color. Next. Next. And we're good. So, now we've got this nice silver wire and we are good to go. And And And yep, good. yep, good. yep, good. So now I can update my form board. So let's say if I click on update, it goes over here and I can find discrepancies. So if I click on that, it says that it did find oh no discrepancies. H perhaps I have to save it first. Let me cancel out of here.

_Signals: camOps:1 · howto:5_

_Source: [How to Design Electrical Routing & Harnesses in Siemens NX - Tutorial - PROLIM Tech Talk](https://www.youtube.com/watch?v=d2nNpW0Cq10) — channel `PROLIM Global Corporation`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `layer-style` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation