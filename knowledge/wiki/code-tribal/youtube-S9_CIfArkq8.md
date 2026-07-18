---
title: "Automated Feature Recognition in NX CAM Wire EDM Advanced"
domain: wedm
source: youtube
videoId: S9_CIfArkq8
url: https://www.youtube.com/watch?v=S9_CIfArkq8
channel: "Siemens Software"
duration_s: 243
tribal_entries: 1
chunks_scanned: 5
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Automated Feature Recognition in NX CAM Wire EDM Advanced

**Channel:** [Siemens Software](https://www.youtube.com/watch?v=S9_CIfArkq8)
**Duration:** 4m 3s
**Domain:** `wedm` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 1 of 5 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `wedm`.

### Tip 1 — confidence 0.51

> Note, this also includes the tool path generation

Note, this also includes the tool path generation. Very quickly, the features are found, and tool paths are created. You can go through the list of features and review each path. Here we see three tool paths with different offsets. You can now change one of the features or multiple ones to be cut as a pocket, so all the material can be removed, so there is no need to consider what happens if part of the material will fall. To verify the program, you can review the tool path with material removal. If the result is OK, you can output the tool paths into an NC program file.

_Signals: toolpath:3 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-S9_CIfArkq8-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `wedm`
- Source artifact: `state/shared/youtube-extraction/S9_CIfArkq8.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].