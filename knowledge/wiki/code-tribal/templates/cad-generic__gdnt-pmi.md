---
title: "CAD function template — generic / gdnt-pmi"
software: generic
function: gdnt-pmi
source: video-tribal-aggregation
tip_count: 38
videos_covered: 21
generated_at: 2026-05-27
---

# CAD function template — generic / gdnt-pmi

**Software:** `generic` · **Function category:** `gdnt-pmi`
**Source:** aggregated from 38 video tribal tips across 21 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <gdnt-pmi> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 8 by confidence)

### Tip 1 (confidence 0.58)

> Finally, interference fit where the shaft is always larger than the hole for permanent tight fits used for pressfitit be

Finally, interference fit where the shaft is always larger than the hole for permanent tight fits used for pressfitit bearings and railway wheels on axles such as H7/P6. such as H7/P6. such as H7/P6. Let's look at practical examples. For a bearing fit like H7/G6, bearing fit like H7/G6, bearing fit like H7/G6, the holes H7 tolerance starts at nominal with EI equals zero, and the G6 shaft is slightly smaller. This results in a perfect running clearance for smooth operation, commonly used in ball bearings and machine tools.

_Signals: gcode:4 · safety:2_

_Source: [ISO 286 Tolerance System | IT Grades, Limits & Fits Explained with Examples](https://www.youtube.com/watch?v=q4NOYAM-tEc) — channel `Simplegyan`_

### Tip 2 (confidence 0.53)

> First clearance fit where the shaft is always smaller than the hole allowing free movement

First clearance fit where the shaft is always smaller than the hole allowing free movement. Examples like H7/G6 H7/G6 H7/G6 and H8/F7 and H8/F7 and H8/F7 for bearings. Next, transition fit, which can sometimes be clearance and sometimes interference for controlled sometimes interference for controlled sometimes interference for controlled tightness. Ideal for gear hubs and couplings like H7/K6 couplings like H7/K6 couplings like H7/K6 and H8/JS7. and H8/JS7. and H8/JS7.

_Signals: gcode:3 · safety:4_

_Source: [ISO 286 Tolerance System | IT Grades, Limits & Fits Explained with Examples](https://www.youtube.com/watch?v=q4NOYAM-tEc) — channel `Simplegyan`_

### Tip 3 (confidence 0.5)

> into variable output into variable output into variable pound one three we will then save the value value value of pound

into variable output into variable output into variable pound one three we will then save the value value value of pound 138 to pound 100 for our analysis let's assume that for our bore our bore our bore of diameter 1.20 we have a tolerance of plus or minus plus or minus plus or minus 5 thou therefore anything between 1.195 and 1.205 1.195 and 1.205 1.195 and 1.205 should be accepted because this is a bore bore bore any diameter greater than 1.205 has had too much material removed and must be rejected must be rejected must be rejected any diameter less than 1.195 has had too little material

_Signals: camOps:6_

_Source: [How to Program a Renishaw Probe to Automatically Adjust Tool Offsets and Recut Parts](https://www.youtube.com/watch?v=9onq3zqjGCA) — channel `automatedmfg`_

### Tip 4 (confidence 0.5)

> call out looks like this when the callout is applied to a surface it defines a tolerance zone between two parallel plane

call out looks like this when the callout is applied to a surface it defines a tolerance zone between two parallel planes that are separated by the distance shown in the feature control frame control frame control frame all manufactured parts are imperfect for a part to meet this tolerance all points on the surface must be located within the tolerance Zone the two planes defining the tolerance zone are parallel to each other but they don't have to be parallel to any other surfaces flatness tolerances are often specified on surfaces that mate with other parts and need to have even contact like

_Signals: toolpath:3_

_Source: [Understanding GD&T](https://www.youtube.com/watch?v=G7wnGeR_69k) — channel `The Efficient Engineer`_

### Tip 5 (confidence 0.49)

> Now, if you're tightening up those tools by hand

Now, if you're tightening up those tools by hand... This is really an "introduction to macros" video disguised as a "probe your part and adjust your tool offset" video. Walking through this one example, will really give us an idea of how macros work on our Haas mill and lathe. Here's our application. We have a part with a 1.3 inch bore in it, that needs to be held to plus or minus one thousandths of an inch. I want the machine to probe that bore, and adjust my tool for me, keeping us right in the middle of our tolerance.

_Signals: camOps:3 · params:1 · howto:2_

_Source: [Automate Using Your Probe! Make the Most of Your Probe with Macros – Haas Automation Tip of the Day](https://www.youtube.com/watch?v=1l1RbDgkbng) — channel `Haas Automation, Inc.`_

### Tip 6 (confidence 0.48)

> tolerances next they're used to control the angles between features between features between features parallelism contro

tolerances next they're used to control the angles between features between features between features parallelism controls how close a feature is to being parallel to a datum the tolerance zone is defined by two planes that are parallel to the specified datum specified datum specified datum [Music] perpendicularity works in the same way but the tolerance zone is at 90 degrees to the datum and angularity is a more General orientation tolerance that controls the angle between a feature and a datum when applied to features of size the orientation tolerances apply to the center plane or axis of

_Signals: toolpath:2 · params:1_

_Source: [Understanding GD&T](https://www.youtube.com/watch?v=G7wnGeR_69k) — channel `The Efficient Engineer`_

### Tip 7 (confidence 0.47)

> ISO 286 defines IT grades from the finest IT01, IT0, IT1 up to the coarsest IT16

ISO 286 defines IT grades from the finest IT01, IT0, IT1 up to the coarsest IT16. Generally IT5 to IT7 are for precision machining, IT8 to IT10 for general machining and IT11 to IT13 for casting or forging processes. For a 50 mm size, an IT6 tolerance is approximately 0.016 mm, meaning a 50 mm IT6 shaft can vary only by about plus or minus 0.008 mm, which is extremely precise. ISO 286 defines both whole basis and shaft basis systems with the whole basis system being most common due to easier manufacturing when the holes EI equals zero. There are three main types of fits.

_Signals: params:4_

_Source: [ISO 286 Tolerance System | IT Grades, Limits & Fits Explained with Examples](https://www.youtube.com/watch?v=q4NOYAM-tEc) — channel `Simplegyan`_

### Tip 8 (confidence 0.47)

> just drags you to an absolute halt um so that that might be important what you need to understand need to understand nee

just drags you to an absolute halt um so that that might be important what you need to understand need to understand need to understand is the tool paths you're getting and I'm going to make a blanket statement here that I hope I don't regret and just about every situation that I'm aware of the tool paths that are being generated are being are being are being generated with respect to your tool path tolerances against the 3D model the way it looks on the screen does not matter if you have a part that you know is a round 3D uh solid or or model and you set the tessellation tolerance to be

_Signals: toolpath:1 · camOps:2 · howto:1_

_Source: [Let's learn hyperMILL, EP1 INTERFACE](https://www.youtube.com/watch?v=XIbd8qPQDoQ) — channel `Michael Jacobs`_

_+30 more tips at confidence ≥ 0.4 in [[knowledge/wiki/code-tribal/youtube-*.md]] — search via tribal-by-domain-inject._

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `gdnt-pmi` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation