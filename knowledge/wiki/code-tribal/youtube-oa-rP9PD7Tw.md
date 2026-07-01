---
title: "CATIA V5 - Reverse Engineering (Curve from 3D scan)"
domain: cad
source: youtube
videoId: oa-rP9PD7Tw
url: https://www.youtube.com/watch?v=oa-rP9PD7Tw
channel: "3D Comparison"
duration_s: 711
tribal_entries: 5
chunks_scanned: 17
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# CATIA V5 - Reverse Engineering (Curve from 3D scan)

**Channel:** [3D Comparison](https://www.youtube.com/watch?v=oa-rP9PD7Tw)
**Duration:** 11m 51s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 17 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.45

> kav V5 reverse engineering so let's take a look this will be the case study part as we can see this is a motorcycle cran

kav V5 reverse engineering so let's take a look this will be the case study part as we can see this is a motorcycle crank case and you can also download the model from the rtech 3D scan database I will select the STL file now let's jump within K and have that imported so I will go to shape digitize shape editor since this will be a 3D scan in an STL file format I will go for import and we're going to see that the model will already be added over here I want this to be imported at the true scale therefore I will leave the scale factor to one if I will click will click will click apply we're

_Signals: camOps:2 · howto:4_

### Tip 2 — confidence 0.5

> going to see how the crank case will be case will be case will be [Music] [Music] [Music] loaded to verify the dimension

going to see how the crank case will be case will be case will be [Music] [Music] [Music] loaded to verify the dimensions of the 3D scan you can always use the information afterward select the mesh and within the statistics we're going to see those values so we have the length we have the width and we also have the height so 44 mm for the for the [Music] [Music] [Music] height now I want to create a planner section therefore I will go from the X and Y plane we see that the 3D scan part has been already aligned by artech for example if I will go to the front view this will be the positioning

_Signals: camOps:2 · params:1 · safety:1 · howto:2_

### Tip 3 — confidence 0.4

> so this is quite well quite well quite well aligned we see the top we see also the bottom if you want to you can further

so this is quite well quite well quite well aligned we see the top we see also the bottom if you want to you can further adjust this using the adjust this using the adjust this using the compass to do that you can select the object go over here on the compass make it snap automatically to selected and afterwards if you're going to select the point Cloud you're going to have the compass with green that means that you can start um to rotate this I high recommend that you're going to use some U rotation increments over here which will be quite small so for example 0.5 and afterwards you can just

_Signals: howto:5_

### Tip 4 — confidence 0.42

> like 20 I will hit apply you're going to see that with 20 it is a little bit better but still around the corners it will

like 20 I will hit apply you're going to see that with 20 it is a little bit better but still around the corners it will it will not be that well defined so we have the initial sectioning with blue and after we have the 3D curve over here so I will add this to be 30 if I will click okay again we're going to see that in some areas the newly defined Curve will look like that therefore I can go with a high value for example 50 if I will click now click now click now apply you're going to see that even though though though visually we don't see visually we don't see visually we don't see that

_Signals: camOps:1 · howto:4_

### Tip 5 — confidence 0.4

> jump would jump would jump back to generative shape design since we have that section converted to a curve I have the po

jump would jump would jump back to generative shape design since we have that section converted to a curve I have the possibility to have the possibility to have the possibility to use the generative um shape design work bench in order to create the surfaces so for example if I would want to go to the um let's say with reverse and for the top with a value of 1 1 1 mm we're going to be all the way over there so maybe there so maybe there so maybe 0.5 afterwards we're going to have a radius over here so within the following step we should Define the Top Lane and and afterwards using the trim

_Signals: params:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-oa-rP9PD7Tw-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/oa-rP9PD7Tw.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].