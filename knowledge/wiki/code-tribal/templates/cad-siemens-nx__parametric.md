---
title: "CAD function template — siemens-nx / parametric"
software: siemens-nx
function: parametric
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / parametric

**Software:** `siemens-nx` · **Function category:** `parametric`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <parametric> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.44)

> we'll select Square tu tubing and click the desired cage element structure designer is rules based so you can specify th

we'll select Square tu tubing and click the desired cage element structure designer is rules based so you can specify the initial connection type and member orientation notice miters are added to the top and butt connections to the interior should you want to override the initial configuration pick a corner and change it Corner types range from none smart extend miter butt cope and match cope here we'll change two connections to Smart extend leaving an open end we'll cap this off later all all members and Corners are fully associative to the cage so if you change its size the 3D model will

_Signals: camOps:1 · howto:6_

_Source: [NX Structure Designer - Webinar](https://www.youtube.com/watch?v=dc01FU7ErxY) — channel `Emixa Industry Solutions`_

### Tip 2 (confidence 0.44)

> nx okay and if i go in expression by pressing ctrl e i will be able to see that value okay and here this particular opti

nx okay and if i go in expression by pressing ctrl e i will be able to see that value okay and here this particular option will creates an associative geometry geometry geometry okay will create an associative geometry to the major feature so what this is going to do is going to create a major feature and this will create a geometry where this particular feature is located so if you don't turn this thing on and if you only turn this thing on it will be a non-associative measurement now the problem with non-associative measurement problem with non-associative measurement problem with

_Signals: camOps:2 · howto:3_

_Source: [CENTER OF MASS WITH ASSEMBLY ARRANGEMENT | SIEMENS NX](https://www.youtube.com/watch?v=zYQtoaLuIow) — channel `CAD CUBE 360`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `parametric` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation