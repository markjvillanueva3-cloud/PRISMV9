---
title: "CAD function template — solidworks / history-tree"
software: solidworks
function: history-tree
source: video-tribal-aggregation
tip_count: 3
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — solidworks / history-tree

**Software:** `solidworks` · **Function category:** `history-tree`
**Source:** aggregated from 3 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <history-tree> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.44)

> So we have here features all fillets chamers holes extrudes right feature parameter and we can go find now and we see th

So we have here features all fillets chamers holes extrudes right feature parameter and we can go find now and we see that we can remove fillet one and we can just click here suppress or we can go here to our model and we can suppress it manually. Right? Right. So basically I can just click here suppress and they're gone. Right? Also you can go here to the model. You can go now onsuppress onsuppress onsuppress for example. You can click unsuppress here. Um and you can just go basically here to the model and you can go here to the fillet one and we can also suppress here.

_Signals: camOps:2 · howto:3_

_Source: [SolidWorks Simulation Tutorial: Static Analysis for Beginners (FEA)](https://www.youtube.com/watch?v=Ys0eT57DzT4) — channel `SolidWorks With Alen`_

### Tip 2 (confidence 0.4)

> Speaker 1: Hi and welcome my name's Tom and today we'll be looking at how to get started with SOLIDWORKS CAM

Speaker 1: Hi and welcome my name's Tom and today we'll be looking at how to get started with SOLIDWORKS CAM. SOLIDWORKS CAM is kept directly with inside SOLIDWORKS and you can see we have an added tree and toolbar to help us do CAM upon our CAD models. For the toolbar you can see, we have buttons from left to right, and the workflow is very much working from left to right from definement machine to post-processing at the bottom in the tree we have what's called the CAM feature tree. This is where SOLIDWORKS CAM will recognize features from your model at an apply a tool path to them.

_Signals: toolpath:1_

_Source: [Getting Started with SOLIDWORKS CAM - Part 1](https://www.youtube.com/watch?v=2-SvDm4eZpc) — channel `TriMech Group`_

### Tip 3 (confidence 0.4)

> make like this now right click on Tab and check there is a cam SolidWorks cam available or not if not then either go to

make like this now right click on Tab and check there is a cam SolidWorks cam available or not if not then either go to tools or simply open from here add ins and here you will find option SolidWorks cam 201 don't check this one otherwise your cam tab will always be open so I am going to choose this one okay now let's see the tab will come here like the tab is come here if you if you if you open your open your open your design manager tree you will find here three options three options three options now first one is feature tree the third one the second one the middle one is Operation tree

_Signals: safety:1 · howto:1_

_Source: [SolidWorks CAM introduction Exercise-1 Mill Operation](https://www.youtube.com/watch?v=GMZO7nGZHHQ) — channel `CAD CAM TUTORIAL BY MAHTABALAM`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `history-tree` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation