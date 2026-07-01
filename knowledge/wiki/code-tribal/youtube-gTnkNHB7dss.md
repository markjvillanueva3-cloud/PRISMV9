---
title: "How To Calculate Speeds and Feeds (Metric Version) - Haas Automation Tip of the Day"
domain: general
source: youtube
videoId: gTnkNHB7dss
url: https://www.youtube.com/watch?v=gTnkNHB7dss
channel: "Haas Automation, Inc."
duration_s: 879
tribal_entries: 3
chunks_scanned: 19
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# How To Calculate Speeds and Feeds (Metric Version) - Haas Automation Tip of the Day

**Channel:** [Haas Automation, Inc.](https://www.youtube.com/watch?v=gTnkNHB7dss)
**Duration:** 14m 39s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 19 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.41

> important that we get this right if you don't choose the right material group you are gonna burn up your tools titanium 

important that we get this right if you don't choose the right material group you are gonna burn up your tools titanium has a different machine ability than mild steel if you try running a drill or an end mill in titanium at cutting speeds meant for mild steel you are gonna melt that tool it will overheat and fail so if you can't find what material group your stock should be in then give your tooling representative a call they would love to hear from you how many tooling reps out there would love to hear from one of our viewers and talk tools yeah that's what I thought from the section of the

_Signals: camOps:2_

### Tip 2 — confidence 0.4

> what's a tooth this is a tooth it's just a cutting edge along the outside of a tool an insert is also a tooth it's for m

what's a tooth this is a tooth it's just a cutting edge along the outside of a tool an insert is also a tooth it's for most tools the number of teeth matches the number of flutes this tool has three flutes three teeth this tools got six teeth and this one's got four we want our tool to take a very specific size bite with each tooth this is our feed for two in millimeters just like our cutting speed the book or PDF will give us that feed per tooth value the catalog says that for my tool material and type of tool path point zero eight millimeters per tooth is a good starting range 0.08 our feed

_Signals: toolpath:1_

### Tip 3 — confidence 0.43

> you're slotting your bite is going to be about 25% less than if you're just side milling with the popularity of optimize

you're slotting your bite is going to be about 25% less than if you're just side milling with the popularity of optimized tool paths like dynamic adaptive volume mill type high speed machining tool paths the two manufacturers are getting more and more specific with their speed and feed recommendations so you'll often see charts like the one we'll show you here listing all kinds of different tool paths you'll choose one and then match your speed and feed to the path that you're using now if you are dealing with drills and not end mills our feed rate might be listed in our catalogues as a feed

_Signals: toolpath:1 · camOps:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-gTnkNHB7dss-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/gTnkNHB7dss.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].