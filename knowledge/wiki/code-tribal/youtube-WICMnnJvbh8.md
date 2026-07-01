---
title: "Autodesk Inventor CAM 2021 Ultimate Tutorial.  How to Create a Toolpath For a CNC Plasma Cutter."
domain: cam
source: youtube
videoId: WICMnnJvbh8
url: https://www.youtube.com/watch?v=WICMnnJvbh8
channel: "Beck Tools"
duration_s: 1217
tribal_entries: 10
chunks_scanned: 32
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Autodesk Inventor CAM 2021 Ultimate Tutorial.  How to Create a Toolpath For a CNC Plasma Cutter.

**Channel:** [Beck Tools](https://www.youtube.com/watch?v=WICMnnJvbh8)
**Duration:** 20m 17s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 10 of 32 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.4

> So, that way the software will automatically know which side to put the tool path

So, that way the software will automatically know which side to put the tool path. So, these were drawn not by me um but by my customer. So, I'm going to go up here to the next thing on the list. So that's the nesting properties. So I just need one of each. If I wanted more than one, I would type in however many I needed. Now these are the nesting properties. So if I wanted to allow mirroring, which if this was a thicker material where I could chip the slag off, sure, it wouldn't matter if it mirrors. But on 28 gauge, this stuff's like paper thin.

_Signals: toolpath:1_

### Tip 2 — confidence 0.45

> So I'm not going to allow it to mirror this time because I discovered that was a problem

So I'm not going to allow it to mirror this time because I discovered that was a problem. Um, problem. Um, problem. Um, not sure what bind does, but uh, you're you can allow rotating 90 degrees, 180 degrees, 270 degrees. Um, or I could probably type in whatever else I wanted. Um, so you got all these different options. I'm going to say okay because I'm just doing one of each. So now I need to tell it what size of material I have. have. have. So to do that, I'm going to go over here to processes or material library. So you come in here, you click on packaging.

_Signals: params:3 · howto:1_

### Tip 3 — confidence 0.4

> It's going to calculate this blue box and it's going to do the math and say this blue box cost you $318 out of the $15 t

It's going to calculate this blue box and it's going to do the math and say this blue box cost you $318 out of the $15 total, which means and then up here then up here then up here um total cost, packing cost, you can add different things up here, give you different information. Anyways, sorry. different information. Anyways, sorry. different information. Anyways, sorry. This is like I'm trying to give you lots of detail without going to crazy amount that it takes forever. So now I'm going to say let's go ahead and I'm going to right click on this sheet and I'm going to say create a 3D model.

_Signals: camOps:1 · howto:2_

### Tip 4 — confidence 0.43

> So, let's go to the cam tab and then I'm going to hit setup

So, let's go to the cam tab and then I'm going to hit setup. I should have had my 3D mouse. So, anyways, right here is what I'm going to do. And I'm in the setup. I'm going to click this corner. I want this to be my XYZ. And then I'm going to click over here. And instead of milling, I'm going to say cutting. This is just setting up your project. And then I'm going to click model. I'm going to click each one. and it's going to define my stock based on that. Now I go over here and I don't want any offset on the top. So I'm going to say zero, but around the outsides I want a quarter of an inch.

_Signals: camOps:1 · howto:5_

### Tip 5 — confidence 0.44

> of an inch

of an inch. of an inch. So that added a quarter of an inch all around. all around. all around. So now you can see normally I use a 3D mouse but I didn't hook it up so I'm doing without. So, it added a quarter inch around this. So, it'll be easy for me to just make those three. So, that is good. And then the post-processing, I can I can change all this stuff later so I don't ever fill it in. So, now that is set up. Now, if I'm going to be doing this allows me to do all kinds of different machining as well as five axis machining, but today we're going to do 2D profiles. So, we click on this.

_Signals: camOps:2 · howto:3_

### Tip 6 — confidence 0.46

> Now, a lot of this is the same as Fusion 360

Now, a lot of this is the same as Fusion 360. It's the same engine. is just a little more pretty I guess in inventor. So once I click 2D profile, I come over here to water jet laser plasma cutting. Make sure you click plasma cutting. It's not going to post um curve. So I typically go with 0.05. Sometimes I go 006. So now 28 gauge, you're going to go at a whopping 200 at a whopping 200 at a whopping 200 inches per minute. as well as your lead end feed rate will also be 200 inches per minute. Now, this is if you're going to have if this is if you have the razor cut or razor weld 45.

_Signals: camOps:1 · params:2 · howto:2_

### Tip 7 — confidence 0.45

> I got the one that came with the uh the pro

I got the one that came with the uh the pro. So, that's 45 amps. So, I'm going to go ahead and run at 200 in a minute. So, I'm going to select this right here. Uh this allows me to select everything at once. Um or everything on that same plane. Now, I can do all loops, I can do outer loops, or inner loops. So, I'm going to do outer loops. Now, always cut your inner loops first because if this were an eight and I cut the eight out and it fell through, there's no way I could cut the centers. So, if you have inside and outside features, always cut the inside features first.

_Signals: safety:2 · howto:2_

### Tip 8 — confidence 0.51

> Now, if you're doing 2D, uh if you have a sketch on top of this, like sketch geometry, and you want to just cut on a lin

Now, if you're doing 2D, uh if you have a sketch on top of this, like sketch geometry, and you want to just cut on a line to create a relief for a bend radius or something, then you would do center, and you would select your 2D geometry. That's a different video. I always just leave it on left. I always check smoothing. That simplifies simplifies smoothing. That simplifies simplifies smoothing. That simplifies simplifies um your geometry allowing everything to run more smoothly. Last thing on this tab is you make sure you switch to computer.

_Signals: camOps:2 · safety:2 · howto:2_

### Tip 9 — confidence 0.41

> Last thing, pierce clearance

Last thing, pierce clearance. I put this in, but I'm pretty sure it does nothing because this is defined at postprocess point. All right. Um, so I've got my lead in. I have no lead out, my pierce clearance. And you notice it hasn't asked me my pierce delay yet. We'll get to that later. So I'm going to say okay. And now you can see the tool path, what it looks like, what's going to happen. And um, at this point you can, if you have more than one, you can select them all. You can say simulate. It'll open up the simulation window. and you can simulate it.

_Signals: toolpath:1 · howto:1_

### Tip 10 — confidence 0.4

> Everything that's green is on by default

Everything that's green is on by default. Um I did have to change uh this because the default's 100 inches per minute for maximum high speed feed rate. Well, we're doing 200, so we can't have that at 100. have that at 100. have that at 100. um circular radius, minimum cord length, you know, you can adjust all this stuff. Anyways, all that is good. So, I'm gonna say post. And now I'm going to come out here and somewhere here and somewhere here and somewhere in this folder, I'm going to call this give it a name give it a name give it a name missed parts. missed parts. missed parts. There we go.

_Signals: params:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-WICMnnJvbh8-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/WICMnnJvbh8.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].