---
title: "Fusion 360 – Step-by-Step for Absolute Beginners (Part 5  Shape Design Topology Optimization)"
domain: cad
source: youtube
videoId: VBWm-pE_Uzc
url: https://www.youtube.com/watch?v=VBWm-pE_Uzc
channel: "Tutorials - Mechanical Engineering"
duration_s: 1634
tribal_entries: 12
chunks_scanned: 35
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Fusion 360 – Step-by-Step for Absolute Beginners (Part 5  Shape Design Topology Optimization)

**Channel:** [Tutorials - Mechanical Engineering](https://www.youtube.com/watch?v=VBWm-pE_Uzc)
**Duration:** 27m 14s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 12 of 35 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.52

> Uh roughly I can give you some dimension here

Uh roughly I can give you some dimension here. If I click on inspect here, this side is uh 40 mm. 40 mm. 40 mm. This side This side This side again if I click on the spec is about 100 mm. So 100 140 and we have two let's say joint here which radius is around radius is around um 4 mm diameter 8 mm or if you have the file then that's easy as well in case you want to do it in fusion or in solid work. So what is this component? It's uh let's assume that this is an arm for a robot and it's a simple arm. There are two pins here. Perhaps it rotate around this pin and rotate around that pin.

_Signals: params:6 · howto:2_

### Tip 2 — confidence 0.42

> So initially we run a simulation a simple simple simulation

So initially we run a simulation a simple simple simulation. I simulation. I simulation. I click solve click solve click solve and which uh you can do that. Let's just click that one click that one click that one and we run the simulation. All right. And then click solve the study which I already did. I'm just going to jump to the uh analysis. No, not that one. No, not that one. Not that one. Is this the one that you're Yes, this is the one. So, the one. So, the one. So, um, but you can do the analysis on your own. I just, uh, try to avoid wasting time here. I'm just showing you the result.

_Signals: howto:7_

### Tip 3 — confidence 0.42

> Let's click cancel

Let's click cancel. component. Let's click cancel. Right. So this is the file that we opened. opened. opened. Let me save that file. Of course, I have it in a different folder on my create when I create it. Um, Um, Um, I can also go to that Yes. Right. For you, it should appear there. Okay. For me, it's perhaps somewhere in maybe somewhere that before I did the the test. All right. So, this is the file. We open it. Now, go to it. Now, go to it. Now, go to the simulation and this time I select shape optimization. shape optimization. shape optimization. Create a study. Create a study.

_Signals: howto:7_

### Tip 4 — confidence 0.43

> Well you can leave it as is but since we want to do a shape optimization we better have a smaller mesh size uh or a smal

Well you can leave it as is but since we want to do a shape optimization we better have a smaller mesh size uh or a smaller pixels more accuracy. Click on mesh and then click on absolute size. So if you recall I gave you some initial measurement the largest initial measurement the largest initial measurement the largest dimension on this one was around 100 mm. So maybe 10 mm is a bit large. So it when we do a final element analysis it means we are breaking down a big component to a small elements.

_Signals: params:2 · howto:2_

### Tip 5 — confidence 0.51

> So 100 mm if my absolute size is 10 millimeters it means I'm breaking down it to pixel size of let's say 10 which is a b

So 100 mm if my absolute size is 10 millimeters it means I'm breaking down it to pixel size of let's say 10 which is a bit um coarse I would say so I select 1 mm uh this is going to takes longer for analysis but gives me more accurate result okay so it's a little bit experience to play with it but roughly let's say if your largest dimension is 100 mm maybe um mesh size of 1 mm would be a right size and then click okay. So after we've done that one, we just simp uh simply click solve. All right. So before I click solve, a quick review, we started from left here.

_Signals: params:4 · howto:4_

### Tip 6 — confidence 0.4

> Under shape optimization, we select the target body preserve region, the area that we don't want to touch

Under shape optimization, we select the target body preserve region, the area that we don't want to touch. And then our criteria we wish to reduce the weight by 50% have the maximum stiffness and and this shape because it's a plate we wish it to be uh symmetric. We select our material our constraint to pin on this here and then we select two loads there and simply and then on the setting our we set up our mesh size. And then I click solve. Give it few seconds. So it check with the server and yes it's educational. We have unlimited access. unlimited access. unlimited access.

_Signals: howto:5_

### Tip 7 — confidence 0.43

> When it says uh create the mesh there, create the mesh there, create the mesh there, convert the shape optimize to a new

When it says uh create the mesh there, create the mesh there, create the mesh there, convert the shape optimize to a new mesh body. You see that one? I click on that one. one. one. Right. And now this little window pops up. up. up. Rather than existing simulation model, select the design workspace. select the design workspace. select the design workspace. Select the design workspace and click okay. All right. This is what we got. Now we have the map that where we should start removing the material roughly. So at this point I click on this.

_Signals: howto:10_

### Tip 8 — confidence 0.42

> You see I'm on a design workspace and what I see here roughly tell me that those meshed area should be kept but those so

You see I'm on a design workspace and what I see here roughly tell me that those meshed area should be kept but those solid area can be removed. Right? In other word in other word if I turn off the uh the mesh here you see the entire body. So I'm turning on and off. And if I'm uh turning off the body, it tells me roughly the body that you can have. can have. can have. Right? So I turn on both. Right? And now I select a sketch on this plane. on this plane. Right? So what I need to do I can I should start quickly drawing some sketches following this line so I can cut the material. That's easy.

_Signals: camOps:2 · howto:1_

### Tip 9 — confidence 0.42

> Hopefully we learn how to do that

Hopefully we learn how to do that. So let's start. I click on the line here. Maybe I'll go with one line there. with one line there. with one line there. Line there. And maybe I'll do that one. And then enter. Let me see if I turn it off. You can see better. No. Okay. Um, and now let's just do a circle in roughly that. in roughly that. in roughly that. Next, what I will do, I'll do the trim. I just do it for a few of them. So, you see, I trim that part. And then maybe I'll fill it I'll fill it I'll fill it this corner with that corner 2 mm.

_Signals: camOps:1 · params:1 · howto:1_

### Tip 10 — confidence 0.48

> Um, obviously you need to add some dimension but for now for the sake of time I'm just quickly do that one so you get an

Um, obviously you need to add some dimension but for now for the sake of time I'm just quickly do that one so you get an idea but you can always do a better job. better job. better job. Fill it that one Fill it that one Fill it that one and do a fillet and do a fillet and do a fillet here. Okay. So, that's that sketch. Let's do a quick sketch also for here. Maybe I'll do another circle with roughly same diameter as that one. And uh let's do another circle there. And then next maybe I'll do a line there and another line go and tangent to that part. tangent to that part. tangent to that part.

_Signals: camOps:3 · safety:1_

### Tip 11 — confidence 0.4

> Maybe I'll just do I'll connect this line connect this line connect this line with that

Maybe I'll just do I'll connect this line connect this line connect this line with that. with that. with that. So shortly we'll see what I'm doing. So I'll trim. Trim is over here. Trim is over here. Uh this circle I don't need it. Now we have hopefully a closed and I trim that one as well. So I have a closed crosssection there. Right. So we've done that one and uh let's do one more and then I'll jump to the conclusion for the entire one. So I'll draw the region for that. So roughly that one line. So we'd better um have this line be parallel to that line. So our design is not ugly.

_Signals: toolpath:1_

### Tip 12 — confidence 0.56

> So I'll draw that line at the bottom

So I'll draw that line at the bottom. And maybe I have that line also parallel to the edge. to the edge. to the edge. And then let's do this roughly that line there. there. there. Enter. So let's do quick fillet. So fillet fillet there. That's too large. right, we need to be a little bit patient. So, we patient. So, we patient. So, we also created a closed profile there, right? So, assume you do the rest. And for now, um I just finish a sketch, right? I turn off this mesh. Those mesh was just for mapping things, right? And now if I select this um section that I created, right? right?

_Signals: toolpath:1 · camOps:5 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-VBWm-pE_Uzc-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/VBWm-pE_Uzc.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].