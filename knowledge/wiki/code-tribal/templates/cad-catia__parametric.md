---
title: "CAD function template — catia / parametric"
software: catia
function: parametric
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — catia / parametric

**Software:** `catia` · **Function category:** `parametric`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <parametric> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.5)

> In the user section two, when I go to the parameters, to the parameters, to the parameters, here also, I can increase th

In the user section two, when I go to the parameters, to the parameters, to the parameters, here also, I can increase the parameter to 30 mm. to 30 mm. to 30 mm. Here, it's 30 mm and here, let's say, 10 mm as it is or increase to 15 mm. And preview. And preview. And preview. Okay. Now, you can see my this section and this section is created. Also, created. Also, created. Also, here in the re-limitations, both re-limited on start section and re-limited on end section is activated. If I remove this and preview, then it will continue till this the end of our section.

_Signals: params:6_

_Source: [CATIA V5 Adaptive Sweep Tutorial 🔥 Advanced Surface Modeling in GSD | Part 66](https://www.youtube.com/watch?v=qFAjBPcHc6E) — channel `Enginuity Lab`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `parametric` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation