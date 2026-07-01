---
title: "CAD function template — generic / routing"
software: generic
function: routing
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — generic / routing

**Software:** `generic` · **Function category:** `routing`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <routing> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.44)

> adjusted or frankly particularly well made frankly particularly well made frankly particularly well made but you can see

adjusted or frankly particularly well made frankly particularly well made frankly particularly well made but you can see that we're easily within the travel precision of the compound there there there so that's certainly close enough that you could turn a morse taper it may or may not work with that amount of air in it but you're certainly within surface grinding range then if you wanted to then grind in the perfect fitting morse taper for this next trick go ahead and set your compound parallel to the cross slide and now we have two hand wheels that control the tool in the same way why would

_Signals: toolpath:1 · camOps:1 · howto:1_

_Source: [Lathe Compound (Top Slide) Tricks!](https://www.youtube.com/watch?v=6AQzDVic-hk) — channel `Blondihacks`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `routing` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation