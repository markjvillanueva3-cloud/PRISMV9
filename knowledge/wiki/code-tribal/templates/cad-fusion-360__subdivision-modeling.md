---
title: "CAD function template — fusion-360 / subdivision-modeling"
software: fusion-360
function: subdivision-modeling
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / subdivision-modeling

**Software:** `fusion-360` · **Function category:** `subdivision-modeling`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <subdivision-modeling> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.42)

> modifying our pipe so that's one way to turn it into a body that you can continue modifying but I'll go back into T spli

modifying our pipe so that's one way to turn it into a body that you can continue modifying but I'll go back into T spline mode and another method is to basically double click select these edges and we're basically going to be closing these edges so in order to do that we go to modify and we go to full hole and you'll see yours won't look like that immediately because I have these settings that were in your previously so you just want to change this to a reduced star and you want to make sure that main T and maintain crease edges is checked but it was probably uncheck now and it looks like

_Signals: camOps:1 · howto:4_

_Source: [Autodesk Fusion 360 - How To Create Wires, Cables & Tubing](https://www.youtube.com/watch?v=W5xcrFrxanc) — channel `Travis Davids`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `subdivision-modeling` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation