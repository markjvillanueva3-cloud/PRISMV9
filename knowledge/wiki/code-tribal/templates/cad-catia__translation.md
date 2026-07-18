---
title: "CAD function template — catia / translation"
software: catia
function: translation
source: video-tribal-aggregation
tip_count: 4
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — catia / translation

**Software:** `catia` · **Function category:** `translation`
**Source:** aggregated from 4 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <translation> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 4 by confidence)

### Tip 1 (confidence 0.45)

> kav V5 reverse engineering so let's take a look this will be the case study part as we can see this is a motorcycle cran

kav V5 reverse engineering so let's take a look this will be the case study part as we can see this is a motorcycle crank case and you can also download the model from the rtech 3D scan database I will select the STL file now let's jump within K and have that imported so I will go to shape digitize shape editor since this will be a 3D scan in an STL file format I will go for import and we're going to see that the model will already be added over here I want this to be imported at the true scale therefore I will leave the scale factor to one if I will click will click will click apply we're

_Signals: camOps:2 · howto:4_

_Source: [CATIA V5 - Reverse Engineering (Curve from 3D scan)](https://www.youtube.com/watch?v=oa-rP9PD7Tw) — channel `3D Comparison`_

### Tip 2 (confidence 0.42)

> surface so I'll pick curve curve curve or not surface STL here I have projection and let me pick them again pick my STL

surface so I'll pick curve curve curve or not surface STL here I have projection and let me pick them again pick my STL now I remember it turned off the pick ability so I need to pick it out of the tree and what direction for me it's gonna be the Y component just right mouse click in there say Y and if you want curve creation you can do that and in this case I'll say sure why not select apply there's my projections everything looks good and okay now that I have those curves onto that mesh what I want you to notice is a zoom up you'll see that there's some deflection okay this isn't perfectly

_Signals: toolpath:1 · howto:2_

_Source: [Catia V5 | Catia V6: Digitized Shape Editor (DSE) - Radial Sections to Curve](https://www.youtube.com/watch?v=dJPHEh3jcmk) — channel `Class A Surfacing`_

### Tip 3 (confidence 0.41)

> plate using this option you can add the thickness if I want to add the thickness by 0

plate using this option you can add the thickness if I want to add the thickness by 0.2 you can add if you if you want to add two sides then you should give then you should give then you should give neutral neutral neutral fiber both side 0.2 fiber both side 0.2 fiber both side 0.2 mm then if you want to add uh in a particular direction you should select the reference but reference should be parall to this axis now I'll add in this so the direction should be perpendicular here select the profile select this this it is already there in X direction see so the profile must be perpendicular to

_Signals: params:1 · howto:3_

_Source: [Pad,pocket, shaft and groove command in catia sketch based features](https://www.youtube.com/watch?v=jDFTh7aT_MQ) — channel `ShivaShakti`_

### Tip 4 (confidence 0.4)

> jump would jump would jump back to generative shape design since we have that section converted to a curve I have the po

jump would jump would jump back to generative shape design since we have that section converted to a curve I have the possibility to have the possibility to have the possibility to use the generative um shape design work bench in order to create the surfaces so for example if I would want to go to the um let's say with reverse and for the top with a value of 1 1 1 mm we're going to be all the way over there so maybe there so maybe there so maybe 0.5 afterwards we're going to have a radius over here so within the following step we should Define the Top Lane and and afterwards using the trim

_Signals: params:1 · howto:2_

_Source: [CATIA V5 - Reverse Engineering (Curve from 3D scan)](https://www.youtube.com/watch?v=oa-rP9PD7Tw) — channel `3D Comparison`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `translation` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation