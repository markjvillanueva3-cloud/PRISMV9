---
title: "CAD function template — catia / reverse-eng"
software: catia
function: reverse-eng
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — catia / reverse-eng

**Software:** `catia` · **Function category:** `reverse-eng`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <reverse-eng> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.4)

> so this is quite well quite well quite well aligned we see the top we see also the bottom if you want to you can further

so this is quite well quite well quite well aligned we see the top we see also the bottom if you want to you can further adjust this using the adjust this using the adjust this using the compass to do that you can select the object go over here on the compass make it snap automatically to selected and afterwards if you're going to select the point Cloud you're going to have the compass with green that means that you can start um to rotate this I high recommend that you're going to use some U rotation increments over here which will be quite small so for example 0.5 and afterwards you can just

_Signals: howto:5_

_Source: [CATIA V5 - Reverse Engineering (Curve from 3D scan)](https://www.youtube.com/watch?v=oa-rP9PD7Tw) — channel `3D Comparison`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `reverse-eng` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation