---
title: "CAD function template — onshape / gdnt-pmi"
software: onshape
function: gdnt-pmi
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — onshape / gdnt-pmi

**Software:** `onshape` · **Function category:** `gdnt-pmi`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <gdnt-pmi> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.41)

> have the length of the curve so 537 mm if you wanted to try and say get this to H 600 um because that's what the Builder

have the length of the curve so 537 mm if you wanted to try and say get this to H 600 um because that's what the Builder wants you to do then you could you know experiment a little bit oops just by moving these vertices around and you can get it pretty close pretty quickly uh well that's pretty close and um I had it closer before and so you know now you've got your 600 mm um runner from here now of course it's going to be a little trickier when you have other ones to fit in and so that's why it's a nice idea to be able to do these things um sort of progressively in interactively I'm trying to

_Signals: params:2_

_Source: [Using Onshape's new Routing curve for various 3D curve workflows](https://www.youtube.com/watch?v=8shIxZ4eBXQ) — channel `Greg Brown - Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `gdnt-pmi` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation