---
title: "CAD function template — onshape / parametric"
software: onshape
function: parametric
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — onshape / parametric

**Software:** `onshape` · **Function category:** `parametric`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <parametric> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> areas for the inputs and actions in the constant change my feature to cube as well the precondition is where all user in

areas for the inputs and actions in the constant change my feature to cube as well the precondition is where all user inputs are defined select inside and select the length parameter from the feature parameters pull down we will go into more detail on other parameters in a later a later a later video change my length to side length change the definition identify fire to side length as well move the cursor into the body where you define the features actions select F cuboid under the operation functions menu this function takes in two inputs for the opposite corners of the cuboid shape multiply

_Signals: howto:7_

_Source: [Introduction to Featurescript](https://www.youtube.com/watch?v=JOyQ9LfpuY8) — channel `Onshape`_

### Tip 2 (confidence 0.4)

> when the value is a real number within the bounds specified set the bounds to positive real bounds a full list of differ

when the value is a real number within the bounds specified set the bounds to positive real bounds a full list of different types of bounds is in the standard Library documentation create a similar documentation create a similar documentation create a similar annotation for the end magnitude parameter groups allow you to group inputs into collapsible groups this helps simplify large dialogues with several inputs add parameter groups for start and end move the appropriate parameters inside each statement make sure the group name is set to a logical name this is what will show in the group

_Signals: howto:5_

_Source: [Building a Complete Custom Feature (FeatureScript)](https://www.youtube.com/watch?v=yi06ZVDoevs) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `parametric` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation