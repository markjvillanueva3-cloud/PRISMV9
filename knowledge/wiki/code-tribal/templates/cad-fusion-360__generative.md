---
title: "CAD function template — fusion-360 / generative"
software: fusion-360
function: generative
source: video-tribal-aggregation
tip_count: 6
videos_covered: 4
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / generative

**Software:** `fusion-360` · **Function category:** `generative`
**Source:** aggregated from 6 video tribal tips across 4 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <generative> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 6 by confidence)

### Tip 1 (confidence 0.44)

> this allows you to select multiple models to compare with one another you can also further analyze the designs by lookin

this allows you to select multiple models to compare with one another you can also further analyze the designs by looking at the stress view and design space views now I want to show you how to export your design so if you do spend some time playing around with generative design you're able to 3d print your final outcome you can simply select create new mesh from outcome to generate a mesh file otherwise if you want to bring the design back into the design workspace to make edits you can select create new design from outcome this will take a few minutes to process however once you click the

_Signals: camOps:1 · howto:6_

_Source: [Free Generative Design — Beginner Fusion 360 Tutorial](https://www.youtube.com/watch?v=PSSt8wswNJQ) — channel `Product Design Online`_

### Tip 2 (confidence 0.42)

> Preserve geometry and I can turn on my model component here so I'll see each of them there all right so let's start by p

Preserve geometry and I can turn on my model component here so I'll see each of them there all right so let's start by preserve geometry preserve geometry I wish to keep uh that area that area and that and that which I identified them before as preserve so that's my preserve then the obstacles and my obstacles is that plate at the bottom and and and then that part that part and the other part over there so that's my obstacles there and then the next over here I'll I don't have any offset but we can Define offsets with respect those obstacles for example if I want like 10 mm offset with that I

_Signals: camOps:1 · params:1 · howto:1_

_Source: [Tutorial 1.  Generative Design with Fusion 360](https://www.youtube.com/watch?v=bDJQF0BbBBs) — channel `Tutorials - Mechanical Engineering`_

### Tip 3 (confidence 0.41)

> path the CNC is only following numbers made of the G-Code exported in the postprocess of fusion 360 so we're going to st

path the CNC is only following numbers made of the G-Code exported in the postprocess of fusion 360 so we're going to study how do we create these tool paths so we cut out the proper thing with our CNC machine here I have the shape in plywood that we want to cut out this demonstr Ates some typical cuts that you're going to make with a CNC machine here in the middle we have a pocket cut that doesn't go all the way through but it has an organic organic organic shape then we also have a slot that goes all the way through like a DAT cut with a table saw this is a very common cut in CNC and then

_Signals: toolpath:1 · howto:1_

_Source: [CNC Cutting with Fusion 360: A Step-by-Step Tutorial](https://www.youtube.com/watch?v=lXSVlk3FqHc) — channel `What Make Art`_

### Tip 4 (confidence 0.41)

> thousand three hundred and fifty seven for the z-direction notice how the arrows are at an angle because we define two d

thousand three hundred and fifty seven for the z-direction notice how the arrows are at an angle because we define two different directions of where the force is being applied applied applied I'll click OK to confirm the force of load case number three load case number three load case number three I'll now activate Lowe case number four and this time I'm going to right-click on the force option and I'm going to delete it delete it delete it for the fourth load case we're going to apply a different force to each one of these inner rings I'll activate the structural loads feature and then I'll

_Signals: howto:6_

_Source: [Free Generative Design — Beginner Fusion 360 Tutorial](https://www.youtube.com/watch?v=PSSt8wswNJQ) — channel `Product Design Online`_

### Tip 5 (confidence 0.4)

> out 8,000 in the Z input field this tells the program it needs to simulate 8,000 pounds of force being pushed up in the

out 8,000 in the Z input field this tells the program it needs to simulate 8,000 pounds of force being pushed up in the Z direction when this first load case is run after clicking ok to confirm our structural load will see that is added to our load case 1 within the loads folder our first load case is all set up and ready to go but this is where we can really utilize the power of computing and generative design I'm going to right click on the load case 1 and I'll select clone to create a copy of it let's clone this a total of 3 times so we can set up four different load cases to be tested

_Signals: howto:5_

_Source: [Free Generative Design — Beginner Fusion 360 Tutorial](https://www.youtube.com/watch?v=PSSt8wswNJQ) — channel `Product Design Online`_

### Tip 6 (confidence 0.4)

> Under shape optimization, we select the target body preserve region, the area that we don't want to touch

Under shape optimization, we select the target body preserve region, the area that we don't want to touch. And then our criteria we wish to reduce the weight by 50% have the maximum stiffness and and this shape because it's a plate we wish it to be uh symmetric. We select our material our constraint to pin on this here and then we select two loads there and simply and then on the setting our we set up our mesh size. And then I click solve. Give it few seconds. So it check with the server and yes it's educational. We have unlimited access. unlimited access. unlimited access.

_Signals: howto:5_

_Source: [Fusion 360 – Step-by-Step for Absolute Beginners (Part 5  Shape Design Topology Optimization)](https://www.youtube.com/watch?v=VBWm-pE_Uzc) — channel `Tutorials - Mechanical Engineering`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `generative` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation