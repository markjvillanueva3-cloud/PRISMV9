---
title: "CAD function template — inventor / translation"
software: inventor
function: translation
source: video-tribal-aggregation
tip_count: 3
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — inventor / translation

**Software:** `inventor` · **Function category:** `translation`
**Source:** aggregated from 3 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <translation> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.42)

> United States government and just general Aerospace and Automotive so here's a small list of some of our larger customer

United States government and just general Aerospace and Automotive so here's a small list of some of our larger customers where you'll find Rapid form software now rapid form is the fastest path to CAD we say this all the time um the first step to get scan data is we need to use a 3D scanner or a 3D measurement device to acquire all the points in order to create our parametric solid model um the next step is going to be of course bringing your measured data into rapid form which is based on the parasolid parasolid parasolid Kernel so we really are um a cad-based program that's specializes in

_Signals: camOps:2 · howto:1_

_Source: [Rapidform XOR to Inventor LiveTransfer Webinar](https://www.youtube.com/watch?v=GdIrN14WyZc) — channel `rapidform3d`_

### Tip 2 (confidence 0.42)

> in the top body in the top body uh it's quite interesting topic that we want to do wiring in control panel so so so for

in the top body in the top body uh it's quite interesting topic that we want to do wiring in control panel so so so for today's basically what we are going to cover we want we will cover on how to create a control panel so if you have a very standard uh modeling and then if you require to insert any 3D model that you download from other parties others maybe from parties others maybe from parties others maybe from another website so or from your supplier so what you can do you can just import and insert in the 3D model that you have so let's go straight away to the topics so the first one if

_Signals: camOps:2 · howto:1_

_Source: [Autodesk Inventor - Wire Modelling for Control Panel](https://www.youtube.com/watch?v=jk9wEgNzRtI) — channel `Acad Systems Sdn Bhd`_

### Tip 3 (confidence 0.42)

> the step file ID as well just normal Import in here so for example I have step file I can go to here and then hit import

the step file ID as well just normal Import in here so for example I have step file I can go to here and then hit import hit import hit import so but if I have for example I have one item that already created inventor so I can just click place I can from this folder then I can look whatever model that I require here that I require here that I require here okay so in this case I try to insert one of the items so by default so by default okay by default this item are only a 3D modeling box okay basic 3D parts so how to convert this object to an electrical parts parts parts so the first thing

_Signals: camOps:2 · howto:1_

_Source: [Autodesk Inventor - Wire Modelling for Control Panel](https://www.youtube.com/watch?v=jk9wEgNzRtI) — channel `Acad Systems Sdn Bhd`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `translation` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation