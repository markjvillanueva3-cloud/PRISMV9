---
title: "CAD function template — catia / drawing"
software: catia
function: drawing
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — catia / drawing

**Software:** `catia` · **Function category:** `drawing`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <drawing> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.49)

> clean and the reason behind that is is when I projected those curves you undo that I'm gonna redo that again projection

clean and the reason behind that is is when I projected those curves you undo that I'm gonna redo that again projection pick this this this and that put a Y component and apply what ends up happening is I have smoothing turned on and with the smoothing I'm saying okay I want to deviate so much and I have an interpolation which will do an exact or precise projection but with the smoothing you can see it's deviated if you don't want any deviation just turn that on that you're applying you'll notice that it's now perfect and tight on that mesh and select okay there are my curves so just be

_Signals: toolpath:2 · camOps:1 · howto:1_

_Source: [Catia V5 | Catia V6: Digitized Shape Editor (DSE) - Radial Sections to Curve](https://www.youtube.com/watch?v=dJPHEh3jcmk) — channel `Class A Surfacing`_

### Tip 2 (confidence 0.41)

> here I'm taking 360° I don't want 360° now I want only 90° then you can add the material in a circular Direction like th

here I'm taking 360° I don't want 360° now I want only 90° then you can add the material in a circular Direction like this this this 90 so here we are adding the material in a circular way see so here I give 360 D now you can use a thick profile also so I'll go with the 1 mm thickness I'll go with the F now you can give preview so here we'll be giving 5 mm thickness to our body let me increase it forur the 25 so we will add the thickness here when you use this Dynamic section view you understand the thick so next I'm going to remove the material so which is known as group I remove the

_Signals: params:2_

_Source: [Pad,pocket, shaft and groove command in catia sketch based features](https://www.youtube.com/watch?v=jDFTh7aT_MQ) — channel `ShivaShakti`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `drawing` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation