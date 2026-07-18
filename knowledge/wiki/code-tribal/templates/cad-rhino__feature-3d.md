---
title: "CAD function template — rhino / feature-3d"
software: rhino
function: feature-3d
source: video-tribal-aggregation
tip_count: 7
videos_covered: 4
generated_at: 2026-05-27
---

# CAD function template — rhino / feature-3d

**Software:** `rhino` · **Function category:** `feature-3d`
**Source:** aggregated from 7 video tribal tips across 4 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <feature-3d> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 7 by confidence)

### Tip 1 (confidence 0.44)

> blender fillet blender fillet blender fillet in the intersection it's not joined sorry it's not joined sorry it says Sup

blender fillet blender fillet blender fillet in the intersection it's not joined sorry it's not joined sorry it says Supply affiliate to this hedge okay let's see if it's working how it should how it should how it should yeah there you go yeah there you go yeah there you go right so that's the final result might use a higher degree but anyways higher radius sorry higher radius sorry higher radius sorry that's the end result okay all right so the next step is we are almost there we are done with the modeling so for the support for the armrest you're just using some profiles you're blending the

_Signals: camOps:3_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

### Tip 2 (confidence 0.42)

> themselves so these boundaries these pieces we can simply turn them as boundary surfaces but to turn the this top row le

themselves so these boundaries these pieces we can simply turn them as boundary surfaces but to turn the this top row let me actually hide everything before doing this so this row these triangles already converted to surfaces but to do that to the top part we actually need to combine this data so I need to associate each boundary with its scale boundary and we can do it by leaving the data so here we have 176 curves and here we have another 176 and these are scaled and if you right click here and graphed both of these streams these will be put into containers of 2 and here you can type in

_Signals: camOps:2 · howto:1_

_Source: [Parametric Surface Panels Grasshopper Tutorial](https://www.youtube.com/watch?v=n9ErBxRWAtY) — channel `Parametric`_

### Tip 3 (confidence 0.41)

> tutorial will be recorded yes you can watch the stream again using the same YouTube link um um is there a reason the sea

tutorial will be recorded yes you can watch the stream again using the same YouTube link um um is there a reason the seat curves were not projected we have talked about this before before before in case you need a slight radius to the corners how do you do that I guess you were talking about the solid profile for the Y support you can just add a solid fillet here okay you just have to be careful about the radius but you should be able to apply the fillet okay now of course we are not really careful about the the uh as you can see the topology so another way to resolve this issue is by

_Signals: camOps:2_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

### Tip 4 (confidence 0.41)

> careful on how you use this tool but it helps you create fillet on complex Parts complex Parts complex Parts just inside

careful on how you use this tool but it helps you create fillet on complex Parts complex Parts complex Parts just inside keyshot with a single parameter okay how do you create those lights those light panels you just add a panel sorry a plane so you go to Geometry add a plane add a plane add a plane and you convert that plane into a light source okay okay so that's how we are creating the lines you can increase and decrease the intensity as per your requirement okay okay all right so yeah let's uh stop with these examples here you can of course play around with the parameters create different

_Signals: camOps:1 · howto:3_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

### Tip 5 (confidence 0.41)

> just randomly so one here here here and one here so what we're going to do is connect them using where these two interse

just randomly so one here here here and one here so what we're going to do is connect them using where these two intersect we do 90 degrees so where are these two in the midpoint where they intercept where they intercept where they intercept we do 90 degrees same thing here same thing here same thing here now once we extend those that's where we start getting the pattern start getting the pattern start getting the pattern so if we extend this one we extend this one we extend this one and between these two we have this one if we had another point then there would be a perpendicular here

_Signals: params:2_

_Source: [Understanding and using Voronoi Process Rhino and Grasshopper Parametric Architecture and Design](https://www.youtube.com/watch?v=X6L2nO_b2tE) — channel `DCO Parametric`_

### Tip 6 (confidence 0.4)

> it's not yeah you can see slightly here here here okay you can also exaggerate the effect by increasing and decreasing t

it's not yeah you can see slightly here here here okay you can also exaggerate the effect by increasing and decreasing the bump height so as you can see I'm exaggerating the height you can also change the shape of that note note note so I can go back to the shape and pattern and change it to lines so you can see now we have lines black and white lines and we can use these black and white lines to add that bump effect okay so now you can see we have this really interesting wavy pattern okay so if the bump is set to zero there is no wavy pattern set to one you have subtle bump effect if you set

_Signals: howto:5_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

### Tip 7 (confidence 0.4)

> in this tutorial we will look at the pipe and sweep command so let's go ahead and create a few curves I'm going to make

in this tutorial we will look at the pipe and sweep command so let's go ahead and create a few curves I'm going to make four curves and then let's look at the pipe command so select the first curve and type in pipe and you'll have a few options here either you can interactively choose the radius by just using your mouse on the screen or if you want to be precise about it you can type in a value here so I'll just type in 3 and then the other thing you can do is change that if you want to add a thickness you can add a thickness or you can change the cap I'll just go ahead and select cap and

_Signals: howto:5_

_Source: [Rhino 6 3D CAD Software | Pipe and Sweep](https://www.youtube.com/watch?v=SXrwwC8OLuw) — channel `Kory Bieg`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `feature-3d` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation