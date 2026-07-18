---
title: "CAD function template — solidworks / simulation-fea"
software: solidworks
function: simulation-fea
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — solidworks / simulation-fea

**Software:** `solidworks` · **Function category:** `simulation-fea`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <simulation-fea> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.41)

> my goal to reduce my mass by 50% then I will add constraints to keep material in the areas that I want to be unaffected

my goal to reduce my mass by 50% then I will add constraints to keep material in the areas that I want to be unaffected by the reduction of material now we will run the study and get our optimized geometry based on the structure we started with the areas to avoid removing material and the goals the study gives us a structure that has a reduced weight we can save the new part out as a mesh body and STL for 3d printing or we can use it to retrace a new solid SolidWorks 2018 does have a few mesh editing tools for cleaning up this model and we can use that if we want to go directly to a 3d print

_Signals: camOps:2_

_Source: [SOLIDWORKS Topology Optimization](https://www.youtube.com/watch?v=I8Ts_Nvw9Sg) — channel `TPM`_

### Tip 2 (confidence 0.4)

> Let's go here with aspect ratio like this

Let's go here with aspect ratio like this. Now we can see here you can go right click go right click go right click edit definition chart options show minimum show maximum. Let's click okay. So the minimum is here as you can see the maximum is here. Look at this one side the ratio the one side the other side 12. This is not good because this will not give us a good results. Right? We want aspect ratio below five. That means that on these edges we have to decrease the size of the element. Okay. Now let's go here to the mesh again. Let's go create a mesh.

_Signals: howto:5_

_Source: [SolidWorks Simulation Tutorial: Static Analysis for Beginners (FEA)](https://www.youtube.com/watch?v=Ys0eT57DzT4) — channel `SolidWorks With Alen`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `simulation-fea` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation