---
title: "CAD function template — siemens-nx / routing"
software: siemens-nx
function: routing
source: video-tribal-aggregation
tip_count: 7
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / routing

**Software:** `siemens-nx` · **Function category:** `routing`
**Source:** aggregated from 7 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <routing> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 7 by confidence)

### Tip 1 (confidence 0.5)

> start importing our netlist information and this is all the connection and component information used for routing starti

start importing our netlist information and this is all the connection and component information used for routing starting with my electrical component navigator i'm going to be pulling in the all the 2d information and specifying what 3d components specifying what 3d components specifying what 3d components represent those 2d connectors adapters and other devices used in this routing so to pull this information in i just need to verify my import format is correct correct correct and i can simply come in and import this cmp file cmp file cmp file it pulls in all the information about the

_Signals: camOps:5_

_Source: [Introduction to Routing and Harness Design in NX CAD - Tutorial - PROLIM Webinar](https://www.youtube.com/watch?v=2yVEHcIrWkA) — channel `PROLIM Global Corporation`_

### Tip 2 (confidence 0.42)

> Okay, we're ready to begin our tech talk today, Crash Course into electrical routing and harness design

Okay, we're ready to begin our tech talk today, Crash Course into electrical routing and harness design. Questions will be answered live at the end, but please go ahead and enter them in the chat as they come up. Our presenter today is Balal. Balal is a graduate of the University of Cincinnati with a bachelor of science and mechanical engineering technology. He has a strong background in manufacturing, design background in manufacturing, design background in manufacturing, design analysis, CNC programming, and 3D printing.

_Signals: camOps:1 · safety:1_

_Source: [How to Design Electrical Routing & Harnesses in Siemens NX - Tutorial - PROLIM Tech Talk](https://www.youtube.com/watch?v=d2nNpW0Cq10) — channel `PROLIM Global Corporation`_

### Tip 3 (confidence 0.41)

> just automatically route them you can watch as it routes the cable and another thing that goes along with the design cha

just automatically route them you can watch as it routes the cable and another thing that goes along with the design change process the design change process the design change process is that if say you make one of these cables and you cables and you cables and you don't like how it automatically routed the path the path the path for instance for this black cable here if i wanted to modify this cable i can very easily go into the cable it'll generate a new point along this curve curve curve and i can modify the position of that point in space point in space point in space to modify how the

_Signals: howto:6_

_Source: [Introduction to Routing and Harness Design in NX CAD - Tutorial - PROLIM Webinar](https://www.youtube.com/watch?v=2yVEHcIrWkA) — channel `PROLIM Global Corporation`_

### Tip 4 (confidence 0.41)

> flatten it out it will show the right orientation for each of the connectors because as you manufacture that you want to

flatten it out it will show the right orientation for each of the connectors because as you manufacture that you want to make sure you rotate and clock that in the right spot so that when we to plug it in inside the vehicle the aircraft and such everything is oriented properly right so again cross probing between the flattened harness in 3D and the flattened harness in flattened harness in flattened harness in 2D again very important uh as you're going through to that next phase of from design to manufacturing we want to make sure we've done everything correctly there but that's that's kind

_Signals: camOps:2_

_Source: [NX Routing Harness: A Smart Way to Create 3D Wiring Design](https://www.youtube.com/watch?v=RQDcgsYyDP0) — channel `ATA Engineering, Inc`_

### Tip 5 (confidence 0.4)

> So NX isn't giving it a name just yet, but before you create your harness, I'm going to open this or actually set this a

So NX isn't giving it a name just yet, but before you create your harness, I'm going to open this or actually set this as my work port and wave geometry link all of these ports in. So I just basically select my routing objects. select my routing objects. select my routing objects. So all of them, So all of them, So all of them, right? I'm going to make sure that they're associative. You might not want to make context independent because if any of these points move, then those ports will stay exactly where they were. In this case, you don't want them. You want them to move along with the part.

_Signals: howto:5_

_Source: [How to Design Electrical Routing & Harnesses in Siemens NX - Tutorial - PROLIM Tech Talk](https://www.youtube.com/watch?v=d2nNpW0Cq10) — channel `PROLIM Global Corporation`_

### Tip 6 (confidence 0.4)

> understand what the language is between the ecad and the mcad and so then you can create the 3D wire wire wire harness s

understand what the language is between the ecad and the mcad and so then you can create the 3D wire wire wire harness so then finally as we go what about changes what about updates that's fine you can pull that information back in it will update we can make changes to the path we can move changes to any of the connectors or or any of the clips or any of those things like that we can modify and update those without having to restart and so that's a real big thing is that coll cation between your electrical and your electrical and your electrical and your mechanical so as we may run into

_Signals: camOps:1 · howto:2_

_Source: [NX Routing Harness: A Smart Way to Create 3D Wiring Design](https://www.youtube.com/watch?v=RQDcgsYyDP0) — channel `ATA Engineering, Inc`_

### Tip 7 (confidence 0.4)

> the right time so here's just an example of how this this works and so just like you saw me working within the harness u

the right time so here's just an example of how this this works and so just like you saw me working within the harness uh inside of NX same thing here we're working with this uh this particular wire harness in the door panel and so with that you have all the things that we talked about and so so so with the capital we have a connector that the user can can set and same thing on the capital side they can turn that on and now we have a live link between the two products so when we set the bridge where am I working I'm working on the door harness what you can see is in my component Navigator in

_Signals: camOps:1 · howto:2_

_Source: [NX Routing Harness: A Smart Way to Create 3D Wiring Design](https://www.youtube.com/watch?v=RQDcgsYyDP0) — channel `ATA Engineering, Inc`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `routing` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation