---
title: "CAD function template — fusion-360 / mass-properties"
software: fusion-360
function: mass-properties
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / mass-properties

**Software:** `fusion-360` · **Function category:** `mass-properties`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <mass-properties> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.42)

> library you can see that there is a very very long list of printers that are available right now I'm going to the recent

library you can see that there is a very very long list of printers that are available right now I'm going to the recent ones this is the my personal printer here so I'll go ahead and pick it I'll select it you can see here that I've got now kind of like the print bed laying there and the print volume kind of sitting there in a in a box now for the print settings I'll select the button there and it will give me a dialogue box where I'm able to pick from different presets or maybe things that I've created or utilized uh I'm going to set this pla 1.75 mm4 nozzle I'm going to select that I'm

_Signals: params:1 · howto:4_

_Source: [Fusion 360 Additive Manufacturing](https://www.youtube.com/watch?v=tuBe_pbS4Cs) — channel `3DSteve`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `mass-properties` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation