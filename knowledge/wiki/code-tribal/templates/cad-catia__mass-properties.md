---
title: "CAD function template — catia / mass-properties"
software: catia
function: mass-properties
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — catia / mass-properties

**Software:** `catia` · **Function category:** `mass-properties`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <mass-properties> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.4)

> Not two body

Not two body. In a single part we create two different two different two different objects. So, it will calculate both. The center of gravity display on the model model model itself. You can see this is your center of gravity of gravity of gravity displayed here. If required, select customize to change the the displayed value. the the displayed value. the the displayed value. If you want to change the display value like if you want like if you want like if you want inertia matrix or not and say apply. Now, If I select again the inertia matrix G and okay. and okay. and okay.

_Signals: howto:5_

_Source: [CATIA V5 Analysis Tools Explained | Measure, Mass Properties & Inertia | Part 41](https://www.youtube.com/watch?v=W5LstlJkMXY) — channel `Enginuity Lab`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `mass-properties` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation