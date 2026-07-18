---
title: "QUICK TIP: Sheetmetal Parametric Flange"
domain: cad
source: youtube
videoId: UeCoU1AHqFs
url: https://www.youtube.com/watch?v=UeCoU1AHqFs
channel: "Autodesk Fusion"
duration_s: 100
tribal_entries: 2
chunks_scanned: 3
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# QUICK TIP: Sheetmetal Parametric Flange

**Channel:** [Autodesk Fusion](https://www.youtube.com/watch?v=UeCoU1AHqFs)
**Duration:** 1m 40s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 2 of 3 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> Hey there, it's Bryce here with a quick tip on making sheet metal flanges parametric

Hey there, it's Bryce here with a quick tip on making sheet metal flanges parametric. Let's jump right on in. When you use the flange tool within the sheet metal workspace, some of you will notice that you can drag the arrow, then this will allow you to select geometry to specify the length of the flange, but be careful. This technique does not create parametric relationship to the selected face. face. face. This sets the distance for the flange at the time of creation of this flange. To prove it, let's make a change to the length of these outside flanges.

_Signals: howto:5_

### Tip 2 — confidence 0.45

> Let's activate the extrude tool, select the face of the flange, and start to pull out this flange again

Let's activate the extrude tool, select the face of the flange, and start to pull out this flange again. Note, make sure the operation is set to join. join. join. Next, we can change the extent option to two object, and we can select the bottom face again. face again. face again. Using this technique will create the parametric relationship, so when a design change is made, this flange will always go to the bottom face to meet our design intent. design intent. design intent. Well, that's my short sheet metal quick tip. Keep on Fusioning.

_Signals: safety:1 · howto:6_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-UeCoU1AHqFs-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/UeCoU1AHqFs.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].