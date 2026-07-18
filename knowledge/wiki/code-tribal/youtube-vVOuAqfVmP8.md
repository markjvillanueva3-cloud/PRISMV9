---
title: "Conquering CNC Cut-Off Tools"
domain: general
source: youtube
videoId: vVOuAqfVmP8
url: https://www.youtube.com/watch?v=vVOuAqfVmP8
channel: "PTSecrets - Performance Tooling Secrets"
duration_s: 260
tribal_entries: 2
chunks_scanned: 6
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Conquering CNC Cut-Off Tools

**Channel:** [PTSecrets - Performance Tooling Secrets](https://www.youtube.com/watch?v=vVOuAqfVmP8)
**Duration:** 4m 20s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 2 of 6 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.49

> With G96, RPM increases as the diameter decreases, keeping surface speed decreases, keeping surface speed decreases, kee

With G96, RPM increases as the diameter decreases, keeping surface speed decreases, keeping surface speed decreases, keeping surface speed constant. constant. constant. Sounds perfect, Sounds perfect, Sounds perfect, but there's always a button. RPM can't increase forever. increase forever. increase forever. That's why we use G50 to cap the maximum RPM based on vibration chuck limits or safety. Let's say, for example, we're cutting off a 2-in diameter bar stock, and we want to run at 400 surface feed and 5,000 per rev. and 5,000 per rev. and 5,000 per rev.

_Signals: gcode:2 · safety:1_

### Tip 2 — confidence 0.5

> We'll use G96 S400 and set G50 at 3,000 RPM

We'll use G96 S400 and set G50 at 3,000 RPM. Everything runs great until we hit about a/ inch in diameter. At that point, we've hit the max RPM. To maximize tool life and performance, we adjust the feed rate. At 1/2 in diameter, reduce the feed by 20% down to 4,000. At 3/8, reduce it again to 3000. At a/4, down to 2000. And at an eighth, reduce to 1 thou per rev until the part is cut off. is cut off. is cut off. It's a few extra lines of code, but the result is longer tool life, fewer breakages, real cost savings. breakages, real cost savings. breakages, real cost savings. That's worth it.

_Signals: params:1 · gcode:2 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-vVOuAqfVmP8-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/vVOuAqfVmP8.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].