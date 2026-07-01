---
title: "CAD function template — solidworks / surface-nurbs"
software: solidworks
function: surface-nurbs
source: video-tribal-aggregation
tip_count: 6
videos_covered: 4
generated_at: 2026-05-27
---

# CAD function template — solidworks / surface-nurbs

**Software:** `solidworks` · **Function category:** `surface-nurbs`
**Source:** aggregated from 6 video tribal tips across 4 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <surface-nurbs> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 6 by confidence)

### Tip 1 (confidence 0.47)

> going to be useful later on to create sketches and do some other things with and we'll create a similar surface on the o

going to be useful later on to create sketches and do some other things with and we'll create a similar surface on the other side of the part with the tangent option so I'll say okay to this and then we're going to go over and rotate to the other side and do the same thing again this a few more seconds to finish up and we should be good there we go so do a surface for mesh planar surface as well this time we'll use the tangent select facets and I'm gonna pick that area right there now 15 degrees let's just wrap round a little bit more than we probably want I'm gonna go with maybe a 2 degree

_Signals: camOps:1 · params:2 · howto:3_

_Source: [SOLIDWORKS Tutorial - SOLIDWORKS and Scan Data](https://www.youtube.com/watch?v=ioAYgs9OCN4) — channel `GoEngineer`_

### Tip 2 (confidence 0.42)

> means tool coming from top and this this is the zero surface from where it starts cutting machine now these all are set

means tool coming from top and this this is the zero surface from where it starts cutting machine now these all are set now there is next option extract machinable feature it will tell you what kind of operation you need to cut these tool so simply click and it is going to calculate and see these are the operations you need to perform to make this simple part now after that there is one of things called generate called generate called generate operation operation operation so click so click so click see you must select then select so these are the plan roughing plan cutting plan roughing

_Signals: howto:7_

_Source: [SolidWorks CAM introduction Exercise-1 Mill Operation](https://www.youtube.com/watch?v=GMZO7nGZHHQ) — channel `CAD CAM TUTORIAL BY MAHTABALAM`_

### Tip 3 (confidence 0.42)

> that's going to affect our feeds and speeds when we go to our feeds and speeds to have speeds to have speeds to have sel

that's going to affect our feeds and speeds when we go to our feeds and speeds to have speeds to have speeds to have select defined by operation now if we recall back from that calculating spindle speed chart our rpm is 4v / D we we simplify 12v over PI D so 4 times our surface speed now we're using carbide tooling and a little bit um so our surface speed is quite a bit higher 600 surface feet per minute divided by the diameter of the tool which is 2 inches that's going to give us an RPM of 1200 rpm of 1200 now our feed right now theoretically we can alter this feed rate to match our

_Signals: params:2 · howto:1_

_Source: [Solidworks CAM Tutorial: Adding Tool Paths (3)](https://www.youtube.com/watch?v=Z8TOSDcW-po) — channel `Professor Cameron`_

### Tip 4 (confidence 0.41)

> our mid plane and we can mirror that to the other side we've been working in shaded and moved so far shaded with edges y

our mid plane and we can mirror that to the other side we've been working in shaded and moved so far shaded with edges you know gets us a little better look at the part we've got maybe another surface there we can hide and clean up we're getting fairly close to matching up with our graphics body there's all the different facets that are there looks like we've got one small little chamfer kind of a all around the part that we could add to help match that up and we're adding some small little details to finish things up so I hope this explanation of some of the tools that we can use with our

_Signals: camOps:2_

_Source: [SOLIDWORKS Tutorial - SOLIDWORKS and Scan Data](https://www.youtube.com/watch?v=ioAYgs9OCN4) — channel `GoEngineer`_

### Tip 5 (confidence 0.41)

> material supplier so we can alter that here and we'll do that in future videos but for now we're just gonna stick with t

material supplier so we can alter that here and we'll do that in future videos but for now we're just gonna stick with the minimum so once we have our stock defined we can select ok so we've defined machine our coordinate system and our stock manager what we're gonna do is select setup mill setup now what we're doing is we're telling our computer here how the part will be oriented in our vise and what we want to do for this is just select this top surface what that's doing is it's telling SolidWorks that we're gonna be milling straight down and you can see this arrow here imagine that's how

_Signals: camOps:1 · howto:3_

_Source: [Solidworks CAM Tutorial: Basic Contour (1)](https://www.youtube.com/watch?v=jlhjrMKiZfo) — channel `Professor Cameron`_

### Tip 6 (confidence 0.4)

> diameter and the location and it should be fairly easily similar to what we've done with many of the other cutouts that

diameter and the location and it should be fairly easily similar to what we've done with many of the other cutouts that we've done already you know here in our pocket it kind of depends on the data that we've got here let's see how this works we'll come in and use the surface for mesh go back over to a planar surface and we've got the ability to either paint a selected facets here maybe we bump up the diameter size a little bit so we can paint a little bit faster so this kind of all depends on the data that we've got so let's see how this works now with this surface we can either start a

_Signals: toolpath:1_

_Source: [SOLIDWORKS Tutorial - SOLIDWORKS and Scan Data](https://www.youtube.com/watch?v=ioAYgs9OCN4) — channel `GoEngineer`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `surface-nurbs` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation