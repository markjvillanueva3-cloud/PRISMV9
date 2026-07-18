---
title: "CAD function template — fusion-360 / parametric"
software: fusion-360
function: parametric
source: video-tribal-aggregation
tip_count: 4
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / parametric

**Software:** `fusion-360` · **Function category:** `parametric`
**Source:** aggregated from 4 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <parametric> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 4 by confidence)

### Tip 1 (confidence 0.43)

> no units and it it comes in as millimeters so this isn't going to work we have to cancel it out and we have to always be

no units and it it comes in as millimeters so this isn't going to work we have to cancel it out and we have to always be sure that we are using the correct units so again p a t i width and there's no way for us to really go back and edit um completely edit the expression to where we can change those units at least i don't believe there is so we want to make sure that we just get it right here so again plate width divided by 50 millimeters close the brackets brackets brackets so you can see here if i click on the expression i can edit that but if i click on the units i'm not able to change

_Signals: safety:1 · howto:4_

_Source: [Using Parameters to Update Patterns in Fusion 360 #Fusion360 #Patterns #Parameters #ParametricDesign](https://www.youtube.com/watch?v=-BPcktQwIIY) — channel `Learn Everything About Design`_

### Tip 2 (confidence 0.42)

> If you're not using parameters in Fusion360 you're missing out a lot

If you're not using parameters in Fusion360 you're missing out a lot. With them, you can quickly resize your model and see the changes happening in real time. And all you'll be doing is changing dimensions in a table. It works like this. Go to Modify - Change parameters. Here you can create new parameter and assign it a value. You can then use this parameter whenever you're defining dimensions in a sketch or when you're using tools like extrude or chamfer. And you can even do basic math with them. For example, you can define that an edge should be thickness*2 long.

_Signals: camOps:1 · howto:4_

_Source: [Parametric modeling in Fusion360 explained in 40 seconds + detailed tutorial with example](https://www.youtube.com/watch?v=3GQHaYdmULs) — channel `Prusa 3D`_

### Tip 3 (confidence 0.41)

> welcome to day 19 of learn Fusion 360 in 30 days I'm Kevin Kennedy and today we'll look at creating user parameters copy

welcome to day 19 of learn Fusion 360 in 30 days I'm Kevin Kennedy and today we'll look at creating user parameters copy and pasting components and more as we create a parametric box in Fusion 360 activate the change parameters dialog from the modify menu parameters allow you to create equations and relationships to control the size of your Fusion 360 designs by assigning names to the equations we can reuse the parameters throughout the design let's create a new parameter for our boxes width select the plus symbol to add a new parameter new parameter new parameter we'll type the name box with

_Signals: howto:6_

_Source: [Intro to User Parameters and Joints | Day 19 of Learn Fusion 360 in 30 Days - 2023 EDITION](https://www.youtube.com/watch?v=DJULiA1aTtM) — channel `Product Design Online`_

### Tip 4 (confidence 0.4)

> move it out of the way and test our user parameters by changing any one of the expressions the expressions the expressio

move it out of the way and test our user parameters by changing any one of the expressions the expressions the expressions for example I'll change the width to 100 millimeters millimeters millimeters notice the Box instantly resizes based on the new expression keep in mind that it's critical to fully Define your sketches as discussed earlier in this course fully defined sketches combined with user parameters can provide you with an efficient and convenient way to change your model's dimensions change your model's dimensions change your model's dimensions take a minute to test out some

_Signals: howto:5_

_Source: [Intro to User Parameters and Joints | Day 19 of Learn Fusion 360 in 30 Days - 2023 EDITION](https://www.youtube.com/watch?v=DJULiA1aTtM) — channel `Product Design Online`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `parametric` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation