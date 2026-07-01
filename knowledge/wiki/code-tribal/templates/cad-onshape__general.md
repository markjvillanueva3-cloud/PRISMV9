---
title: "CAD function template — onshape / general"
software: onshape
function: general
source: video-tribal-aggregation
tip_count: 5
videos_covered: 4
generated_at: 2026-05-27
---

# CAD function template — onshape / general

**Software:** `onshape` · **Function category:** `general`
**Source:** aggregated from 5 video tribal tips across 4 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <general> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 5 by confidence)

### Tip 1 (confidence 0.43)

> connector down here connector down here um make that 600 Newtons I could put pounds force or any other unit that I uh th

connector down here connector down here um make that 600 Newtons I could put pounds force or any other unit that I uh that is appropriate for here and now we have have have um you know the the check mark here saying yes we're ready to look at results so let's do that so as the results start coming in here again you know what I would do is um is look at the deformation so this looks like it's again I've got the load going in the right direction that's always good that's always a good sign sign sign um and let's uh let's put back to stresses stresses stresses we're nearly there again I can play

_Signals: safety:2_

_Source: [Onshape Simulation Overview and Demo](https://www.youtube.com/watch?v=71WdbUIsRRM) — channel `Onshape`_

### Tip 2 (confidence 0.43)

> section describes the conventions as well as what functions expressions and what functions expressions and what function

section describes the conventions as well as what functions expressions and what functions expressions and what functions expressions and statements are valid within the language Additionally the custom features page contains many highquality completed contains many highquality completed contains many highquality completed scripts that you can view use copy and modify it is easy to get started building a custom feature in a new document select the plus to insert a new element select create feature element select create feature element select create feature Studio an empty feature studio will

_Signals: howto:8_

_Source: [Introduction to Featurescript](https://www.youtube.com/watch?v=JOyQ9LfpuY8) — channel `Onshape`_

### Tip 3 (confidence 0.42)

> goes underneath into that Servo and then the last Servo goes from the wrist uh to the claws um at the top there so it's

goes underneath into that Servo and then the last Servo goes from the wrist uh to the claws um at the top there so it's a nice little series of of roots of of wires um that are going to be plugged in they're all around 140 mm long or something like that they they come with the servo the idea with this kit is that you can build everything with just the 3D printed parts and I spent 12 hours printing these um you can just do it with your own printer create these parts and then you buy the servos and they come with a bunch of screws and wires which are the only things you need to put the whole

_Signals: camOps:1 · params:1 · howto:1_

_Source: [Using Onshape's new Routing curve for various 3D curve workflows](https://www.youtube.com/watch?v=8shIxZ4eBXQ) — channel `Greg Brown - Onshape`_

### Tip 4 (confidence 0.41)

> filter selector declares what keywords would cause your feature to be retained in the feature list filter the feature na

filter selector declares what keywords would cause your feature to be retained in the feature list filter the feature name template allows allows you to change the default naming convention used for new features in the feature list UI hint provides additional UI options the option no preview provided ensures that the preview slider is removed from the feature dialogue this means as the user is entering inputs the feature always shows the final result without the option to adjust the preview most UI hints are reserved for specific parameters within the precondition or for on shapes internal

_Signals: safety:1 · howto:2_

_Source: [Building a Complete Custom Feature (FeatureScript)](https://www.youtube.com/watch?v=yi06ZVDoevs) — channel `Onshape`_

### Tip 5 (confidence 0.4)

> a feature Studio within a document custom features are useful in many ways you can use them to customize a standard feat

a feature Studio within a document custom features are useful in many ways you can use them to customize a standard feature UI automate repetitive tasks create specialized repetitive tasks create specialized repetitive tasks create specialized geometry or automatically set variables or custom properties in or custom properties in or custom properties in Parts it's important to note that custom features can only be used in part Studios and only affects the part Studio where it is placed it cannot do anything outside the part Studio it is executed in such as create new part Studios drawings or

_Signals: howto:5_

_Source: [Introduction to Featurescript](https://www.youtube.com/watch?v=JOyQ9LfpuY8) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `general` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation