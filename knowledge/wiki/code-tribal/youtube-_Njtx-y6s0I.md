---
title: "Joints, Mates, and Moving Things Around in Autodesk Fusion"
domain: cad
source: youtube
videoId: _Njtx-y6s0I
url: https://www.youtube.com/watch?v=_Njtx-y6s0I
channel: "Autodesk Fusion"
duration_s: 628
tribal_entries: 2
chunks_scanned: 18
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Joints, Mates, and Moving Things Around in Autodesk Fusion

**Channel:** [Autodesk Fusion](https://www.youtube.com/watch?v=_Njtx-y6s0I)
**Duration:** 10m 28s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 2 of 18 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> we're using joints if we go to assemble and we select joint we simply need to determine the motion in this case rigid an

we're using joints if we go to assemble and we select joint we simply need to determine the motion in this case rigid and the location that we want everything to be placed together now in our case the end of our pin is going to be at the end of this bore now those two are rigid which means if we move the piston the pin is going to go with it so once again there are options to use things like a line so that way we get all the components in their correct location but we can also simply select the appropriate location when we're using a joint tool so now we have an interesting situation we have

_Signals: camOps:1 · howto:2_

### Tip 2 — confidence 0.47

> a space between the piston on the inside and we have a connecting rod if we do a quick measurement we can take a look an

a space between the piston on the inside and we have a connecting rod if we do a quick measurement we can take a look and see the width of the inside of this is going to be 20 mm to be 20 mm to be 20 mm and if we measure the outside distance of the connecting rod we can see that this is exactly 20 mm now in reality generally we will have a small Gap and what that means is we can't use coincident relationships between faces coincident relationships between faces coincident relationships between faces and we really have to use a Center Point location when we're creating a joint for example in

_Signals: params:4_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-_Njtx-y6s0I-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/_Njtx-y6s0I.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].