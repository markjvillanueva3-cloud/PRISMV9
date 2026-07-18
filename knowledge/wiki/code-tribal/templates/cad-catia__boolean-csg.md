---
title: "CAD function template — catia / boolean-csg"
software: catia
function: boolean-csg
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — catia / boolean-csg

**Software:** `catia` · **Function category:** `boolean-csg`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <boolean-csg> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> combine them now it is with the trim command you select one of the the shapes you select the other one you can select mo

combine them now it is with the trim command you select one of the the shapes you select the other one you can select more of these and it will just trim them all and you can already see that it basically cut through these uh through this middle part here and it made a combination of the shape and you hit hit hit okay and now because you have a sharp corner here sharp edge you can use the edge fileld command which works exactly as the one in body you select the edges select the value and hit okay okay okay good good good now you insert another geometrical set and here you need to define the

_Signals: howto:7_

_Source: [CATIA V5 Beginner Tutorial - Surface Design / GSD (Part 4)](https://www.youtube.com/watch?v=1fd9IMhhCfU) — channel `CAD Masterclass`_

### Tip 2 (confidence 0.4)

> seamless integration across all seamless integration across all disciplines within the 3d experience platform the part c

seamless integration across all seamless integration across all disciplines within the 3d experience platform the part can then be comprehensively refined validated and comprehensively refined validated and comprehensively refined validated and completed collaboratively and in context simulations can run to a share part strengths and deformations or within tolerance real geometry can be rapidly created using CATIA z' integrated modeling tools to define cross section profiles and then seamlessly combine the geometry to create definable and modifiable specification driven modifiable

_Signals: camOps:1 · howto:2_

_Source: [3DEXPERIENCE CATIA Function-Driven Generative Designer](https://www.youtube.com/watch?v=ZE2I2GKscH0) — channel `InceptraLLC`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `boolean-csg` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation