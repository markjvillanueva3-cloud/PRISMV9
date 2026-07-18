---
title: "CAD function template — siemens-nx / schematic-electrical"
software: siemens-nx
function: schematic-electrical
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / schematic-electrical

**Software:** `siemens-nx` · **Function category:** `schematic-electrical`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <schematic-electrical> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.4)

> confirm and then you can see your listed listed listed port along with its assigned terminal now if i hop back over to m

confirm and then you can see your listed listed listed port along with its assigned terminal now if i hop back over to my top level you'll notice you'll notice you'll notice my port isn't actually showing in my top level assembly level assembly level assembly this is because i need to create a reference set that includes that port in it it it so i'm just going to go over to my reference sets and create a new one set it so it includes everything in the environment close that i come back and do a replace reference set my new reference that is there along with the assigned port and terminal now

_Signals: howto:5_

_Source: [Introduction to Routing and Harness Design in NX CAD - Tutorial - PROLIM Webinar](https://www.youtube.com/watch?v=2yVEHcIrWkA) — channel `PROLIM Global Corporation`_

### Tip 2 (confidence 0.4)

> However, since I know that my conductors are not going to be out here, they're actually going to go deeper inside so the

However, since I know that my conductors are not going to be out here, they're actually going to go deeper inside so they can interface with the actual pin. I'm going to push these terminals further in. So, in fact, what I'm going to do is I'm going to reset this dialog box. And I'm going to actually turn on my wireframe. And in my display, I'm just going to go and show my and show my and show my hidden edges as solid. A reason why I'm doing this, you will see why soon. So, I'm going to create another terminal array or just a terminal array in general. I'm going to select my pattern feature.

_Signals: camOps:1 · howto:2_

_Source: [How to Design Electrical Routing & Harnesses in Siemens NX - Tutorial - PROLIM Tech Talk](https://www.youtube.com/watch?v=d2nNpW0Cq10) — channel `PROLIM Global Corporation`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `schematic-electrical` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation