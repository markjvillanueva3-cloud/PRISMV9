---
title: "How to Program Constant Surface Speed in a CNC Turning | G96 Explained | DIY Video"
domain: lathe
source: youtube
videoId: BbrRDjoD_z4
url: https://www.youtube.com/watch?v=BbrRDjoD_z4
channel: "ACEMICROMATIC GROUP"
duration_s: 209
tribal_entries: 3
chunks_scanned: 5
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# How to Program Constant Surface Speed in a CNC Turning | G96 Explained | DIY Video

**Channel:** [ACEMICROMATIC GROUP](https://www.youtube.com/watch?v=BbrRDjoD_z4)
**Duration:** 3m 29s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 5 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.56

> The part [music] diameter is 120 mm

The part [music] diameter is 120 mm. Now spindle speed is calculated by substituting the values. values. values. Spindle [music] speed is 530 RPM as shown in the calculation. shown in the calculation. shown in the calculation. Let's look at some CSS controls. G92 [music] for spindle speed limitation. G96 for constant surface speed and G97 for cancelling constant surface speed. The [music] machine can be programmed to keep the surface speed constant through AG code G96 for the CSS command. In this example, facing operation is done on 124 deer component with CSS of 200 m per [music] minute.

_Signals: params:2 · gcode:4_

### Tip 2 — confidence 0.5

> Here are the programming chords

Here are the programming chords. G92S1500 chords. G92S1500 chords. G92S1500 G96S200 [music] The spindle [music] speed is 530 RPM while facing diameter at 120 [music] mm. Once CSS is programmed, spindle speed automatically increases as diameter of the job decreases. [music] the job decreases. [music] the job decreases. [music] Now spindle speed is 800 RPM at facing diameter 80 mm diameter 80 mm diameter 80 mm [music] and at 40 mm facing diameter spindle [music] speed is 1500 RPM spindle speed will not increase further as G92S500 as G92S500 as G92S500 [music] is programmed.

_Signals: params:7_

### Tip 3 — confidence 0.5

> [music] is programmed

[music] is programmed. [music] is programmed. Here is another example of multiple diameters turning shaft [music] 40 mm 80mm 120 mm is being turned with constant surface speed of 200 m per minute. Turning is started at [music] 40 mm with the spindle speed of 1500 RPM. As the tool progresses, you [music] may observe spindle speed is constant during turning operation. turning operation. turning operation. [music] As the diameter increases for the next flange 80 mm, the spindle speed decreases to 800 RPM. [music] CSS is used for all operations except threading [music] and hole machining.

_Signals: params:7_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-BbrRDjoD_z4-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/BbrRDjoD_z4.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].