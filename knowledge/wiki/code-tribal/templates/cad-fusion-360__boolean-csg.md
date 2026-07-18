---
title: "CAD function template — fusion-360 / boolean-csg"
software: fusion-360
function: boolean-csg
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / boolean-csg

**Software:** `fusion-360` · **Function category:** `boolean-csg`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <boolean-csg> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> this while looking at the front view so we don't select any other faces we'll make this 35° and then repeat the process

this while looking at the front view so we don't select any other faces we'll make this 35° and then repeat the process for the top row making it 25° we now have a relatively complex Twisted base created with a few simple steps using t-splines this can be a lot of fun to experiment with just make sure faces don't intersect with each other if faces intersect the model will not convert When selecting finish form in the tool bar bar we'll end up with a Surface body once again so let's look at how to prepare both of these base designs for 3D printing firstly if we zoom in on the top or bottom

_Signals: camOps:2 · howto:1_

_Source: [Fusion T-splines are easy! | Day 27 of Learn Fusion 360 in 30 Days - 2024 EDITION](https://www.youtube.com/watch?v=NqjbJZ2ekRU) — channel `Product Design Online`_

### Tip 2 (confidence 0.41)

> materials are yet another key consideration that the program will combine with our other rules to come up with the viabl

materials are yet another key consideration that the program will combine with our other rules to come up with the viable solutions because we're planning on using a metal 3d printer we can apply some various types of metal activate the study materials feature and you'll see it looks similar to our appearances or physical properties appearances or physical properties appearances or physical properties dialog let's go ahead and right-click on the aluminum material and delete it we want to explore some different stainless steel options so I'm going to first make sure that the library is set to

_Signals: camOps:1 · howto:3_

_Source: [Free Generative Design — Beginner Fusion 360 Tutorial](https://www.youtube.com/watch?v=PSSt8wswNJQ) — channel `Product Design Online`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `boolean-csg` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation