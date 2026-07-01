---
title: "Parametric Surface Panels Grasshopper Tutorial"
domain: general
source: youtube
videoId: n9ErBxRWAtY
url: https://www.youtube.com/watch?v=n9ErBxRWAtY
channel: "Parametric"
duration_s: 1816
tribal_entries: 5
chunks_scanned: 41
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Parametric Surface Panels Grasshopper Tutorial

**Channel:** [Parametric](https://www.youtube.com/watch?v=n9ErBxRWAtY)
**Duration:** 30m 16s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 41 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.4

> the next step is to load this into grasshopper so I'm going to create a surface tool container basically you can find it

the next step is to load this into grasshopper so I'm going to create a surface tool container basically you can find it on the parameters surface and I'm going to right click to set one surface and choose the Rhino geometry so now this plugin will be light gray so it will be linked to this Rhino geometry and for the sake of the exercise I'm now going to continue in grasshopper so I'm going to hide the Rhino geometry and every time I select this you can see that the Rhino geometry is being highlighted as well so we can after executing our script we will have the option to change our input and

_Signals: howto:5_

### Tip 2 — confidence 0.4

> do is also create a surface container push these in to that surface container you can hold shift to add multiple branche

do is also create a surface container push these in to that surface container you can hold shift to add multiple branches to the same container right click here and flatten that list as well so now we have 480 untrimmed surfaces that we are going to work with and at this point because we're building our script continuously if you change any of this input you can see that the surface will react and the data set will change and the triangulation will still work because we are directly building on top of the topological information of the NURBS surface so since the data is continuous there

_Signals: howto:5_

### Tip 3 — confidence 0.4

> triangle as a driver so I can type in a multiplication here and give it a small coefficient let's say 0

triangle as a driver so I can type in a multiplication here and give it a small coefficient let's say 0.05 we can also double-click on our number slider and set up a threshold I say this goes from 0 to 0.25 and you want the area values to be below to be below to be below one so that these pieces will be scaled down and when I connect them you can see that I can use different amounts of percentages so maximum I get is 0.25 the smallest I can get is around 0.05 so this will be kind of a multiplier for the for the scaling down and in the last step what I want to do is turn these into panels

_Signals: camOps:1 · howto:2_

### Tip 4 — confidence 0.42

> themselves so these boundaries these pieces we can simply turn them as boundary surfaces but to turn the this top row le

themselves so these boundaries these pieces we can simply turn them as boundary surfaces but to turn the this top row let me actually hide everything before doing this so this row these triangles already converted to surfaces but to do that to the top part we actually need to combine this data so I need to associate each boundary with its scale boundary and we can do it by leaving the data so here we have 176 curves and here we have another 176 and these are scaled and if you right click here and graphed both of these streams these will be put into containers of 2 and here you can type in

_Signals: camOps:2 · howto:1_

### Tip 5 — confidence 0.42

> keep it at 3 and I want to increase the point Council let's start with 6 and 6 I'm going to hit OK and when you turn on 

keep it at 3 and I want to increase the point Council let's start with 6 and 6 I'm going to hit OK and when you turn on the points you can actually start moving these around and you will get actually distorted data on the surface so by stretching the information between these two points the length is increasing for these triangles so you can see they are actually being distorted as well you can also move the surface front and back and your input will always follow it you can also stretch it up and down as well you can also try to use this tool on different types of surfaces you can also if

_Signals: camOps:1 · safety:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-n9ErBxRWAtY-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/n9ErBxRWAtY.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].