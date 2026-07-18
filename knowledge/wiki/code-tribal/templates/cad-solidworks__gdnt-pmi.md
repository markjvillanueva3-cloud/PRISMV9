---
title: "CAD function template — solidworks / gdnt-pmi"
software: solidworks
function: gdnt-pmi
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — solidworks / gdnt-pmi

**Software:** `solidworks` · **Function category:** `gdnt-pmi`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <gdnt-pmi> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.72)

> fluid end mill feeds and speeds are going to be exactly the same as they were in the last two operations we're going to

fluid end mill feeds and speeds are going to be exactly the same as they were in the last two operations we're going to come in and we're actually going to rough this out or we're going to do a contour pass in this pocket here so we're going to leave some allowance leave some allowance leave some allowance and the reason why we have to do a a contour pass contour pass contour pass in here is because our cutter won't actually fit the half inch end mill won't actually won't actually won't actually fit into these tight radii so we're going to use a smaller end mill to go in and clear those out

_Signals: toolpath:5 · camOps:4_

_Source: [SOLIDWORKS CAM: TOOL CHANGES AND ADDING TOOL PATHS](https://www.youtube.com/watch?v=-CJtW6ORjDw) — channel `Professor Cameron`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `gdnt-pmi` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation