---
title: "CAD function template — inventor / derived-parts"
software: inventor
function: derived-parts
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — inventor / derived-parts

**Software:** `inventor` · **Function category:** `derived-parts`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <derived-parts> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.4)

> turn off the visibility of the skeleton save my file I want these four corners to be mitered and so I'll select miter an

turn off the visibility of the skeleton save my file I want these four corners to be mitered and so I'll select miter and I'll select these two components I could also put a gap in here when we make parts in the real world we can't cut exact lengths so if we want to weld this thing up to be perfectly square then we need to cut some of the parts a little bit shorter so that we have some distance to play with in squaring up the part because if we when we cut apart some are gonna be a little bit longer someone are gonna be a little bit shorter so we need our longest part to allow us a little bit

_Signals: camOps:1 · howto:2_

_Source: [Inventor Weldment Tutorial   Frame Generator](https://www.youtube.com/watch?v=B8fHxeCi8Mk) — channel `The CADWhisperer`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `derived-parts` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation