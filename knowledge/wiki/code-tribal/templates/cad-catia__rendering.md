---
title: "CAD function template — catia / rendering"
software: catia
function: rendering
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — catia / rendering

**Software:** `catia` · **Function category:** `rendering`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <rendering> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> click on the split command on the model using the robot you can now assemble the surfaces in two clicks by selecting the

click on the split command on the model using the robot you can now assemble the surfaces in two clicks by selecting the two parts and clicking on the assembly command on the 3D when you need to quickly modify a design to adjust some parameters a new immersive tool for navig ation and addition is available in the context toolbar it simplifies understanding of the model meaning there is no need to use the specification tree it allows you to see and select this current the parents and children of the current feature in other words visualize the list of features that modified the selected face

_Signals: camOps:1 · howto:4_

_Source: [CATIA 3DEXPERIENCE | Advanced Surface Design](https://www.youtube.com/watch?v=RT24Yj5thd8) — channel `CATIA`_

### Tip 2 (confidence 0.41)

> hello and welcome back to the new tutorial in this video I'm going to design this part using generative shape design it

hello and welcome back to the new tutorial in this video I'm going to design this part using generative shape design it is a Surface design tool go to start shape select generative shape Design This is the graphical interface of generative shape design it is similar to part design workbench to part design workbench to part design workbench before going to the before going to the before going to the design need to change some setting so go to Tool select options display options display options display visualization select this surface visualization select this surface visualization select this

_Signals: howto:6_

_Source: [CATIA V5 Tutorial: Generative Shape Design (GSD) | The Product Designer |](https://www.youtube.com/watch?v=DTiJotXnGYU) — channel `The Product Designers`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `rendering` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation