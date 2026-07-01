---
title: "CAD function template — onshape / routing"
software: onshape
function: routing
source: video-tribal-aggregation
tip_count: 3
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — onshape / routing

**Software:** `onshape` · **Function category:** `routing`
**Source:** aggregated from 3 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <routing> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.41)

> hit 600 mm as the target I know the order from you know down the cylinders and and where they are on this merge collecto

hit 600 mm as the target I know the order from you know down the cylinders and and where they are on this merge collector here and I come up with some you know so some schemes to try and get them all to be the right length with the right sort of Bend radi and um and in within a reasonable packaging uh that we've got so I did the same thing for those six routing curbs and I got it reasonably quickly um it didn't take very long at all and I got them all within you know a few ten of a millimeter of 600 uh millimeters total uh so that's good um if I turn off those parts again uh if I go back to

_Signals: camOps:1 · params:1_

_Source: [Using Onshape's new Routing curve for various 3D curve workflows](https://www.youtube.com/watch?v=8shIxZ4eBXQ) — channel `Greg Brown - Onshape`_

### Tip 2 (confidence 0.4)

> header tubes um Runner tubes here and in the routing curve is actually a really good way to to do these things so I'm go

header tubes um Runner tubes here and in the routing curve is actually a really good way to to do these things so I'm going to take a step you through the process that I used and but before we do that let's just take a little time to look at one of the other nice things from version 195 uh which is the Cosmetic thread um obviously there's some M10 threaded uh tapped holes here and there's a thread on the on the stud here as well and if I take a a cross-section through it you'll see it behaves nicely um with that as well so um you know shout out to that as a as a huge uh bonus thing for uh for

_Signals: gcode:1_

_Source: [Using Onshape's new Routing curve for various 3D curve workflows](https://www.youtube.com/watch?v=8shIxZ4eBXQ) — channel `Greg Brown - Onshape`_

### Tip 3 (confidence 0.4)

> anything to people I ran through here and I did a couple of spots along the way to make sure that it stayed kind of para

anything to people I ran through here and I did a couple of spots along the way to make sure that it stayed kind of parallel to the floor and that it popped out in the right place and then turned the corner and attached itself to the uh the reference that I wanted to right so that is an Inc context part studio now the red bits here are just sweeps that I made along the path the path the path um you see here that I actually created the the routing curve of those black things and the sweeps are things that I made after the fact now I'm not going to dwell on them for the moment um because

_Signals: toolpath:1_

_Source: [Using Onshape's new Routing curve for various 3D curve workflows](https://www.youtube.com/watch?v=8shIxZ4eBXQ) — channel `Greg Brown - Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `routing` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation