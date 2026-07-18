---
title: "CAD function template — siemens-nx / sketch-3d"
software: siemens-nx
function: sketch-3d
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / sketch-3d

**Software:** `siemens-nx` · **Function category:** `sketch-3d`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <sketch-3d> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.42)

> So, we can model in a wire loom or a bundle

So, we can model in a wire loom or a bundle. We can specify the overstock which will allow you to define you know uh three types of overstock. So you've got flagged, sleeved and wrapped. And there are four application methods. You've got entire segments. In fact, we'll just open up this overstock. So yeah, you've got three uh where is it? Yeah, you've got wrapping settings, which is your overap spiral. You got different wrap types. You got orientations as well. And of course, you've got coverable stock.

_Signals: toolpath:1 · howto:2_

_Source: [How to Design Electrical Routing & Harnesses in Siemens NX - Tutorial - PROLIM Tech Talk](https://www.youtube.com/watch?v=d2nNpW0Cq10) — channel `PROLIM Global Corporation`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `sketch-3d` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation