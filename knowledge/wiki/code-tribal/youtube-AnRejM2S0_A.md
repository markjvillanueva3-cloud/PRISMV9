---
title: "Tool Nose Radius Compensation (Manual) A look at what is required to get a radius correct"
domain: lathe
source: youtube
videoId: AnRejM2S0_A
url: https://www.youtube.com/watch?v=AnRejM2S0_A
channel: "smallcnclathes"
duration_s: 113
tribal_entries: 1
chunks_scanned: 3
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Tool Nose Radius Compensation (Manual) A look at what is required to get a radius correct

**Channel:** [smallcnclathes](https://www.youtube.com/watch?v=AnRejM2S0_A)
**Duration:** 1m 53s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 1 of 3 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.45

> radius or line for the chamfer is in green and the red line is the line that you have to create and make the tool follow

radius or line for the chamfer is in green and the red line is the line that you have to create and make the tool follow to get what you actually want you can see there on that in the center of the shamp of the offset is quite big basically for a external you add the radius of the tool to the radius you want to cut and for an internal you have to subtract it if you imagine going up to a sharp corner that radius is already there so you have to subtract it from the radius that you want this is a chamfer I ordinarily use a 0.5 millimeter chamfer on the parts I make just to have stop every sharp

_Signals: camOps:3 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-AnRejM2S0_A-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/AnRejM2S0_A.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].