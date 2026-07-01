---
title: "Weldments Documentation"
domain: general
source: youtube
videoId: vcnMvoQ5iDQ
url: https://www.youtube.com/watch?v=vcnMvoQ5iDQ
channel: "TriMech Tech Tips Channel"
duration_s: 211
tribal_entries: 1
chunks_scanned: 5
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Weldments Documentation

**Channel:** [TriMech Tech Tips Channel](https://www.youtube.com/watch?v=vcnMvoQ5iDQ)
**Duration:** 3m 31s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 1 of 5 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.4

> Using the same trimming tool, notches can be automatically cut into members, ensuring they fit into surrounding geometry

Using the same trimming tool, notches can be automatically cut into members, ensuring they fit into surrounding geometry. Again, a quick look at the joint and you can see how the members have been cut back to fit. Design change is important. In the same way you would edit a feature like extrude or revolve, you can change the section profile type, corner treatment, weld gap or angle. Here you can see that the square section was changed to rectangular and rotated 90°. Instant 3D can also be used to make edits on the fly.

_Signals: camOps:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-vcnMvoQ5iDQ-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/vcnMvoQ5iDQ.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].