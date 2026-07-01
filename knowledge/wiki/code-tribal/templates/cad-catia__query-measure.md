---
title: "CAD function template — catia / query-measure"
software: catia
function: query-measure
source: video-tribal-aggregation
tip_count: 6
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — catia / query-measure

**Software:** `catia` · **Function category:** `query-measure`
**Source:** aggregated from 6 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <query-measure> in <catia>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 6 by confidence)

### Tip 1 (confidence 0.55)

> is this one

is this one. is this one. So, from Z or from the base it is 20 mm. From Y direction it is minus 10 mm. Okay. And from the Okay. And from the Okay. And from the Y axis, X axis it is 135 mm. Okay. And select the keep measure and click on okay to save this in your specification tree. This is the measure item. Next one is the component option. By default, measurement report the shortest distance between two element. You can create another axis system here. How we can create another axis system? Now, our axis system is here. Let's create a point here. This is This is This is 40 mm. This is 40 mm.

_Signals: params:5 · howto:5_

_Source: [CATIA V5 Analysis Tools Explained | Measure, Mass Properties & Inertia | Part 41](https://www.youtube.com/watch?v=W5LstlJkMXY) — channel `Enginuity Lab`_

### Tip 2 (confidence 0.44)

> click on the measure

click on the measure. click on the measure. Then click on the circle. You can see the X, Y and Z length are different. Okay. Okay. Okay. Again, if I do the same thing but in a different way. Select the circle and then on the other axis I will select my newly created axis here. Okay. Here you can see the X, Y and Z distances are changed. distances are changed. distances are changed. Now, the X distance is zero, Y is 15 and Z is 20 mm. This is how we can select the component options. the component options. the component options. Now, the mass properties. Now, the mass properties.

_Signals: params:1 · howto:6_

_Source: [CATIA V5 Analysis Tools Explained | Measure, Mass Properties & Inertia | Part 41](https://www.youtube.com/watch?v=W5LstlJkMXY) — channel `Enginuity Lab`_

### Tip 3 (confidence 0.43)

> All measurements can be saved in a specification tree by selecting the keep measure option

All measurements can be saved in a specification tree by selecting the keep measure option. Okay. Okay. You will save the measurement uh on your specification tree when we click on the keep measure option. Like if I click on measure tool and here I can select the keep measure. keep measure. keep measure. Then this will Then this will Then this will save the measurement in the specification tree. Okay. For specification tree. Okay. For specification tree. Okay. For measurement anything, let's create a simple 3D model to analyze the tool. tool. tool. For that, what I will do click on any plane.

_Signals: camOps:1 · howto:5_

_Source: [CATIA V5 Analysis Tools Explained | Measure, Mass Properties & Inertia | Part 41](https://www.youtube.com/watch?v=W5LstlJkMXY) — channel `Enginuity Lab`_

### Tip 4 (confidence 0.43)

> So So So before measuring, let's see what are the elements to select

So So So before measuring, let's see what are the elements to select. elements to select. elements to select. When we are selecting elements for measurement the pointer indicates the type of element being select selected. The following types of element can maybe indicated. indicated. indicated. When we When we When we click on measure click on measure click on measure and the pointer it's going to select the element being element being element being give the measurement. give the measurement. give the measurement. Here the pointer indicates the type of element being selected.

_Signals: howto:8_

_Source: [CATIA V5 Analysis Tools Explained | Measure, Mass Properties & Inertia | Part 41](https://www.youtube.com/watch?v=W5LstlJkMXY) — channel `Enginuity Lab`_

### Tip 5 (confidence 0.43)

> In measure item the measure item tool allow you to measure individual geometric element measure individual geometric ele

In measure item the measure item tool allow you to measure individual geometric element measure individual geometric element measure individual geometric element using following steps to measure an item. item. item. Okay. Click on the measure item and click on any click on any click on any like here. like here. like here. We can click on We can click on We can click on Here also you can see Now, when I move my mouse you can see the symbol. Here it is the cylindrical object. If I click on here then this will select then this will select then this will select only the individual item.

_Signals: howto:11_

_Source: [CATIA V5 Analysis Tools Explained | Measure, Mass Properties & Inertia | Part 41](https://www.youtube.com/watch?v=W5LstlJkMXY) — channel `Enginuity Lab`_

### Tip 6 (confidence 0.43)

> We can calculate 3D mass properties with the measure inertia tool

We can calculate 3D mass properties with the measure inertia tool. the measure inertia tool. the measure inertia tool. For that, select the measure inertia icon. icon. icon. Select the part body from the specification tree. specification tree. specification tree. Okay. Okay. Okay. Select the part body. Select the part body. Select the part body. Then review the result in the display window. Here you can see Here you can see Here you can see a display in the display window. You can review your properties. Here we have two body, so it will calculate calculate calculate both. both. both.

_Signals: camOps:1 · howto:5_

_Source: [CATIA V5 Analysis Tools Explained | Measure, Mass Properties & Inertia | Part 41](https://www.youtube.com/watch?v=W5LstlJkMXY) — channel `Enginuity Lab`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `query-measure` operations in `catia`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation