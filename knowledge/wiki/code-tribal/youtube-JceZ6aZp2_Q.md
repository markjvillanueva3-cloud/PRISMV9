---
title: "SolidCAM - Introduction to Imachining"
domain: cam
source: youtube
videoId: JceZ6aZp2_Q
url: https://www.youtube.com/watch?v=JceZ6aZp2_Q
channel: "TriMech Group"
duration_s: 263
tribal_entries: 7
chunks_scanned: 7
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SolidCAM - Introduction to Imachining

**Channel:** [TriMech Group](https://www.youtube.com/watch?v=JceZ6aZp2_Q)
**Duration:** 4m 23s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 7 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.47

> Speaker 1: Hi, welcome to an introduction to Solid CAM Imachining

Speaker 1: Hi, welcome to an introduction to Solid CAM Imachining. Solid CAM Imachining is a great way to rough out hard materials or even soft ones. You can see to start of with we want to rough out the outside of this block iv got. I'll pick the half-inch end mill and wants to finish the wall at the same time the software itself is automatically picked out what is the outside of the parts and down to the Imachining technology will give us an optimal step-down to use, to allow us to move material as quick as possible.

_Signals: camOps:4_

### Tip 2 — confidence 0.5

> As you can see the tool path is not what you're used to with Solid CAM Imachining using a morphed spiral strategy to ens

As you can see the tool path is not what you're used to with Solid CAM Imachining using a morphed spiral strategy to ensure that we get the same cut at angle that's all times whilst moving around the part, This again, allows us to keep tool load down, allows us to cut quicker, and then reducing our cycle times even further, Now the outside is completed. Let's do the pockets inside again. This is really straightforward with a new Imachining operation. In Imachining we can simply just pick faces. And this allows us to take that geometry.

_Signals: toolpath:3_

### Tip 3 — confidence 0.41

> it dosnt matter wether it's a closed pockets or a open pocket, it will automatically find Whether the tool can go outsid

it dosnt matter wether it's a closed pockets or a open pocket, it will automatically find Whether the tool can go outside of the parts, or not as you can see here, I've got three pockets that do this from here as well. We can go and check the phases. We've selected, pick the tool and then choose again if you'd like to rough or finish it.

_Signals: toolpath:1 · camOps:2_

### Tip 4 — confidence 0.6

> From here, let's go and calculate the tool path as we know that Imachining looks at the optimal step down that we put ha

From here, let's go and calculate the tool path as we know that Imachining looks at the optimal step down that we put have for the tooling as you can see here, it's automatically found where it can enter it and let it cant as well as using that morphed spiral strategy again, to give us optimal cutting conditions. And as you go through in the simulation, we can see the tried and tested helix into the job and get into the root the material as quick as possible. And then open it up with a morphed spiral. Only straying from that slightly when needed in a very sharp corner.

_Signals: toolpath:6_

### Tip 5 — confidence 0.54

> Once we get to the open pockets as well, we can see that employs a strategy of motive

Once we get to the open pockets as well, we can see that employs a strategy of motive. Again, allowing to deal with thin walls simply and easily for you all automatically. So that's 2D Imachining done. So let's move to 3D Imachining as you can see in this parts, I've got a vice and a 3D part that needs machining. 3D Imachining is the same as 2D Imachining. Being able to pick geometry automatically, and this time have picked 16mm end mill to cut from. I can select levels that I wish to so in this case, I don't want to take the whole stock out.

_Signals: camOps:6 · params:1 · howto:1_

### Tip 6 — confidence 0.49

> I just want to go to a certain depth which I have picked at 37mm and I can add an extra milimeter just to make sure I've

I just want to go to a certain depth which I have picked at 37mm and I can add an extra milimeter just to make sure I've cut everything that's needed. I could switch the step down to one I automatically choose myself or one that the software tells me and I can also set scallop hight. wether it be constant or not as well if needed. In this case, I've used two millimeters. From there We can go save and calculate and see what the tool path brings to us. What you're seeing is that we need to go to two depths for our Imachining strategy.

_Signals: toolpath:2 · params:1 · howto:1_

### Tip 7 — confidence 0.46

> And then we rough the stock upwards in the rest roughing strategy to get the shape is required within 3D

And then we rough the stock upwards in the rest roughing strategy to get the shape is required within 3D. Using Solid CAM simulator we can exactly see what is being machined and either take into account the fixture thats holding this part. So if you've got move more complicated fixture, this can be accounted for as well, allowing us to have complete confidence in what you machine. With the end of this tool path this completes the end of our introduction into Imachining, and I hope you've enjoyed it.

_Signals: toolpath:1 · camOps:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-JceZ6aZp2_Q-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/JceZ6aZp2_Q.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].