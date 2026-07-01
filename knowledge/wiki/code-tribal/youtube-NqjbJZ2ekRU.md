---
title: "Fusion T-splines are easy! | Day 27 of Learn Fusion 360 in 30 Days - 2024 EDITION"
domain: cad
source: youtube
videoId: NqjbJZ2ekRU
url: https://www.youtube.com/watch?v=NqjbJZ2ekRU
channel: "Product Design Online"
duration_s: 677
tribal_entries: 15
chunks_scanned: 18
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Fusion T-splines are easy! | Day 27 of Learn Fusion 360 in 30 Days - 2024 EDITION

**Channel:** [Product Design Online](https://www.youtube.com/watch?v=NqjbJZ2ekRU)
**Duration:** 11m 17s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 15 of 18 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.43

> welcome to day number 27 of learn Fusion 360 in 30 days today you'll experiment with t-lines we'll start with the basics

welcome to day number 27 of learn Fusion 360 in 30 days today you'll experiment with t-lines we'll start with the basics creating a simple 3D printable vase and finish with a complex Twisted version Fusion's toolbar includes solid surface and mesh modeling however you may have noticed this purple icon in the toolbar selecting create form will place us in a form contextual environment form form contextual environment form form contextual environment form modeling is commonly known as t-spline modeling t-lines are are a technique used to create complex and organic shapes they give us the ability

_Signals: camOps:2 · howto:2_

### Tip 2 — confidence 0.46

> to push pull stretch and extrude the various faces and edges that make up the model start by activating the cylinder pri

to push pull stretch and extrude the various faces and edges that make up the model start by activating the cylinder primitive we'll select the XY origin plane to sketch plane to sketch plane to sketch on select the origin point for the center of our cylinder and select again to set the circle we can Define the width of our cylinder in the dialogue along with design Primitives you can also start t-lines with extrude sweep revolve and Loft when designing with t-lines it's important to start with a shape closest to the final design this first face will be 75 mm in width and 250 mm in height we

_Signals: params:2 · howto:5_

### Tip 3 — confidence 0.4

> can then Define the number of faces for both the diameter and height faces refer to the flat or curved surfaces that mak

can then Define the number of faces for both the diameter and height faces refer to the flat or curved surfaces that make up the t-spline model each face is bounded by edges and vertices edges faces and and vertices are how we manipulate the form the key with t-spline modeling is to keep the number of faces relative to the shape of the design too many faces will make it too hard to manage while too few faces may make it hard to achieve the curvature or desired shape let's set the diameter faces to eight and the height faces to six this gives us a rough starting point for the sections we'll

_Signals: camOps:1 · howto:2_

### Tip 4 — confidence 0.43

> use to shape the design select okay to create the create the create the cylinder notice we can now select individual fac

use to shape the design select okay to create the create the create the cylinder notice we can now select individual faces edges and individual faces edges and individual faces edges and vertices let's select a face three rows up from the bottom while holding the shift key we can double click on the face next to it which selects the entire row to manipulate the form we'll typically start with the edit form tool in the toolbar or from the right click marking marking marking menu notice the different icons that allow us to alter our selection in different directions the very center icon

_Signals: howto:8_

### Tip 5 — confidence 0.43

> scale this selection notice this gives us a completely different result completely different result completely different

scale this selection notice this gives us a completely different result completely different result completely different result result perhaps we want to make the stem of the vase narrower let's double click on the very top Edge to select the entire Edge if we tried scaling this it would only make the very top narrower I'll undo that and let's also double click the second and third edges as well while holding the shift key holding the shift key lets us add more than one selection we're now scaling everything together which results in a smooth and narrow narrow narrow Contour let's also make

_Signals: toolpath:1 · howto:3_

### Tip 6 — confidence 0.47

> active we can click and drag to perform a window selection over them press the delete key to remove them let's select th

active we can click and drag to perform a window selection over them press the delete key to remove them let's select the top edge of the vase and increase the scale a little bit this completes the first base design in just a matter of minutes we were able to create this curved organic shape using t-splines something that would have required more sketches in time with solid or Surface modeling when the design is complete we'll need to select finish form in the toolbar this will convert the design to a Surface body if not fully closed or a solid body when fully closed to make this 3D printable

_Signals: camOps:2 · howto:6_

### Tip 7 — confidence 0.47

> we'll later look at how to apply a bottom and a desired wall thickness let's start the more complex Twisted base open th

we'll later look at how to apply a bottom and a desired wall thickness let's start the more complex Twisted base open the provided DMO file which includes a sketch with a side profile of the profile of the profile of the vase after entering the form en Enon we'll use the form revolve tool select the outer spline as the profile in our Center Line as the axis most of our changes will be in the vertical Direction so let's set the number of horizontal faces to four this is the fewest amount without altering our contour and we can always add more later we'll set the number of vertical faces to

_Signals: toolpath:1 · safety:1 · howto:3_

### Tip 8 — confidence 0.44

> faces to faces to 20 lastly we want to turn on symmetry symmetry will allow us to edit a single edge or face and the res

faces to faces to 20 lastly we want to turn on symmetry symmetry will allow us to edit a single edge or face and the rest of them will update keeping the object symmetrical these green lines let us know that we have symmetry we can double click one of the edges to select the entire row and notice everything turns yellow yellow informs us that items with symmetry are selected to create our Twisted shape we need to have small faces that we can pull away from the center axis to do this we'll right click and select insert Edge this is going to let us add a new Edge line let's set the distance to

_Signals: camOps:1 · howto:6_

### Tip 9 — confidence 0.4

> 0

0.1 which represents 10% of the distance between the selected Edge and the next Edge after selecting okay you'll find the edge is inserted all the way around because of our because of our because of our symmetry let's double click to select the entire Edge again this time we'll use the crease tool from the modify menu this turns our smooth surface into a sharp a sharp a sharp connection notice the edges now have a sharp connection and our vase is no longer longer longer smooth we're going to pull this Edge out further creating the rib shape around the model double click to select an edge and

_Signals: howto:5_

### Tip 10 — confidence 0.51

> we'll use the edit form tool our single directional Arrow may not be parallel to the selected Edge this can be problemat

we'll use the edit form tool our single directional Arrow may not be parallel to the selected Edge this can be problematic since we don't want the faces to overlap and we want to pull away from the center axis in the edit form dialogue we can change our coordinate space from the world space to the selection the selection the selection space notice how the arrow is now parallel to the edge this will allow us to drag the arrow to create the sharp edge that we're looking for let's type out -7 mm for the distance we're now ready to give the Twisted look to the model before we start twisting the

_Signals: toolpath:2 · params:1 · howto:3_

### Tip 11 — confidence 0.49

> model we'll need to turn off the turn off the turn off the Symmetry we'll use Clear Symmetry and select the select the s

model we'll need to turn off the turn off the turn off the Symmetry we'll use Clear Symmetry and select the select the select the model notice the green lines disappear and the Symmetry is now turned off looking at at the model from the front view we'll do a window selection over the top three the top three the top three rows using edit form we'll have to look at this from a perspective so we can drag the correct angle slider to start twisting the vase let's make the first twist 45° and for each one we'll use 10° less we can keep edit form active and select the top two rows make sure to do

_Signals: camOps:3 · howto:5_

### Tip 12 — confidence 0.42

> this while looking at the front view so we don't select any other faces we'll make this 35° and then repeat the process 

this while looking at the front view so we don't select any other faces we'll make this 35° and then repeat the process for the top row making it 25° we now have a relatively complex Twisted base created with a few simple steps using t-splines this can be a lot of fun to experiment with just make sure faces don't intersect with each other if faces intersect the model will not convert When selecting finish form in the tool bar bar we'll end up with a Surface body once again so let's look at how to prepare both of these base designs for 3D printing firstly if we zoom in on the top or bottom

_Signals: camOps:2 · howto:1_

### Tip 13 — confidence 0.44

> you'll notice it's no longer flat because we Twisted the shape we'll want to fix this by slicing the Surface body let's 

you'll notice it's no longer flat because we Twisted the shape we'll want to fix this by slicing the Surface body let's create an offset construction plane make it 1 mm from the origin plane ensuring we cut enough away from the enough away from the enough away from the bottom repeat the offset plane making this 270 mm from the origin plane with split body we'll select our Surface body as the body to split and then both construction planes as the splitting tools I recommend selecting these in the browser so we know we don't select the origin plane by accident after splitting we'll have three

_Signals: params:2 · howto:3_

### Tip 14 — confidence 0.45

> surface bodies in the browser let's rename the main vase one that we need to need to need to keep we can then right clic

surface bodies in the browser let's rename the main vase one that we need to need to need to keep we can then right click on the other two selecting remove to remove them remove is parametric and recorded in our timeline allowing us to undo the action if action if action if needed we discussed some of fusion surface modeling tools on day number 25 when working with t-lines you'll find that many workflows require you to finish with surface modeling in our case we'll use the patch command to close off the bottom of the base select the bottom Contour which results in a new Surface body we can

_Signals: toolpath:1 · camOps:1 · howto:2_

### Tip 15 — confidence 0.45

> then use Stitch to combine all of these surface bodies resulting in a single Surface a single Surface a single Surface b

then use Stitch to combine all of these surface bodies resulting in a single Surface a single Surface a single Surface body with thicken we can define a desired thickness to the surface Sur such as 2 mm as an alternative we can delete the thicken command in our timeline let's double click to edit the patch command and select the top of our base as well we can then edit our Stitch fully enclosing the volume which turns this into a solid 3D body this would allow us to use the shell command to hollow out the body for different effects you can also apply chamfers or fillets to the creased edges

_Signals: camOps:1 · params:1 · howto:4_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-NqjbJZ2ekRU-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/NqjbJZ2ekRU.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].