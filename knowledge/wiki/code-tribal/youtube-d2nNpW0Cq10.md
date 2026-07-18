---
title: "How to Design Electrical Routing & Harnesses in Siemens NX - Tutorial - PROLIM Tech Talk"
domain: cad
source: youtube
videoId: d2nNpW0Cq10
url: https://www.youtube.com/watch?v=d2nNpW0Cq10
channel: "PROLIM Global Corporation"
duration_s: 4872
tribal_entries: 14
chunks_scanned: 146
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# How to Design Electrical Routing & Harnesses in Siemens NX - Tutorial - PROLIM Tech Talk

**Channel:** [PROLIM Global Corporation](https://www.youtube.com/watch?v=d2nNpW0Cq10)
**Duration:** 81m 12s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 14 of 146 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.42

> Okay, we're ready to begin our tech talk today, Crash Course into electrical routing and harness design

Okay, we're ready to begin our tech talk today, Crash Course into electrical routing and harness design. Questions will be answered live at the end, but please go ahead and enter them in the chat as they come up. Our presenter today is Balal. Balal is a graduate of the University of Cincinnati with a bachelor of science and mechanical engineering technology. He has a strong background in manufacturing, design background in manufacturing, design background in manufacturing, design analysis, CNC programming, and 3D printing.

_Signals: camOps:1 · safety:1_

### Tip 2 — confidence 0.4

> However, since I know that my conductors are not going to be out here, they're actually going to go deeper inside so the

However, since I know that my conductors are not going to be out here, they're actually going to go deeper inside so they can interface with the actual pin. I'm going to push these terminals further in. So, in fact, what I'm going to do is I'm going to reset this dialog box. And I'm going to actually turn on my wireframe. And in my display, I'm just going to go and show my and show my and show my hidden edges as solid. A reason why I'm doing this, you will see why soon. So, I'm going to create another terminal array or just a terminal array in general. I'm going to select my pattern feature.

_Signals: camOps:1 · howto:2_

### Tip 3 — confidence 0.41

> So, I select this one

So, I select this one. Now, it tells me to select a master instance. In this case, where on this pattern do I want this? I want this deeper in right around this chamfer. That's where I want my terminals to begin. So, this is basically where those conductors are going to stop and terminate. So, I want it to be as realistic as possible so that I have an accurate understanding or an accurate calculation of when I actually do go create this wire harness. I don't want to do any math. I want NX to do it for me. So, that being done, I press okay.

_Signals: camOps:1 · howto:3_

### Tip 4 — confidence 0.41

> Sorry this is not a routing control point

Sorry this is not a routing control point. This is actually called a actually called a actually called a fixture port or a stock offset point. Now, usually a stock offset point will have two dashes or basically like two parallel symbols on this. So, in this case, this is just simply a fixed report. This is something I qualified as well. And if you want to take a look at how to qualify that, we can just take a quick look into that as well right now. So, I'll just uh grab this. In fact, I'll just delete this. How to qualify a fixture port. Great question. fixture port. Great question.

_Signals: toolpath:1 · howto:1_

### Tip 5 — confidence 0.4

> So NX isn't giving it a name just yet, but before you create your harness, I'm going to open this or actually set this a

So NX isn't giving it a name just yet, but before you create your harness, I'm going to open this or actually set this as my work port and wave geometry link all of these ports in. So I just basically select my routing objects. select my routing objects. select my routing objects. So all of them, So all of them, So all of them, right? I'm going to make sure that they're associative. You might not want to make context independent because if any of these points move, then those ports will stay exactly where they were. In this case, you don't want them. You want them to move along with the part.

_Signals: howto:5_

### Tip 6 — confidence 0.4

> And we're going to And we're going to And we're going to open open open plug qualified

And we're going to And we're going to And we're going to open open open plug qualified. There we go. Press okay. Select the object so I can click anywhere in space. anywhere in space. anywhere in space. All good. And remember, since I have these rotation vectors, I don't have to rotate it at at all. I just have to click on move part placement object. And of course, this is the only selection step I have. So, I'll just click on this placement object. Press okay. And then select the object that it needs to be rotated to. And there we go. Immediately locks in.

_Signals: howto:5_

### Tip 7 — confidence 0.47

> And I'll talk about what the difference between component level and pin level is

And I'll talk about what the difference between component level and pin level is. So let's start off just by making simple connections or simple components. Here I right click in my electrical component navigator and I'll click on create. It's a component name. I'll click on this header or just these headers and I'll give it a connector ID of let's just say 0000 0000 0000 and finish. You know that's one component in there. I can finish or I can click next. Next would basically just allow me to select the next component. And I'll do a quick demonstration of that as well. So that's our headers.

_Signals: camOps:2 · howto:6_

### Tip 8 — confidence 0.42

> I just want let's say the first four as well well well and yeah we'll model these selected and you know it goes 30 minut

I just want let's say the first four as well well well and yeah we'll model these selected and you know it goes 30 minute 30 mm as a cutback length and of course the uniform extension is 30 mm so we can actually change that in fact I'm going to do yeah cut back length is fine as 30 and instead I'm going to make this 20 20 20 that way you can see what I mean by you know uniform extensions know uniform extensions know uniform extensions [Music] [Music] [Music] and we are good to go. So it applied those changes. All is good and now we're ready to begin modeling our connections.

_Signals: params:2 · howto:1_

### Tip 9 — confidence 0.4

> You just add just got to click on that plus click on wires

You just add just got to click on that plus click on wires. Now, I have basically multiple different wire gauges out here and it goes and this is just one of 30. Um, and you can see we've got lots of different wires in here, lots of different wire gauges. In my case, uh W117 is the most appropriate for the type of work that I'm trying to do. You can see the outer diameter is 1.35 mm. Um that's approximately Um that's approximately Um that's approximately uh about a 16th of an inch, I think. Uh I work in metric and uh I know that makes some people makes some people makes some people confused.

_Signals: params:1 · howto:2_

### Tip 10 — confidence 0.42

> So, we can model in a wire loom or a bundle

So, we can model in a wire loom or a bundle. We can specify the overstock which will allow you to define you know uh three types of overstock. So you've got flagged, sleeved and wrapped. And there are four application methods. You've got entire segments. In fact, we'll just open up this overstock. So yeah, you've got three uh where is it? Yeah, you've got wrapping settings, which is your overap spiral. You got different wrap types. You got orientations as well. And of course, you've got coverable stock.

_Signals: toolpath:1 · howto:2_

### Tip 11 — confidence 0.55

> Now form boards represent a 3D baring assembly as if it were straightened and flattened onto a single plane

Now form boards represent a 3D baring assembly as if it were straightened and flattened onto a single plane. So essentially it makes a 2D 2D 2D a 2D a 2D a 2D flattened and annotated model view. You can create a formboard drawing and the part can only contain a single form board. So every harness can only have one form board. You must also select the harness to flatten and port that. You must select the harness to flatten and the port that the harness must be flattened into. You can also select any harnesses that are fully connected. You can only select harnesses that are fully connected.

_Signals: camOps:7 · howto:5_

### Tip 12 — confidence 0.44

> So you can see in this toolbox I have harness on

So you can see in this toolbox I have harness on. So therefore, this industry tab will will fill up with whatever industry I've chosen. In this case, it's harnessing. So I can have multiple different things in here. So I can do path length annotation. So I can choose my writing object. So let's say this path, if I want it to be annotated. So I can say, yep, that's 170 mm. This is 90 mm and this path will be this main rung will be 80 mm. Now, if I wanted to have a foam board face annotation, so let's say if I had a particular pin or a pin out that I wanted to see, I can have this.

_Signals: params:3_

### Tip 13 — confidence 0.43

> We'll put it in number three

We'll put it in number three. Finish. Select the wire. Simple enough. You've seen me do this three to four times already. Select. You know what? We'll select a different color. different color. different color. Next. Next. And we're good. So, now we've got this nice silver wire and we are good to go. And And And yep, good. yep, good. yep, good. So now I can update my form board. So let's say if I click on update, it goes over here and I can find discrepancies. So if I click on that, it says that it did find oh no discrepancies. H perhaps I have to save it first. Let me cancel out of here.

_Signals: camOps:1 · howto:5_

### Tip 14 — confidence 0.43

> Let me just click on save

Let me just click on save. Go back to this. Go back to this. Go back to this. Uh, so it doesn't show anything here just yet. That's usually because once I click on click on click on update form board update form board update form board discrepancies. There we go. Now it's finding those discrepancies saying that yep, there's been a component change. Something's missing. And so I can just click okay. click okay. click okay. And now once that's all applied, yep, number of remaining form board discrepancies zero, which is great. And now I can see, yep, things are fine.

_Signals: howto:8_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-d2nNpW0Cq10-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/d2nNpW0Cq10.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].