---
title: "G & M Code | Secret Technique for Deep Hole Drilling | CNC Machining | Vlog #109"
domain: mill
source: youtube
videoId: 3B_w1asSGzM
url: https://www.youtube.com/watch?v=3B_w1asSGzM
channel: "TITANS of CNC MACHINING"
duration_s: 355
tribal_entries: 5
chunks_scanned: 8
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# G & M Code | Secret Technique for Deep Hole Drilling | CNC Machining | Vlog #109

**Channel:** [TITANS of CNC MACHINING](https://www.youtube.com/watch?v=3B_w1asSGzM)
**Duration:** 5m 55s
**Domain:** `mill` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 8 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `mill`.

### Tip 1 — confidence 0.41

> video up there's a bunch of comments underneath asking hey Titan how did you actually program that drill did you use a c

video up there's a bunch of comments underneath asking hey Titan how did you actually program that drill did you use a cam and the answer is no even though there are some amazing deep hole drilling cycles throughout different cam products so what I did was actually hand code the drilling cycle why would I do that if you could actually do it in cam because I wanted absolute control deep hole drilling in stainless as superalloys is an art all right and you have to treat it as such so I figured I'll just give you the code that I use to successfully drill stainless 40 times diameter boom alright

_Signals: camOps:2_

### Tip 2 — confidence 0.45

> I'm simply gonna give you the code now we're gonna start at Z point 1 X Y is 0 and it's centered perfectly over the pre-

I'm simply gonna give you the code now we're gonna start at Z point 1 X Y is 0 and it's centered perfectly over the pre-drilled hole okay in the other video we had a pilot drill that went down Z that went down Z that went down Z one point two although the pilot drill was the same diameter that tongs was on the plus side and the tolerance on this deep hole drill is on the minus side because we don't want any rubbing all right so this is where we started where Z point one and we're ready to drop into the hole so the first I'm gonna do is we're trying to swindle so it's going the m3s 183 which

_Signals: camOps:3 · howto:1_

### Tip 3 — confidence 0.42

> turns on the spindle clockwise at a hundred and eighty-three rpms which is ten percent of my speed I'm gonna use for act

turns on the spindle clockwise at a hundred and eighty-three rpms which is ten percent of my speed I'm gonna use for actually drilling the stainless why is it so low because I don't want any wobble when I actually dropped into the pre-drilled in the other video I explained why a lot of people actually reverse the spindle when they drop in also talked about the drill tip and the diameters etc all right now while I'm outside of the hole I'm going to turn on my flood coolant so m8 it doesn't matter I could have it off I could have it on but in case a touch metal I want the lubricity okay so our

_Signals: camOps:2 · howto:1_

### Tip 4 — confidence 0.54

> first Z movement is gonna go 1 times diameter alright so we're gonna go Z negative 3 1 2 5 and the feed is gonna be at p

first Z movement is gonna go 1 times diameter alright so we're gonna go Z negative 3 1 2 5 and the feed is gonna be at point 5 5 which is also 10% of my overall feed that I'm gonna use later right so I'm just at 10% so I'm dropping down to Z negative 3 12 I'm dropping down into the hole once I'm engaged inside the hole and my tip is not in danger of hitting the corner of the pre-drilled hole at this time I'm going to turn off the flood coolant and I'm going to turn on the true coolant that's gonna come through the tip of the drill now that my drill is secure in the hole I'm gonna turn up the

_Signals: camOps:5 · safety:1_

### Tip 5 — confidence 0.58

> gonna add a 12 and now the feed rate goes up to 5

gonna add a 12 and now the feed rate goes up to 5.5 and guess what there is no stopping now we're just gonna plunge all the way down feeding at 5.5 40 times diameter breaking little chips all the way down in stainless steel once we break through you'll see the coolant sorry blasting through the bottom of the hole okay at that time I'm just gonna slow the drill down to 100 rpms I'm gonna turn my coolant off and I'm just gonna bring my drill out of the hole 50 inches a minute nice and cool boom we're ready for the next hole and that is exactly how I hand programmed this SGL drill

_Signals: toolpath:1 · camOps:4 · params:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-3B_w1asSGzM-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `mill`
- Source artifact: `state/shared/youtube-extraction/3B_w1asSGzM.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].