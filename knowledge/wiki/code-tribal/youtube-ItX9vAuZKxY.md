---
title: "What is the Sheet Metal K-Factor DEFAULT VALUE in SOLIDWORKS?"
domain: cad
source: youtube
videoId: ItX9vAuZKxY
url: https://www.youtube.com/watch?v=ItX9vAuZKxY
channel: "Too Tall Toby"
duration_s: 482
tribal_entries: 3
chunks_scanned: 14
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# What is the Sheet Metal K-Factor DEFAULT VALUE in SOLIDWORKS?

**Channel:** [Too Tall Toby](https://www.youtube.com/watch?v=ItX9vAuZKxY)
**Duration:** 8m 2s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 14 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> in well now what I'm going to do is I'm going to go to the sheet metal feature right Mouse button edit feature and I'm g

in well now what I'm going to do is I'm going to go to the sheet metal feature right Mouse button edit feature and I'm going to see that I'm using K Factor to calculate what that bend region is going to be in the flat and the K Factor I'm using is 0.5 well let's change that to change that to change that to 0.333 and we hit the green check mark and now we see here that if we look at this Bend region and we click on this Edge and hold control and click on this edge here and then we look down here in the status bar now we see that that distance is distance is distance is 0.458 so it changed it

_Signals: howto:5_

### Tip 2 — confidence 0.45

> was 0

was 0.491 now it's it's it's 0.458 so why did it change well when we're calculating the K factor of a Bend what we're really doing is we're taking a ratio into the material and then we're taking this arc length and we're calculating that Arc Length so if we were to use a k factor of 0.5 what we would be doing is offsetting this inner edge here by 1/2 of the material thickness so if this sheet metal is 2 mm then that would be an offset of 1 mm if we were using a k factor of 0.333 factor of 0.333 factor of 0.333 then this Arc Length here would be an offset of 2 mmtimes 0.333 or it would be an

_Signals: params:3 · howto:1_

### Tip 3 — confidence 0.4

> going to take that arc length and we're going to flatten it and that is going to give us a pretty nice result for our fl

going to take that arc length and we're going to flatten it and that is going to give us a pretty nice result for our flat pattern so one of the questions that came up when I taught my sheet metal training class A couple of weeks ago was What should the default k B if we're not sure what to use and I always answer my students by saying just make it make it make it 0.333 that's a good K Factor if you use that the team in the shop isn't going to yell at you you know they might tell you to change it but they're not going to say that that is absurd 0.333 is a pretty good way to go but I was

_Signals: safety:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-ItX9vAuZKxY-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/ItX9vAuZKxY.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].