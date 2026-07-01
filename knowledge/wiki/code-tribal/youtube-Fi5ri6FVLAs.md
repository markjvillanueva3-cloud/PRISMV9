---
title: "SolidCAM Tech Tip: Setting up an iMachining Database and Manipulate the Toolpath"
domain: cam
source: youtube
videoId: Fi5ri6FVLAs
url: https://www.youtube.com/watch?v=Fi5ri6FVLAs
channel: "TriMech Group"
duration_s: 332
tribal_entries: 7
chunks_scanned: 8
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SolidCAM Tech Tip: Setting up an iMachining Database and Manipulate the Toolpath

**Channel:** [TriMech Group](https://www.youtube.com/watch?v=Fi5ri6FVLAs)
**Duration:** 5m 32s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 8 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.43

> Today we're going to be learning how to use iMachining, set up our iMachining databases and manipulate our toolpath to g

Today we're going to be learning how to use iMachining, set up our iMachining databases and manipulate our toolpath to get even greater cycle time savings. In the setup of the part is where we initially enter our iMachining data. So in our iMachining data tab, we have access to edit our iMachining database. Now in here is where we can open up and manipulate any of the materials that we already have input inside of solidCAM. But if we want to create a new material, we just right-click, hit New Material. And then all we have to do is type in a name and the ultimate tensile strength.

_Signals: toolpath:1 · howto:3_

### Tip 2 — confidence 0.4

> When it comes to iMachining, the ultimate tensile strength is the only relevant feature or parameter about the material 

When it comes to iMachining, the ultimate tensile strength is the only relevant feature or parameter about the material that the toolpath is looking at. So what we'll do is rename this material just to steel. I'll call it 304. Now we can find the ultimate tensile strength and then put it here. What we can do is go ahead and apply. And now let's take a look at the machine. So the machine database really just has some maximum feeds and speeds for each of our individual machines. So for my Haas SS, I got 12,000 on my RPM and 833 on my maximum feed rate.

_Signals: toolpath:1_

### Tip 3 — confidence 0.55

> And setting this up is the same exact way to set up our material

And setting this up is the same exact way to set up our material. Back out of here. And I'll just grab my generic Haas SS and we'll stick with aluminum for what we're working with today. Now the last parameter here is going to be the machining level, which is just how aggressive or conservative we'd like to cut. Now we can set this up in here. And that will apply to every iMachining toolpath we create. But we can still manage this on an operational level. At this point. Let's go ahead and create our first iMachining toolpath. So there is 2 and 3D iMachining. 2D is great at prismatic features.

_Signals: toolpath:2 · camOps:2 · howto:4_

### Tip 4 — confidence 0.53

> While 3D can take complex three dimensional shapes and rough them out

While 3D can take complex three dimensional shapes and rough them out. We'll be using is just the 2D iMachining. Now it's very easy to set up. We just have to select the face we want to cut. Move on to the tool. Select that tool. Now when we are creating a tool, it is very important that we want to make this accurately to what tool will actually be using. Things like the number of the flutes and the helix angle of those flutes does come into play during our iMachining calculations. Now we'll move on down to our levels, which automatically get defined, and then go into the Technology Wizard.

_Signals: toolpath:1 · camOps:3 · howto:4_

### Tip 5 — confidence 0.49

> Now very quickly it was able to generate that toolpath

Now very quickly it was able to generate that toolpath. And this toolpath alone should be able to save you a lot of time on your machine. But there's still ways to manipulate it to speed it up even further. And that's going to be in our Modify Cutting Conditions tab. This is where we can access things like our maximum chip thickness, minimum chip thickness, but what I want to look at right now it's just our level eight max cutting angle and our minimum cutting angle. In general, the more we open up these parameters... So let's turn that down to 10, instead of 20...

_Signals: toolpath:2 · camOps:1 · howto:1_

### Tip 6 — confidence 0.4

> the more time we'll be able to save during our cut allowing for more opportunities for new movement

the more time we'll be able to save during our cut allowing for more opportunities for new movement. We'll go ahead and calculate, and it's very hard to tell, but our toolpath did tweak just a bit. On a material like aluminum, you might not be able to save yourself too much time in here. But generally, the harder the material is, the more you can manipulate these parameters and see greater time savings. Now, if we move on to our Technology page, we can see things like our step down and cutting angles are locked off from us. Now, I'm not saying that we can't access these.

_Signals: toolpath:1_

### Tip 7 — confidence 0.44

> We can easily turn off the iMachining Wizard, go in and modify these, but it's best practice to keep the wizard on and t

We can easily turn off the iMachining Wizard, go in and modify these, but it's best practice to keep the wizard on and to fully utilize all the technology that's behind the iMachining toolpath. Since I'm machining has seven unique patents on it, there's nothing else like that out in the CAM universe. iMachining has gone head-to-head with plenty of leading competitors in the CAM industry, and have outperformed them on every metric. If you want to learn more about iMachining, please contact us at Trimech.com.

_Signals: toolpath:1 · camOps:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-Fi5ri6FVLAs-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/Fi5ri6FVLAs.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].