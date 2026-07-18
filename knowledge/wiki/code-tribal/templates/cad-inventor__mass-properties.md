---
title: "CAD function template — inventor / mass-properties"
software: inventor
function: mass-properties
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — inventor / mass-properties

**Software:** `inventor` · **Function category:** `mass-properties`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <mass-properties> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.42)

> can be last material is probably more important than Mass material also gives us us us density indirectly so let's click

can be last material is probably more important than Mass material also gives us us us density indirectly so let's click on move move move up and then hit up and then hit up and then hit apply now notice that I forgot to change my materials from generic to say whatever these some of these parts are made out of um I remember the T9 bed in actuality Project Lead the Way is where I got these files from canvas so they never changed them so to change those go in somewhere where you can edit your part file I'm just going to open up the part file itself so I've got it Chrome plated but I'm just

_Signals: safety:1 · howto:3_

_Source: [7.5 Exploded View Drawing with Balloons and Parts List - Inventor](https://www.youtube.com/watch?v=llBTNdtrb6U) — channel `Paul Anhalt`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `mass-properties` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation