---
title: "CAD function template — generic / animation"
software: generic
function: animation
source: video-tribal-aggregation
tip_count: 3
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — generic / animation

**Software:** `generic` · **Function category:** `animation`
**Source:** aggregated from 3 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <animation> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.51)

> down to slow it down this mill changes manually this mill changes manually this mill changes manually pull the motor for

down to slow it down this mill changes manually this mill changes manually this mill changes manually pull the motor forward pull the motor forward pull the motor forward and you can change the belts and now we'll talk about feed rate and that's expressed in inches per minute the feed rate is controlled on this engine lathe by using the tables provided provided provided the feed actuator lever starts the saddle in motion saddle in motion saddle in motion on a cnc feeds and speeds are controlled by mdi through an nc file or through the toolpath manager in a cad file one advanced concept

_Signals: toolpath:1 · camOps:3 · howto:2_

_Source: [Deflection, Eliminating Backlash, Climb vs Conventional Cut, and MORE | Machinist Know How](https://www.youtube.com/watch?v=DjTcNcdHytg) — channel `Practical Machinist`_

### Tip 2 (confidence 0.42)

> To make a new I machining operation

To make a new I machining operation. Click the I machining icon on the solid CAM operation the solid CAM operation the solid CAM operation ribbon. Next we will need to define the machine database. As you could see here, a SS is included with the installation of Solid Cam for other walkthrough exercises. For this exercise, let's create a new machine create a new machine create a new machine database. Under the machine list, click the new icon. A dialogue will prompt us to enter a name for the new machine database. Let's name it HA SS new.

_Signals: howto:7_

_Source: [SolidCAM iMachining Tutorial Series - Video 1](https://www.youtube.com/watch?v=siDRp3yZ7eM) — channel `SolidCAMProfessor`_

### Tip 3 (confidence 0.41)

> before you send the turet home to just lock it back into lock it back into lock it back into g97 because you don't reall

before you send the turet home to just lock it back into lock it back into lock it back into g97 because you don't really want the motor going up and down in RPM as your turret's going back and forward from um its tool change position um into cut because there's no actual reason for that so you could pitch it at like a th000 revs or something just put a g97 s1000 M3 which will start your spindle and everything and then when you get ready to come into cut that's when you apply it and when you finished cutting you can just take it off again so what I'm going to do now is show you a few

_Signals: gcode:1 · howto:1_

_Source: [G96 and G97 on a CNC Lathe (Surface speed and RPM)](https://www.youtube.com/watch?v=SnwBsbtSsq0) — channel `CNC Training Centre`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `animation` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation