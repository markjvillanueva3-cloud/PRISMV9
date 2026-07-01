---
title: "CAD function template — solidworks / assembly"
software: solidworks
function: assembly
source: video-tribal-aggregation
tip_count: 7
videos_covered: 5
generated_at: 2026-05-27
---

# CAD function template — solidworks / assembly

**Software:** `solidworks` · **Function category:** `assembly`
**Source:** aggregated from 7 video tribal tips across 5 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <assembly> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 7 by confidence)

### Tip 1 (confidence 0.52)

> SolidWorks collects several features to render your 3D project

SolidWorks collects several features to render your 3D project. Use Display Style to change the preview mode and Apply Scene to set different lights and environment. As you finish designing your 3D component you can save it with File, Save As in a .sldprt Part file. Even if your Part project collects multiple Sketches and Features SolidWorks sees it as single 3D component, so part of a complete and complex design. To join all these 3D components together you must open an Assembly project by going to New, Assembly.

_Signals: camOps:5 · howto:2_

_Source: [SolidWorks - Tutorial for Beginners in 13 MINUTES!  [ COMPLETE ]](https://www.youtube.com/watch?v=CiBwrjUeB8U) — channel `Skills Factory`_

### Tip 2 (confidence 0.48)

> There are three kinds of projects: Part is used to build 2D drawings or single 3D components; Assembly to combine these

There are three kinds of projects: Part is used to build 2D drawings or single 3D components; Assembly to combine these 3D components together and Drawing to get a 2D description of any built component, very useful to realize documents. To see how to use SolidWorks, let's start with a Part project. This opens a big preview with the Command Manager on top - with the main tools to draw and edit - and several panels divided in sections for additional options. You can find further tools from View, Toolbars. At first you may need to set the main project properties, such as the units to use.

_Signals: camOps:4 · howto:1_

_Source: [SolidWorks - Tutorial for Beginners in 13 MINUTES!  [ COMPLETE ]](https://www.youtube.com/watch?v=CiBwrjUeB8U) — channel `Skills Factory`_

### Tip 3 (confidence 0.41)

> At this point import your first component from the left - becoming your main reference

At this point import your first component from the left - becoming your main reference. Then import all the others with Layout, Insert Component. Except for the reference you can select any Part to move or rotate it. You can also right-click on it and go to Edit Part to modify its Features and Sketches. The first time you must save your Assembly project in a .sldasm file. As you finish editing any Part you can return back by right-clicking on the first level and going to Edit Assembly. Moreover you can go to Appearances to apply a particular material to the selected Part.

_Signals: camOps:1 · howto:3_

_Source: [SolidWorks - Tutorial for Beginners in 13 MINUTES!  [ COMPLETE ]](https://www.youtube.com/watch?v=CiBwrjUeB8U) — channel `Skills Factory`_

### Tip 4 (confidence 0.41)

> there's several Wizards we're going to go ahead and start by using the routing component Wizard and I start off by selec

there's several Wizards we're going to go ahead and start by using the routing component Wizard and I start off by selecting the routing type which is electrical and what type of component which this is a connector so we'll start off by adding our first C Point you'll see all I do is select a face and a point and it creates that c point for us and now I'll go ahead and select the diameter and length for the stud that's going to be popped out of here when I drop this in an assembly and then the really important field is the 2D schematic pin ID so we're going to have to call each one each C

_Signals: camOps:1 · howto:3_

_Source: [SOLIDWORKS Routing-Electrical - Cables](https://www.youtube.com/watch?v=JESQEXxDnYQ) — channel `GoEngineer`_

### Tip 5 (confidence 0.41)

> Then click the connection point of the margin wire tie clips and the connectors with no wire to create new branches

Then click the connection point of the margin wire tie clips and the connectors with no wire to create new branches. Now go to the assembly tab and click edit component to exit the editing mode of the harness. If the wires path is not as desired, you can move the wire tie clips and click rebuild to modify it. You can now exit isolate. Save the assembly and select save internally for the virtual components. components. components. Hit rebuild to get rid of any graphics problem. The biggest benefit of routing a robot using Solid Works is that we can determine the length of wire we need to buy.

_Signals: howto:6_

_Source: [Unit 6: Routing - Lesson 1: Routing Wires](https://www.youtube.com/watch?v=r-Yc3Ib5JH4) — channel `SOLIDWORKS`_

### Tip 6 (confidence 0.41)

> I could also do a blank one and that means that I would have to know all of the fields and things to um add the the fiel

I could also do a blank one and that means that I would have to know all of the fields and things to um add the the fields and things to sort of create it from scratch. But I'm going to let it auto create autopop populate. I'm going to click okay. going to click okay. going to click okay. And I get an Excel sheet. So it's already got the names of my configurations here. configurations here. configurations here. Okay. It's got the description from the description field of configurations. And by default, I didn't change these. Notice that this still says default.

_Signals: howto:6_

_Source: [SolidWorks: Control Global Variables Across Configurations with Design Tables](https://www.youtube.com/watch?v=xdh7w3Egj4c) — channel `Brad Peirson`_

### Tip 7 (confidence 0.4)

> use the out-of-the-box connectors and cables i can go to the electrical tab and select start by drag drop that opens up

use the out-of-the-box connectors and cables i can go to the electrical tab and select start by drag drop that opens up the design library in the task pane and navigates to the electrical subfolder you can also browse directly to this folder in the design library and drag the connector into the assembly without using that command using that command using that command i see the three pin female connector that i'd like to use and i'll drop it on the fan the fan the fan see how it snaps to the connector on the fan there's a mate reference in both of these parts that causes that behavior i'll

_Signals: howto:5_

_Source: [SOLIDWORKS: Electrical Routing Basics](https://www.youtube.com/watch?v=UveKaws3RyE) — channel `Hawk Ridge Systems`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `assembly` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation