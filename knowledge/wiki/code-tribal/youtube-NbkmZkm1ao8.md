---
title: "GibbsCAM Tech Tip: How to Create a Trochoidal Toolpath"
domain: cam
source: youtube
videoId: NbkmZkm1ao8
url: https://www.youtube.com/watch?v=NbkmZkm1ao8
channel: "WestCAM Solutions"
duration_s: 173
tribal_entries: 3
chunks_scanned: 3
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# GibbsCAM Tech Tip: How to Create a Trochoidal Toolpath

**Channel:** [WestCAM Solutions](https://www.youtube.com/watch?v=NbkmZkm1ao8)
**Duration:** 2m 53s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 3 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.52

> in today's Gibbs cam Tech tip we're going to show you how to make a tra coidal tool path sometimes you just want a pure 

in today's Gibbs cam Tech tip we're going to show you how to make a tra coidal tool path sometimes you just want a pure tra coidal tool path to cut out a slot or an area and it involves a two-step process the width of this slot is is is 400,000 so we're going to create a dummy tool at 390,000 just an End Mill and we're going to send that end Mill right down the middle of that slot using a simple piece of geometry that's a line we draw the line down the middle of the slot and we offset the points there's a point here we move it to here by the radius of the finishing cutter and we move this

_Signals: toolpath:2 · camOps:2 · howto:1_

### Tip 2 — confidence 0.46

> point to here by the radius of the finishing cutter now let's take the dummy endmill and send it right down the middle o

point to here by the radius of the finishing cutter now let's take the dummy endmill and send it right down the middle of the slot feed and speed don't matter but depth does we'll get the depth directly off of the part with an all click on the floor no leadin lead outs no cutter radius comp just click the slot the center circle and do it now that's a dummy operation at 390,000 thick because we're going to save 10,000 five on each side for the Finish pass now we're going to convert this tool path to tra coidal but to do that we select the tool that we want to make the TR coidal cut with we

_Signals: toolpath:1 · camOps:1 · howto:3_

### Tip 3 — confidence 0.51

> rightclick the operation select operation operation select operation operation select operation modifier convert to tr c

rightclick the operation select operation operation select operation operation select operation modifier convert to tr coidal add our RPM for this stainless steel material and a 1/8 in solid carbide end mail is 14,500 and the feed rate is 14.7 14.7 14.7 our stepover is going to be 09 which is 6% of the 1/8 cutter when you press do it you will now have a pure TR coidal tool path let's have a quick look at look at look at it and there we go so then when you get done running this tool path you will simply take a swipe down the right and a swipe down the left to finish the slot we hope you

_Signals: toolpath:2 · camOps:1 · howto:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-NbkmZkm1ao8-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/NbkmZkm1ao8.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].