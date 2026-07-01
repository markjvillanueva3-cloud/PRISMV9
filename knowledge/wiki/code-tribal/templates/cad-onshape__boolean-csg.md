---
title: "CAD function template — onshape / boolean-csg"
software: onshape
function: boolean-csg
source: video-tribal-aggregation
tip_count: 3
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — onshape / boolean-csg

**Software:** `onshape` · **Function category:** `boolean-csg`
**Source:** aggregated from 3 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <boolean-csg> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.43)

> the catch use the report feature warning function to give a popup notification to the user notification to the user noti

the catch use the report feature warning function to give a popup notification to the user notification to the user notification to the user report feature warning takes in three arguments the context feature ID and the message you want to deliver enter a custom warning feature now when the Dome is inverted and the error is triggered a warning appears at the top use add debug entities to highlight The Loft part if the Boolean is successful nothing is highlighted if the Boolean fails the lofted part highlights in red warnings provide a pop-up notification but they do not prevent successful

_Signals: safety:4_

_Source: [Building a Complete Custom Feature (FeatureScript)](https://www.youtube.com/watch?v=yi06ZVDoevs) — channel `Onshape`_

### Tip 2 (confidence 0.41)

> depth to turn a Boolean into an opposite direction toggle you must use a UI hin add a UI hint to the Boolean parameter s

depth to turn a Boolean into an opposite direction toggle you must use a UI hin add a UI hint to the Boolean parameter so the user can reverse the direction of the Dome if needed enter opposite direction as the value in the part Studio test the feature dialogue first create a cylindrical boss to test on the query selection only allows a flat face face face selection each of the group boxes are labeled correctly and show the correct options underneath the start and end magnitude parameters hide when position is is is chosen the depth is a length parameter that has an opposite direction toggle

_Signals: camOps:1 · howto:3_

_Source: [Building a Complete Custom Feature (FeatureScript)](https://www.youtube.com/watch?v=yi06ZVDoevs) — channel `Onshape`_

### Tip 3 (confidence 0.41)

> body as its arguments a subtraction Boolean also requires another parameter for the Target create a new constant named s

body as its arguments a subtraction Boolean also requires another parameter for the Target create a new constant named selected selected selected part set selected part equal to the result of a q owner body function Q owner body returns a query containing the bodies that any of the given entities belong to set selected face as the argument in the subtraction Boolean set the tools to Loft part create a new parameter named targets and set it to selected part if opposite direction ction has not been toggled the op Boolean should execute a execute a execute a union The Loft part and selected part

_Signals: howto:6_

_Source: [Building a Complete Custom Feature (FeatureScript)](https://www.youtube.com/watch?v=yi06ZVDoevs) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `boolean-csg` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation