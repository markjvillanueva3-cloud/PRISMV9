---
title: "CAD function template — catia / routing"
software: catia
function: routing
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — catia / routing

**Software:** `catia` · **Function category:** `routing`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <routing> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.49)

> product we're going to see that that piping route will be better fitted over be better fitted over be better fitted over

product we're going to see that that piping route will be better fitted over be better fitted over be better fitted over there let's see some additional um input over here for over here for over here for routes so the next one will be slope so this will allow us to add an angle which we're going to have over there so again I can select that I can move this and I can also we're going to see that the values will be minus values will be minus values will be minus 3535 3535 3535 mm if I will just go within an A View like like like this I will press tab in order to go over here for the slope so in

_Signals: toolpath:2 · params:1 · howto:1_

_Source: [CATIA V5 - Piping Design Route a Run](https://www.youtube.com/watch?v=8wDXVXlQE0U) — channel `3D Comparison`_

### Tip 2 (confidence 0.41)

> hello welcome to this short more delicate demo in this demo you'll see how to generate a Metallica model from a CATIA pi

hello welcome to this short more delicate demo in this demo you'll see how to generate a Metallica model from a CATIA piping model and how to drive it using different madela kamada 'ls this is the plant layout designed in the CATIA piping and tubing 3d design application [Music] [Music] to showcase this process let's look at a small part small part small part this is simple logical architecture of the system now let's go inside the main model it's important to perform mapping between 3d pipe objects and related moe delicate classes mapping tables contains mapping information for particular use

_Signals: camOps:2_

_Source: [CATIA Mechatronic Systems Engineer - Tubing / Piping Modelica Generation](https://www.youtube.com/watch?v=XuWpuL7uu-w) — channel `CATIA`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `routing` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation