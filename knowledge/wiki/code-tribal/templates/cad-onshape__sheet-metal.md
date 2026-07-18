---
title: "CAD function template — onshape / sheet-metal"
software: onshape
function: sheet-metal
source: video-tribal-aggregation
tip_count: 7
videos_covered: 4
generated_at: 2026-05-27
---

# CAD function template — onshape / sheet-metal

**Software:** `onshape` · **Function category:** `sheet-metal`
**Source:** aggregated from 7 video tribal tips across 4 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <sheet-metal> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 7 by confidence)

### Tip 1 (confidence 0.43)

> we're only doing half of the model the next options you're going to see here are going to be your options for the wall t

we're only doing half of the model the next options you're going to see here are going to be your options for the wall thickness and for the bend radius now just generally speaking in sheet metal you never want your wall thickness to be greater than your Bend radius the bend radius should always be greater than the wall thickness and so in the case of our drawing we're being told that the default wall thickness is 0.125 and the default Bend radius is 0.250 the bend radius is larger than the wall thickness and that is a good thing that is what we want in sheet metal finally what we're going to

_Signals: safety:2_

_Source: [Sheet Metal Beginner Tutorial (Angle Bracket)](https://www.youtube.com/watch?v=4rndxiRc0Xc) — channel `Onshape`_

### Tip 2 (confidence 0.42)

> now let's just make it bigger so that's that's that's easier to see there we have a value of 20 in the model 20 in the m

now let's just make it bigger so that's that's that's easier to see there we have a value of 20 in the model 20 in the model 20 in the model quite huge so that's good for the first flange let me hit the check mark i'll create one i'll create one i'll create one other flange in the model once again we will click will click will click on the icon i'm going to select these inner edges inner edges inner edges and grab this one and this one as well and so you can see how we're creating sort of like the side wall and once again i'll leave the option for the flange alignment alignment alignment inner

_Signals: howto:7_

_Source: [Onshape - Sheet Metal - Flange Features](https://www.youtube.com/watch?v=4yGEheWJRqg) — channel `Creo Parametric`_

### Tip 3 (confidence 0.42)

> two lines bring that out cut off that flared region and then I'll go back in and add another flange that comes in this w

two lines bring that out cut off that flared region and then I'll go back in and add another flange that comes in this way so that should help me to avoid you know running into a challenge with regards to inadvertently loing off the this little sharp corner here these are just kind of things that you learn over time when you do a lot of 3D CAD you kind of learn how to look at a model whether it's a physical part or whether it's a a 2d print and kind of like unbuild it in your head and imagine what the feature tree is going to look like and then you go through and actually try to create the

_Signals: camOps:2 · howto:1_

_Source: [Onshape Sheet Metal Tutorial – FLARED BRACKET - LIVE!](https://www.youtube.com/watch?v=cShoxXtbUbk) — channel `Too Tall Toby`_

### Tip 4 (confidence 0.41)

> select a reference and then have a numerical offset from that reference that reference that reference but i don't have a

select a reference and then have a numerical offset from that reference that reference that reference but i don't have any other references in the model to use the model to use the model to use so let's keep it with the blind option and if i go to the bend angle drop down you can see that your other choices for defining defining defining the angle of the bend is to align to geometry geometry geometry or an angle from a certain direction let's leave bend angle right now we have a value of 90 degrees you can change the value here's 45 so it's a little flared out let's go back to 90 so that it

_Signals: params:1 · howto:3_

_Source: [Onshape - Sheet Metal - Flange Features](https://www.youtube.com/watch?v=4yGEheWJRqg) — channel `Creo Parametric`_

### Tip 5 (confidence 0.41)

> about that uh the spring open leaderboard is open all right let's get into some on shaped 3D modeling some sheet metal h

about that uh the spring open leaderboard is open all right let's get into some on shaped 3D modeling some sheet metal here we go this is Victor K's favorite part 23t 81 flared bracket uh kind of a tricky part here you can see here um that we tried our best in the 2D print to let people know kind of what to expect and how to uh avoid you know avoid running outside of spec probably the biggest part of that is this region right here this Bend region flared wall so having this section here straight and then having this flare out is key if you start flaring out too early you're going to end up too

_Signals: camOps:2_

_Source: [Onshape Sheet Metal Tutorial – FLARED BRACKET - LIVE!](https://www.youtube.com/watch?v=cShoxXtbUbk) — channel `Too Tall Toby`_

### Tip 6 (confidence 0.4)

> the bend feature folds sheet metal along a reference and is useful when traditional methods may be timec consuming to ad

the bend feature folds sheet metal along a reference and is useful when traditional methods may be timec consuming to add for instance creating a sheet metal part based on an imported dxf start a new Bend feature select a Bend line reference in the graphics area this reference is a line or Edge that defines the bent location it does not have to belong to any particular sketch and can extend along multiple Cuts in the same face and be at any angle to the selected face select a single sheet metal face to bend for multiple bends create additional Bend features click the hold opposite side toggle

_Signals: howto:5_

_Source: [Bend - Onshape Sheet Metal](https://www.youtube.com/watch?v=azqA6N0lHgQ) — channel `Onshape`_

### Tip 7 (confidence 0.4)

> of the bent wall with the bend line next choose how to control the bend angle the bend angle field allows users to input

of the bent wall with the bend line next choose how to control the bend angle the bend angle field allows users to input a specific angle aligned to Geometry aligns the bend Bend parallel to a face Edge plane or mate connector angle from Direction aligns the bend at an angle based on a face Edge plane or mate connector the bend feature automatically uses the bend radius and K Factor values specified in the sheet metal model feature if required uncheck either option and input custom values the bend does not affect the dimensions of the flat pattern when using a custom K Factor it modifies the

_Signals: toolpath:1_

_Source: [Bend - Onshape Sheet Metal](https://www.youtube.com/watch?v=azqA6N0lHgQ) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `sheet-metal` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation