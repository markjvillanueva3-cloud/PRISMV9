---
title: "Fusion 360 CAM - Intro to Turning 06 - Grooving"
domain: lathe
source: youtube
videoId: FxK_lu2f_EI
url: https://www.youtube.com/watch?v=FxK_lu2f_EI
channel: "Mike Mattera"
duration_s: 276
tribal_entries: 6
chunks_scanned: 6
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Fusion 360 CAM - Intro to Turning 06 - Grooving

**Channel:** [Mike Mattera](https://www.youtube.com/watch?v=FxK_lu2f_EI)
**Duration:** 4m 36s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 6 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.51

> next we'll be cutting out this groove area grooving is a process that removes material from a Channel with a plunging mo

next we'll be cutting out this groove area grooving is a process that removes material from a Channel with a plunging motion many times this is a narrow area but it can be a larger open area grooving will plunge into the part radially rather than cutting radially rather than cutting radially rather than cutting axially in this lesson we will cover the grooving par parameters and create a grooving tool for the library so from the Turning tool path pull down I want you to select turning you to select turning you to select turning Groove let's go to select a tool make sure that you've expanded

_Signals: toolpath:2 · howto:6_

### Tip 2 — confidence 0.45

> the library tree and that you select the current job that we're working on which is our tutorial tutorial tutorial six i

the library tree and that you select the current job that we're working on which is our tutorial tutorial tutorial six in here we can tell it that we want to create a new turning tool so because we're doing grooving it's automatically going to select a grooving tool as our option and we can select things like insert material and the type of units that we'll be using to describe this tool the first thing I want to set is to define the shape as being Square for my thickness I'll select T3 which is 3.97 which is 3.97 which is 3.97 mm that gives us an automatic Corner radius here radius here

_Signals: params:1 · howto:7_

### Tip 3 — confidence 0.5

> radius here of8 millim so there is a small radius on the corner of the the corner of the the corner of the insert our gr

radius here of8 millim so there is a small radius on the corner of the the corner of the the corner of the insert our groove width we're going to set this to set this to set this to 2.5 the actual width to 2.2 I'm going to set the head length to 50 length to 50 length to 50 mm and the overall length to 50 mm so that made my insert longer the reason I did that is because we're going to use the same tool as a cutoff tool later on now let's go to the holder Tab and we can Define some of the parameters for the the the holder so let's set the head length to 50 50 50 mm the overall length to 125 20

_Signals: params:3 · howto:6_

### Tip 4 — confidence 0.46

> for the shank and 20 for the shank height now let's take a look at the setup tab on the setup tab you can set the compen

for the shank and 20 for the shank height now let's take a look at the setup tab on the setup tab you can set the compensation to the tip this tells Fusion where to calculate the tool path from you should reference your tool offset on the machine to the same location that you set it in here right now it's set to the front corner we're going to press okay to select these changes and okay to select the tool now let's go to our groove geometry geometry geometry tab in here we need to select the faces that will actually be Machining so I'm going to rotate this over a little bit and I'm going to

_Signals: toolpath:1 · howto:6_

### Tip 5 — confidence 0.44

> set my confinement by grabbing some walls so we're set to nothing right now but I'm going to grab this going to grab thi

set my confinement by grabbing some walls so we're set to nothing right now but I'm going to grab this going to grab this going to grab this wall this wall this wall this floor and this floor and this floor and this wall on the radi tab we really have nothing that we need to change although we could set our we could set our we could set our clearance out to this diameter if we wanted to but we really don't have to let's take a look at our passes I'm going to have it do a full step down with a 1 mm step over you can tell it to use a pecking value for harder materials this will take multiple

_Signals: params:1 · howto:6_

### Tip 6 — confidence 0.43

> pecs going in to reach the final final final depth you can also have a dwell when it hits the bottom of that depth you c

pecs going in to reach the final final final depth you can also have a dwell when it hits the bottom of that depth you can also use a reduced feed rate so that it gets towards the end of the cut it slows the cut it slows the cut it slows down for our up down Direction right now it's set to up up and down now you would need the right kind of insert for that we're going to change this so that we're cutting only down it's cutting down and into the part again we really don't have anything to change here if we simply go with the defaults and hit okay we're going to get a pretty good tool path and

_Signals: toolpath:1 · howto:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-FxK_lu2f_EI-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/FxK_lu2f_EI.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].