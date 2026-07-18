---
title: "Bend - Onshape Sheet Metal"
domain: cad
source: youtube
videoId: azqA6N0lHgQ
url: https://www.youtube.com/watch?v=azqA6N0lHgQ
channel: "Onshape"
duration_s: 130
tribal_entries: 2
chunks_scanned: 3
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Bend - Onshape Sheet Metal

**Channel:** [Onshape](https://www.youtube.com/watch?v=azqA6N0lHgQ)
**Duration:** 2m 10s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 2 of 3 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> the bend feature folds sheet metal along a reference and is useful when traditional methods may be timec consuming to ad

the bend feature folds sheet metal along a reference and is useful when traditional methods may be timec consuming to add for instance creating a sheet metal part based on an imported dxf start a new Bend feature select a Bend line reference in the graphics area this reference is a line or Edge that defines the bent location it does not have to belong to any particular sketch and can extend along multiple Cuts in the same face and be at any angle to the selected face select a single sheet metal face to bend for multiple bends create additional Bend features click the hold opposite side toggle

_Signals: howto:5_

### Tip 2 — confidence 0.4

> of the bent wall with the bend line next choose how to control the bend angle the bend angle field allows users to input

of the bent wall with the bend line next choose how to control the bend angle the bend angle field allows users to input a specific angle aligned to Geometry aligns the bend Bend parallel to a face Edge plane or mate connector angle from Direction aligns the bend at an angle based on a face Edge plane or mate connector the bend feature automatically uses the bend radius and K Factor values specified in the sheet metal model feature if required uncheck either option and input custom values the bend does not affect the dimensions of the flat pattern when using a custom K Factor it modifies the

_Signals: toolpath:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-azqA6N0lHgQ-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/azqA6N0lHgQ.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].