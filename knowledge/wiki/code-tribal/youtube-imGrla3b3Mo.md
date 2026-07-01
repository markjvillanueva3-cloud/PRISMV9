---
title: "Reverse Engineering from a 3D Scan with Fusion360... for FREE!"
domain: cad
source: youtube
videoId: imGrla3b3Mo
url: https://www.youtube.com/watch?v=imGrla3b3Mo
channel: "Making for Motorsport"
duration_s: 1721
tribal_entries: 11
chunks_scanned: 40
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Reverse Engineering from a 3D Scan with Fusion360... for FREE!

**Channel:** [Making for Motorsport](https://www.youtube.com/watch?v=imGrla3b3Mo)
**Duration:** 28m 41s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 11 of 40 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.44

> If you want to use a 3D scan of a part like this to make a fully modifiable and usable 3D CAD model using only free soft

If you want to use a 3D scan of a part like this to make a fully modifiable and usable 3D CAD model using only free software, you're in the right place. [Music] [Music] Welcome to Making for Motorsport, where we make more, spend less, and go faster. So consumer grade 3D scanners have exploded over the last couple of years with Creity and Revo point putting out some fantastic models that really bring some great scanning results to within the fingertips, the grasp of home gamers and amateurs in their garage.

_Signals: camOps:3_

### Tip 2 — confidence 0.41

> Now, it doesn't matter which scanner you're using because actually, we're just going to pick up from the SDL

Now, it doesn't matter which scanner you're using because actually, we're just going to pick up from the SDL. So for this I'll simply say I used dry shampoo and scanned it from multiple angles combined them to give me this the final SCCL which leaves us with this 3D model. Before we go any further we just need to work out what we're trying to achieve here. If we just wanted something we could 3D print or something that was just purely a copy of what we've got as far as our scanner can do. Well there it is. We've got it done. Send it to the printer. It's an STL. You can do it straight away.

_Signals: camOps:2_

### Tip 3 — confidence 0.4

> However, that's not what we want to do

However, that's not what we want to do. So, we want to reverse engineer it. So, we want to pull out all of the features that interact with other items that give it its form, its its function, and its fit. So, I want to extract all of these points where it interacts. So, the steering arm, the strut, the brake caliper, the the drive shaft, and extract all that information and put it into a another 3D model that I can then modify and change using parameters. So, that's what we're going to do. But first off, we're going to remove a few things from this model and simplify it slightly.

_Signals: camOps:1 · howto:2_

### Tip 4 — confidence 0.4

> But we don't want to do that

But we don't want to do that. We want to leave for me I like zed to be height. So that works perfectly well. So if we look at it from these various angles angles angles and we turn the origin on that works well enough for me. Now what's the goal? We're going to build a fully prismatic model out of solids. So not surface but solid. So something which we could define in using parameters if we wish to we can change we can measure. And we're going to do that here. And the first pl first and the first thing to start on is to give ourselves a datim right down the middle of the drive flange.

_Signals: camOps:1 · howto:2_

### Tip 5 — confidence 0.42

> So we click on that first and we click that body and you can see it's already selected this plane and we can pull this p

So we click on that first and we click that body and you can see it's already selected this plane and we can pull this plane through and we can use and we can also set if we want to fine-tune it we can do that with that with that with this box here and I'm going to take a section create a sketch section create a sketch section create a sketch on that section there. These orange lines around the spigot on the flange the flange the flange on the drive flange. Click okay. Now that has created a sketch up here called sketch one.

_Signals: howto:7_

### Tip 6 — confidence 0.44

> So we click that and it gives us this little man this little dialogue box here where we can draw lines, we can draw curv

So we click that and it gives us this little man this little dialogue box here where we can draw lines, we can draw curves, arcs, but we're not drawing them. We are fitting them to this. So we really want to fit a circle to these two circles. So if we go to circle and we can click on that one that gives us that gives us that gives us a m and you can see there's a maximum curved deviation there of.18 So it's not far off. So if we click okay there, that gives us and finish sketch. and finish sketch.

_Signals: camOps:2 · howto:3_

### Tip 7 — confidence 0.42

> And that's the easy to do cuz we've got a we've got a we've got a axis

And that's the easy to do cuz we've got a we've got a we've got a axis. So, we can say plane at an angle on that axis 90°. And you can see it's there right down the middle of the drive flange. flange. flange. So that's pretty handy. So we can go to here, create mesh section sketch using that body that body that body and that plane. and that plane. and that plane. And we click okay. And we click okay. And we click okay. And we've got magically another sketch. So I'm going to call that axle axle section. section. section. And if we turn this off, we can see we have essentially cut that in half.

_Signals: camOps:1 · howto:4_

### Tip 8 — confidence 0.44

> So we click okay to that

So we click okay to that. And which has given us given us given us another mesh section sketch. So we'll rename that one rename that one rename that one steering steering steering arm. arm. arm. And we'll do as we did. Go in edit sketch. Turn off the mesh and the body. so we can see it. And that's the job there. there. there. So again, create fit curves to mesh section closed spline. We'll just create a closed spline based on that. And we will create a circle will create a circle will create a circle based on based on based on that. that. that.

_Signals: camOps:1 · howto:6_

### Tip 9 — confidence 0.43

> So, we need a plane down the middle of there

So, we need a plane down the middle of there. Now, the best way of doing that is simply to go back into this sketch and to give myself a construction line that runs broadly that runs broadly that runs broadly down the middle, highlight it, turn into a construction line, turn the bodies on just so I can organize it, organize it, organize it, And then we can do construction plane at an angle. The line is already selected. So I just do 90. And you see we've got that there. So now we can do our same trick again. We can go back to the mesh tab. Create mesh section sketch. Click the mesh.

_Signals: camOps:2 · howto:2_

### Tip 10 — confidence 0.48

> I'm also using constraints and measurements off the part itself to get what I think is going to be the most representati

I'm also using constraints and measurements off the part itself to get what I think is going to be the most representative profile for this steering arm. So, now I've got everything defined. I can just we can finish sketch finish sketch finish sketch and we can pick the bits we want to use as a kind of a delete tool. So we go to extrude and we use cut and we use cut and we use cut and we can pick all of these bits that we want to use as the tool to cut this down with. we go two sides. we go two sides. You can turn the body on.

_Signals: camOps:4 · howto:1_

### Tip 11 — confidence 0.44

> It doesn't really matter It doesn't really matter It doesn't really matter too much

It doesn't really matter It doesn't really matter It doesn't really matter too much. the extents because we're not intersecting any of the bodies. Turn off the construction, turn off the sketches, and we're getting And we're getting pretty close to what is what we should have. And that's the core of the techniques. So, let's just do that a few more times for pretty much everything else. So, it's a dead easy set of instructions. First off, you create a mesh section sketch. Then you right click on that new sketch and edit it. Then you fit curves to mesh section.

_Signals: camOps:2 · howto:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-imGrla3b3Mo-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/imGrla3b3Mo.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].