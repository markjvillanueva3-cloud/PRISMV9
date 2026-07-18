---
title: "CAD function template — siemens-nx / assembly"
software: siemens-nx
function: assembly
source: video-tribal-aggregation
tip_count: 3
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / assembly

**Software:** `siemens-nx` · **Function category:** `assembly`
**Source:** aggregated from 3 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <assembly> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.47)

> And I'll talk about what the difference between component level and pin level is

And I'll talk about what the difference between component level and pin level is. So let's start off just by making simple connections or simple components. Here I right click in my electrical component navigator and I'll click on create. It's a component name. I'll click on this header or just these headers and I'll give it a connector ID of let's just say 0000 0000 0000 and finish. You know that's one component in there. I can finish or I can click next. Next would basically just allow me to select the next component. And I'll do a quick demonstration of that as well. So that's our headers.

_Signals: camOps:2 · howto:6_

_Source: [How to Design Electrical Routing & Harnesses in Siemens NX - Tutorial - PROLIM Tech Talk](https://www.youtube.com/watch?v=d2nNpW0Cq10) — channel `PROLIM Global Corporation`_

### Tip 2 (confidence 0.46)

> drown the velocity if it's a hot food yeah you may have to give it a more start inside the cross forging there's a force

drown the velocity if it's a hot food yeah you may have to give it a more start inside the cross forging there's a force component where you have to go and do only the gain medium and finish in a finish path for the audience ending with the ID now since we are going to use solid stock he may have to go back and pick this up next from basta I'm going to be p90 to penalty now that we've selected a part model on the stock now a couple of things we need to do before starting the toolpath one is selecting that avoidance geometry and the containment geometry if you look at the logon screen here

_Signals: toolpath:1 · camOps:2_

_Source: [Siemens NX CAM Toolpath](https://www.youtube.com/watch?v=gYE-rUBx8V0) — channel `Extreme Performance (Design to Build)`_

### Tip 3 (confidence 0.4)

> closed uh it kind of stores a shadow copy of this it caches this inside the part file there there there if we want to go

closed uh it kind of stores a shadow copy of this it caches this inside the part file there there there if we want to go and update from that file we can do that here but but at any rate we've got these in here in here in here one little caution as you as you start working with this you'll notice here that as that as that as i double click one of these other configurations the green one here of course is that there's the active one if i go grab the 717 here you'll notice the balls don't move yet right and the reason for that is that these are all minimally loaded right now they don't have the

_Signals: safety:1 · howto:1_

_Source: [undefined](https://www.youtube.com/watch?v=Tx5iS_jtZBw) — channel `Taylor Anderson NX Videos`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `assembly` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation