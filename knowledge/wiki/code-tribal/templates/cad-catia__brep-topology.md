---
title: "CAD function template — catia / brep-topology"
software: catia
function: brep-topology
source: video-tribal-aggregation
tip_count: 4
videos_covered: 4
generated_at: 2026-05-27
---

# CAD function template — catia / brep-topology

**Software:** `catia` · **Function category:** `brep-topology`
**Source:** aggregated from 4 video tribal tips across 4 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <brep-topology> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 4 by confidence)

### Tip 1 (confidence 0.58)

> visible it means it will not trimmed okay now create this Edge fet radius of 16 16 16 mm select Edge fillet in operation

visible it means it will not trimmed okay now create this Edge fet radius of 16 16 16 mm select Edge fillet in operation command command command bar select these four edges radius is 16 edges radius is 16 mm okay this portion of the part is completed now I'm going to create this construction go to insert insert new geometrical set name this as ples L NS planes create one plane with the reference of ZX plane offset of 32 mm so it is offset of 32 mm from this origin to this surface it is 32 Define construction so select plane one position sketch one position sketch one position sketch okay

_Signals: camOps:1 · params:4 · howto:8_

_Source: [CATIA V5 Tutorial: Generative Shape Design (GSD) | The Product Designer |](https://www.youtube.com/watch?v=DTiJotXnGYU) — channel `The Product Designers`_

### Tip 2 (confidence 0.45)

> in chain modes

in chain modes. in chain modes. What will happen in chain modes? You can see see see when I do the when I do the when I do the standard mode, you can see this is one this is one this is one and this is two. and this is two. and this is two. When I select the chain mode you can see one and two. one and two. one and two. If I click on this face, this one and then I can select this one you can see see see I don't have to select again this one. this one. this one. And I got 50 mm here and 50 mm here. This is called chain mode.

_Signals: params:2 · howto:4_

_Source: [CATIA V5 Analysis Tools Explained | Measure, Mass Properties & Inertia | Part 41](https://www.youtube.com/watch?v=W5LstlJkMXY) — channel `Enginuity Lab`_

### Tip 3 (confidence 0.4)

> where you will uh put your input geometry uh like wireframe or even surfaces this would be the most likely in in this ca

where you will uh put your input geometry uh like wireframe or even surfaces this would be the most likely in in this case uh it would be the most likely origin of this surface uh considering we are designing this from scratch and without context I'm I'm I'm drawing this uh myself but uh for this is for a part like this you would probably receive this from somewhere some someplace else then you have your construction set in the construction set in the construction set in the construction set you most likely need to put uh a subset with features and for each feature you would create another

_Signals: howto:5_

_Source: [CATIA V5 Beginner Tutorial - Surface Design / GSD (Part 4)](https://www.youtube.com/watch?v=1fd9IMhhCfU) — channel `CAD Masterclass`_

### Tip 4 (confidence 0.4)

> surface design ktia 3d experience allows you to create complex wireframe and shapes thanks to the ktia generative shape

surface design ktia 3d experience allows you to create complex wireframe and shapes thanks to the ktia generative shape design app let's go through some of the features of this video to see how advanced shapes can be quickly and easily produced this short demo involves the design of the front fender using the generative shape design app a large number of functionalities can be chosen directly from the model when you select an element the contextual toolbar suggest a series of features in accordance with what you selected plus every feature added to the model is kept in the specification tree

_Signals: camOps:1 · howto:2_

_Source: [CATIA 3DEXPERIENCE | Advanced Surface Design](https://www.youtube.com/watch?v=RT24Yj5thd8) — channel `CATIA`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `brep-topology` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation