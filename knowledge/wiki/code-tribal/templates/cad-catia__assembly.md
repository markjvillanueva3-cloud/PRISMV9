---
title: "CAD function template — catia / assembly"
software: catia
function: assembly
source: video-tribal-aggregation
tip_count: 4
videos_covered: 4
generated_at: 2026-05-27
---

# CAD function template — catia / assembly

**Software:** `catia` · **Function category:** `assembly`
**Source:** aggregated from 4 video tribal tips across 4 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <assembly> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 4 by confidence)

### Tip 1 (confidence 0.46)

> Hello everyone and welcome back to CNC Toolpath YouTube channel

Hello everyone and welcome back to CNC Toolpath YouTube channel. Today I'll be showing you one of the most important and quick steps in CNC programming using CADIA, the part and stock setup for pocket machining. This step is the foundation for accurate machining. So don't skip any detail. Let's get started. Go to the start menu, then choose mechanical design. From here, click on assembly design workbench. Now you are inside the assembly design environment. Go to insert existing component. Locate the folder where your part file is saved and open it.

_Signals: toolpath:2 · howto:1_

_Source: [CATIA Pocket Machining Setup Part & Stock Assembly for CNC Programming](https://www.youtube.com/watch?v=X3KgE8UMiKE) — channel `CNCToolpath`_

### Tip 2 (confidence 0.43)

> Hello everyone and welcome back to the CNC tool path YouTube channel

Hello everyone and welcome back to the CNC tool path YouTube channel. Today we'll learn how to import a new model in Kadia and create an assembly for CNC programming. This is one of the most important steps to begin CNC programming in Cadia. So make sure you follow along carefully and don't skip any part. Let's get started. Step one, open assembly workbench. First, launch Cadia. From the start menu, go to mechanical design and select assembly design. This once the assembly workbench is open, go to the top left corner and click on product. This step three, insert existing components.

_Signals: toolpath:1 · howto:3_

_Source: [CATIA Assembly Design for CNC Programming | Import Parts & Apply Constraints CATIA Assembly Tutorial](https://www.youtube.com/watch?v=JUgoGyobclU) — channel `CNCToolpath`_

### Tip 3 (confidence 0.41)

> part we go to part we go to part we go to part hit okay enable hybrid design now we design now we design now we start uh

part we go to part we go to part we go to part hit okay enable hybrid design now we design now we design now we start uh organizing our structure here insert geometrical insert geometrical insert geometrical set input this will actually be empty for now we have our construction set and inside our construction set we will have a subset have a subset have a subset named features inside the feature features inside the feature set we'll begin with it doesn't matter right now we will just rename it later we have this final assembly stuff and then I don't like this order so we will right click the

_Signals: howto:6_

_Source: [CATIA V5 Beginner Tutorial - Surface Design / GSD (Part 4)](https://www.youtube.com/watch?v=1fd9IMhhCfU) — channel `CAD Masterclass`_

### Tip 4 (confidence 0.41)

> This is 40 mm

This is 40 mm. And click on the exit icon. And let's insert And let's insert And let's insert each each each axis system axis system axis system and select this one. Now, my default X axis is like this and okay. okay. okay. Here you can see I have a axis system. Okay. Okay. Okay. And my default axis system is here. Component option. Component option. Component option. While While While by default the measurement reports to the shortest distance between the two elements. To obtain the comp- component distance, that is XYZ direction direction direction click on the measure.

_Signals: params:1 · howto:3_

_Source: [CATIA V5 Analysis Tools Explained | Measure, Mass Properties & Inertia | Part 41](https://www.youtube.com/watch?v=W5LstlJkMXY) — channel `Enginuity Lab`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `assembly` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation