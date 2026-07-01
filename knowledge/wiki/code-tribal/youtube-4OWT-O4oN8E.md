---
title: "Editing Post Processors & G-Code with Visual Studio Code"
domain: general
source: youtube
videoId: 4OWT-O4oN8E
url: https://www.youtube.com/watch?v=4OWT-O4oN8E
channel: "NYC CNC"
duration_s: 540
tribal_entries: 3
chunks_scanned: 14
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Editing Post Processors & G-Code with Visual Studio Code

**Channel:** [NYC CNC](https://www.youtube.com/watch?v=4OWT-O4oN8E)
**Duration:** 9m 0s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 14 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.41

> here so by double-clicking on it it automatically jumps to the section in the post that created that g95 what's even bet

here so by double-clicking on it it automatically jumps to the section in the post that created that g95 what's even better is I can pretty quickly read this line of code even if I'm new to post processors and you can see ok G modal feeder 8 format 95 awesome awesome awesome I'm gonna select all of that delete it hit ctrl s to save and when I save it a tree posts and deleted that line it's just that simple now let's show how you can use this can use this can use this same process but with your posted g-code instead of this sample g-code before we do that though it's a good reminder to always

_Signals: safety:1 · howto:2_

### Tip 2 — confidence 0.45

> be incredibly careful when you're modifying postprocessors modifying postprocessors modifying postprocessors I always re

be incredibly careful when you're modifying postprocessors modifying postprocessors modifying postprocessors I always recommend copying the post processor out put it in a quarantine folder modifying it separately from the main post that way you can always go back or refer back to the original post and be very careful when you run a new post processor for the first time in order to evaluate our posted code in Visual Studio code hit f1 and type download CNC exporting Post this should Auto populate and when you click that it will let you save a CPS file a Windows glitch here I'm going to delete

_Signals: safety:2 · howto:2_

### Tip 3 — confidence 0.42

> that and I'll save this CPS file right now here to my temp folder I'm now gonna take this sample part is actually the pa

that and I'll save this CPS file right now here to my temp folder I'm now gonna take this sample part is actually the part that we make in our five axis training class card here to the NYC CNC hands-on and online training classes that we offer let's take this folder post process and I'm gonna navigate to where I just downloaded that new CPS post and you'll see it pop up in the drop down it should say export CSV file to Visual Studio code click post and I'm gonna put that in a special folder so I know where it is we get a warning pop-up that this may be unsafe that's okay you can click yes all

_Signals: safety:1 · howto:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-4OWT-O4oN8E-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/4OWT-O4oN8E.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].