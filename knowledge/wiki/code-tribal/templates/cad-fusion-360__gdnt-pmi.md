---
title: "CAD function template — fusion-360 / gdnt-pmi"
software: fusion-360
function: gdnt-pmi
source: video-tribal-aggregation
tip_count: 7
videos_covered: 5
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / gdnt-pmi

**Software:** `fusion-360` · **Function category:** `gdnt-pmi`
**Source:** aggregated from 7 video tribal tips across 5 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <gdnt-pmi> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 7 by confidence)

### Tip 1 (confidence 0.51)

> want want uh let's see what that looks like all right so it kind of recognizes it but all of this at the top there you k

want want uh let's see what that looks like all right so it kind of recognizes it but all of this at the top there you know it's done a little bit better job but we could do it an even better job there let's go to our tolerance we're going to add a little bit more there optimal load let's just bring it to 0.15 Let's slowly refine our tool path here there we go hey you know what that's actually looking not too too bad but let's pick a better way here I'm going to delete it going to delete it going to delete it and let's put pick our 2D adaptive clearing we're going to go back to our half inch

_Signals: toolpath:2 · camOps:1 · howto:3_

_Source: [Fusion 360 - HWIMT - Part 001 Setup 2 - Op 1 (2D vs. 3D Adaptive Clearing)](https://www.youtube.com/watch?v=62226pmX3i0) — channel `Learn It!`_

### Tip 2 (confidence 0.49)

> going to type

going to type .02 then click on passes and once again we need to make sure we have multiple depths we don't want 75 we want .125 which is half the diameter of our bit we can use even step Downs if you needed to make this part fit into something else we could use stock to leave and stock to leave could be a negative number or a positive number depending on how your fit and tolerances work everything under linking should be fine and then we can click okay notice that the tool path will go up over the tab so when we simulate that so I'll go ahead and select the Contour and I'll click simulate

_Signals: toolpath:2 · howto:4_

_Source: [CNC Cutting with Fusion 360: A Step-by-Step Tutorial](https://www.youtube.com/watch?v=lXSVlk3FqHc) — channel `What Make Art`_

### Tip 3 (confidence 0.49)

> model we'll need to turn off the turn off the turn off the Symmetry we'll use Clear Symmetry and select the select the s

model we'll need to turn off the turn off the turn off the Symmetry we'll use Clear Symmetry and select the select the select the model notice the green lines disappear and the Symmetry is now turned off looking at at the model from the front view we'll do a window selection over the top three the top three the top three rows using edit form we'll have to look at this from a perspective so we can drag the correct angle slider to start twisting the vase let's make the first twist 45° and for each one we'll use 10° less we can keep edit form active and select the top two rows make sure to do

_Signals: camOps:3 · howto:5_

_Source: [Fusion T-splines are easy! | Day 27 of Learn Fusion 360 in 30 Days - 2024 EDITION](https://www.youtube.com/watch?v=NqjbJZ2ekRU) — channel `Product Design Online`_

### Tip 4 (confidence 0.48)

> push them inward or we can type out a specific value such as negative eight millimeters let's click ok and see what this

push them inward or we can type out a specific value such as negative eight millimeters let's click ok and see what this looks like like like we can also remove the symmetry with the clear symmetry command clear symmetry command clear symmetry command selecting the model and hitting ok will turn it off turn it off turn it off overall this is a good start for the pumpkin shape pumpkin shape pumpkin shape another critical concept that i want to point out is the idea of t-splines being converted to a solid or surface body to leave the t-spline environment we're required to hit the finish form

_Signals: camOps:4 · howto:1_

_Source: [Modeling with T-Splines in Fusion 360 (2021)](https://www.youtube.com/watch?v=4a9YCrnypNA) — channel `Product Design Online`_

### Tip 5 (confidence 0.48)

> what happens to the wood does it stay the same size all the time what makes it change size moisture moisture right does

what happens to the wood does it stay the same size all the time what makes it change size moisture moisture right does steel say the same size all the time will make still change size temperature does temperature and moisture always change moisture always change moisture always change together no so giving a little bit of space there so they can move um it'sa probably a good thing thing thing okay and so this is going to be kind of your time to figure out how it's going to fit together what and and go together and if you make the number and it's the wrong number are you dead do you have to

_Signals: safety:3 · howto:5_

_Source: [Creating a Weldment in Fusion360](https://www.youtube.com/watch?v=9PG_AJsewQc) — channel `CAD Training Now`_

### Tip 6 (confidence 0.46)

> for the pocket cut we want to go the bottom height to be the selected Contour then the passes this is one of the most im

for the pocket cut we want to go the bottom height to be the selected Contour then the passes this is one of the most important things we need to make sure that our passes are correct if we were trying to fit apart we could have stock to leave be negative but right now I'm just going to uncheck it if you're trying to get a specific fit and tolerance this is the proper way to do it you can have negative stock value or a positive stock value we definitely need to check multiple depths and we need to have our maximum roughing step down of1 125 and then we want to select use even step use even

_Signals: toolpath:2 · howto:1_

_Source: [CNC Cutting with Fusion 360: A Step-by-Step Tutorial](https://www.youtube.com/watch?v=lXSVlk3FqHc) — channel `What Make Art`_

### Tip 7 (confidence 0.45)

> challenge where you can practice and share your 3d modeling skills modeling skills modeling skills this challenge has mo

challenge where you can practice and share your 3d modeling skills modeling skills modeling skills this challenge has more prizes in addition to the grand prize of the 3d printer printer printer be sure to check out the link below for the challenge details the challenge details the challenge details and be sure to upload as many models as you would like by november 7 2020 back in fusion 360 let's turn on the symmetry the symmetry the symmetry that's going to allow us to manipulate multiple parts of the pumpkin at the same time same time same time under the symmetry drop down we'll activate

_Signals: camOps:3 · howto:1_

_Source: [Modeling with T-Splines in Fusion 360 (2021)](https://www.youtube.com/watch?v=4a9YCrnypNA) — channel `Product Design Online`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `gdnt-pmi` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation