---
title: "Find Features from Imported Designs"
domain: cad
source: youtube
videoId: sV_ZFaYemYU
url: https://www.youtube.com/watch?v=sV_ZFaYemYU
channel: "Autodesk Fusion"
duration_s: 260
tribal_entries: 2
chunks_scanned: 4
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Find Features from Imported Designs

**Channel:** [Autodesk Fusion](https://www.youtube.com/watch?v=sV_ZFaYemYU)
**Duration:** 4m 20s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 2 of 4 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> in this video we're gonna see how to use tools inside of fusion 360 such as find features to allow us to quickly make ch

in this video we're gonna see how to use tools inside of fusion 360 such as find features to allow us to quickly make changes on imported geometry in this example let's say we are designing an assembly and we need a bearing block of a particular size but the vendor does not have a 3d model of it however we found one similar on the web but we want to edit it to match our design the first thing is to remove the logo from the top by just drawing a selection box around it and selecting delete notice we are able to easily remove the unwanted geometry next we need to move the grease zerk to the top

_Signals: camOps:1 · howto:2_

### Tip 2 — confidence 0.4

> called find features find features allows you to scan for fill its holes chamfers etc or you can have it scan for everyt

called find features find features allows you to scan for fill its holes chamfers etc or you can have it scan for everything in this case we'll scan for everything and draw a selection box around all of it after a few moments you can see that all of the features that were recognized in the browser as you hover over each feature in the browser it highlights it on the model for example if we wanted to delete the slots from the bearing block we would just select the mirrored feature and delete it feature and delete it feature and delete it you can also edit existing Philips by selecting them and

_Signals: howto:5_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-sV_ZFaYemYU-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/sV_ZFaYemYU.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].