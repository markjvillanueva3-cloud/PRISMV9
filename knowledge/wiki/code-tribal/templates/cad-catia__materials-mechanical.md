---
title: "CAD function template — catia / materials-mechanical"
software: catia
function: materials-mechanical
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — catia / materials-mechanical

**Software:** `catia` · **Function category:** `materials-mechanical`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <materials-mechanical> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.41)

> We use them in general in uh planes

We use them in general in uh planes. in uh planes. in uh planes. um in place for the to have a good resistance to uh black chain. So this is it. Here we have orthropic but in 3D same as uh oropic for 2D but with a third direction. And here we have anotropic materials anotropic materials anotropic materials that is not isotropic medulus and shadurus in every direction. Here we can do it for it is for the katia module of composite materials and here it is for the drawing if uh or for example for composite materials will return into analysis. return into analysis. return into analysis.

_Signals: camOps:2_

_Source: [How to Use CATIA V5 FEA Simulation | Generative Structural Analysis](https://www.youtube.com/watch?v=KESyiVmi-YU) — channel `SB CAD CAM`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `materials-mechanical` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation