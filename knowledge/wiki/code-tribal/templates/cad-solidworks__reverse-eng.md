---
title: "CAD function template — solidworks / reverse-eng"
software: solidworks
function: reverse-eng
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — solidworks / reverse-eng

**Software:** `solidworks` · **Function category:** `reverse-eng`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <reverse-eng> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.46)

> our bindings we imported our scan data into solidworks which has several useful tools that helped us create models from

our bindings we imported our scan data into solidworks which has several useful tools that helped us create models from our scan before we could start modeling the bindings we needed to establish the critical surfaces from our scan data mesh data can be really difficult to work with and cannot be edited like regular cad geometry regular cad geometry regular cad geometry additionally the surfaces that we created are still rough created are still rough created are still rough so we needed to create new smooth parametric surfaces to base our model on this is where the slicing tool came in we

_Signals: camOps:3 · howto:2_

_Source: [SOLIDWORKS 2021: Reverse Engineering 3D Scanned Models With Mesh Data](https://www.youtube.com/watch?v=pXXDpwbKlC0) — channel `Hawk Ridge Systems`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `reverse-eng` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation