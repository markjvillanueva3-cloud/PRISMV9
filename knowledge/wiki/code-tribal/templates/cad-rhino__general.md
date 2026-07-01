---
title: "CAD function template — rhino / general"
software: rhino
function: general
source: video-tribal-aggregation
tip_count: 6
videos_covered: 4
generated_at: 2026-05-27
---

# CAD function template — rhino / general

**Software:** `rhino` · **Function category:** `general`
**Source:** aggregated from 6 video tribal tips across 4 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <general> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 6 by confidence)

### Tip 1 (confidence 0.43)

> Now, for example, what if I wanted to change the degree of the curve

Now, for example, what if I wanted to change the degree of the curve? Well, when you create the curve, when you click on creating the curve, you can see that before you start it It gives you the option to choose in the degree here, and by default is degree three. So let me save, let me see if I can create two curves that have the same two, let me see if I can create to grow. So that's going to be I'm going to click on, I'm going to create six points here. And then I'm going to create a curve through control points of degree three. And I'm going to snap to these points.

_Signals: howto:8_

_Source: [4.2 NURBS Geometry in Rhino - Intro to Parametric Modeling](https://www.youtube.com/watch?v=hhDuYLngfSg) — channel `ParametricCamp`_

### Tip 2 (confidence 0.43)

> it's not so now this is awkward and but basically compound um um um and let me try out one thing so compound basically j

it's not so now this is awkward and but basically compound um um um and let me try out one thing so compound basically just takes two transforms and connects them into one connects them into one connects them into one let me try out one thing I will try to connect them in a connect them in a connect them in a wrong wrong wrong order to see if it's actually going to self-correct or not I've never tried this this this because I always do it perfect the first time um um the thing that I did here why it broke was because I first connected the Orient right so the beam right so the beam right so

_Signals: safety:2_

_Source: [How To: Use Rhino BLOCKS as STRUCURAL BEAMS with Grasshopper (BEAMS PART 1)](https://www.youtube.com/watch?v=V5srJHLpAYs) — channel `Gediminas Kirdeikis`_

### Tip 3 (confidence 0.42)

> our current view there's also an option in here or two options in here this is also going to allow us to create a top fr

our current view there's also an option in here or two options in here this is also going to allow us to create a top front and side view in addition to your current view current view current view your current 3d view right here so let's say i was to run this and we're going to go ahead and click on ok notice what this is going to do is this is going to come in here and it's going to create four different views so we've got a top view right here we've got a side view and we've got a front view right here so you can use this in order to really quickly create two dimensional objects in here one

_Signals: camOps:1 · howto:4_

_Source: [Make 2D Drawings from 3D Objects In Rhino with MAKE2D!](https://www.youtube.com/watch?v=nU7plUADyis) — channel `The Rhino Essentials`_

### Tip 4 (confidence 0.41)

> where we I will stop this particular tutorial particular tutorial particular tutorial and I will create another video uh

where we I will stop this particular tutorial particular tutorial particular tutorial and I will create another video uh showcasing I have this prepared I have this prepared I'll create another video in the next video click on it video click on it video click on it if you want to learn how you can actually use this technique to create something like this something like this something like this right right right and uh let's let's zoom into for instance this area instance this area instance this area right so you have right so you have right so you have metal beams metal beams metal beams they

_Signals: howto:6_

_Source: [How To: Use Rhino BLOCKS as STRUCURAL BEAMS with Grasshopper (BEAMS PART 1)](https://www.youtube.com/watch?v=V5srJHLpAYs) — channel `Gediminas Kirdeikis`_

### Tip 5 (confidence 0.4)

> white map so when you connect it to the geometry input you will see nothing happens and um in order for any of the geome

white map so when you connect it to the geometry input you will see nothing happens and um in order for any of the geometry nodes to work nodes to work nodes to work you have to execute the geometry node because these are going to actually deform the geometry deform the geometry deform the geometry as you can see here it takes some time and that is the end result you're actually deforming the geometry when you apply this effect or anytime you change anything here you have to always press the same node and you can deform the actual shape okay so this is going to give you also the similar

_Signals: safety:1 · howto:1_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

### Tip 6 (confidence 0.4)

> need it I don't need it if I type in Block manager you can see that my beam block definition lives here definition lives

need it I don't need it if I type in Block manager you can see that my beam block definition lives here definition lives here definition lives here in this particular file in in this particular block manager if I want to get it into the get it into the get it into the the 3D model manually I would need to type in insert type in insert type in insert insert and here according to the name beam I I can insert it with a specific I don't know what's the word but like specific translation I guess or for the blog uh I can just set okay and wherever I click there's a beam so now if I were to just

_Signals: camOps:1 · howto:2_

_Source: [How To: Use Rhino BLOCKS as STRUCURAL BEAMS with Grasshopper (BEAMS PART 1)](https://www.youtube.com/watch?v=V5srJHLpAYs) — channel `Gediminas Kirdeikis`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `general` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation