---
title: "CAD function template — onshape / feature-3d"
software: onshape
function: feature-3d
source: video-tribal-aggregation
tip_count: 3
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — onshape / feature-3d

**Software:** `onshape` · **Function category:** `feature-3d`
**Source:** aggregated from 3 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <feature-3d> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.47)

> hole that's going to be 9 mm and that is going to be at a distance from the floor here you can see I can pick that cente

hole that's going to be 9 mm and that is going to be at a distance from the floor here you can see I can pick that center point and I can just pick the top plane from the tree and that way I can get that Dimension without having to go and find the top plane that's going to be 77 and then that's going to be uh removed and we'll make that through all and then we can finish up here with a fillet of 7 mm on that top Edge there there we go and now we are ready to take this thing and mirror it so this is going to be mirror we're going to mirror the entire part about this face here and this is going

_Signals: camOps:2 · params:2_

_Source: [Onshape Sheet Metal Tutorial – FLARED BRACKET - LIVE!](https://www.youtube.com/watch?v=cShoxXtbUbk) — channel `Too Tall Toby`_

### Tip 2 (confidence 0.43)

> parts of the script from script from script from executing the parts list shows two parts instead of one this is because

parts of the script from script from script from executing the parts list shows two parts instead of one this is because the loft is successful but not the Boolean usually when a custom feature errors you do not want it to generate anything in all comment out the warning and debug lines enter throw followed by the regen error function there are many different inputs allowed for the regen error function for this feature we will add an error string faulty parameter and entities enter the warning depth and Loft part for the three arguments the depth must be entered as an array the regen error

_Signals: safety:2_

_Source: [Building a Complete Custom Feature (FeatureScript)](https://www.youtube.com/watch?v=yi06ZVDoevs) — channel `Onshape`_

### Tip 3 (confidence 0.42)

> and click the plus icon to add it to your toolbar to insert the fill pattern feature click the icon and activate the fea

and click the plus icon to add it to your toolbar to insert the fill pattern feature click the icon and activate the feature dialog next select the c geometry creating a selection is an efficient way to select multiple faces now pick a target face keep in mind target faces must be planar select a linear edge a planar face a reference plane or a mate connector to define the pattern direction select the shape to generate either a square or a hexagonal pattern enter a value to control the center to center spacing between instances optionally enter a boundary value this distance enforces

_Signals: howto:7_

_Source: [Tech Tip: How to use the Fill Pattern Custom Feature](https://www.youtube.com/watch?v=7QKdqy8cnSg) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `feature-3d` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation