---
title: "CAD function template — fusion-360 / weldments"
software: fusion-360
function: weldments
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / weldments

**Software:** `fusion-360` · **Function category:** `weldments`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <weldments> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.4)

> today I'm going to show you how to create an optimized cut list using Fusion 360 in under a minute head to the export me

today I'm going to show you how to create an optimized cut list using Fusion 360 in under a minute head to the export menu select the obj format wait a few moments now you can head over to cut list evolution to cut list evolution to cut list evolution open up the Imports panel click on the fusion 360 button fusion 360 button fusion 360 button now all you need to do is drag the obj file into the area here you can scroll down and there'll be a preview of your parts preview of your parts preview of your parts if you're happy you can click import you can dismiss the message and then open up the

_Signals: howto:5_

_Source: [Create an optimized cut list from Autodesk Fusion 360](https://www.youtube.com/watch?v=k8nrywxVEKM) — channel `SmartCut`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `weldments` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation