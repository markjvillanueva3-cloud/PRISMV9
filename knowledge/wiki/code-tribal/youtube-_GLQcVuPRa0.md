---
title: "Turning Collision Checking - PowerMill 2018"
domain: lathe
source: youtube
videoId: _GLQcVuPRa0
url: https://www.youtube.com/watch?v=_GLQcVuPRa0
channel: "Autodesk Advanced Manufacturing"
duration_s: 139
tribal_entries: 3
chunks_scanned: 3
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Turning Collision Checking - PowerMill 2018

**Channel:** [Autodesk Advanced Manufacturing](https://www.youtube.com/watch?v=_GLQcVuPRa0)
**Duration:** 2m 19s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 3 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.68

> power mill 2018 can now safely clean check your turning tool holders the same as if you were to verify a milling tool pa

power mill 2018 can now safely clean check your turning tool holders the same as if you were to verify a milling tool path path path let's start by simulating my grooving tool path we will begin by activating the tool path in the normal way once done we can select our tool path we wish to simulate then ensure collision checking is turned on and open the forum simulation issues for if there is a problem within the tool path tick the box to let us verify against the tool holder fill in my required clearances and simulate my tool path as you can see we have quite a few issues simply by clicking

_Signals: toolpath:6 · camOps:1 · safety:1 · howto:1_

### Tip 2 — confidence 0.49

> on any of these power mill will put the tool holder in the position where the issues occurred and we can take a closer l

on any of these power mill will put the tool holder in the position where the issues occurred and we can take a closer look taking a closer look we can see that the issue is that the tool holder doesn't have enough clearance behind the tip to machine this part without causing us an issue luckily we have a modified tool holder in our carousel so in this simulation issue forum we can select clear and close the form activate our a little older which as you can now see has more of a clearance angle at the back of the tool holder open up the settings of the tool path recycle our tool path settings

_Signals: toolpath:2 · camOps:1 · howto:1_

### Tip 3 — confidence 0.52

> and go to the tool forum change the tool we are using and calculate the tool path once again and close the forum so now 

and go to the tool forum change the tool we are using and calculate the tool path once again and close the forum so now if we navigate back to the simulation tab ensure we have collision checking turned on and open the simulation issues form clear any previous issues that may be in the forum and simulate the tool path we can now see that we have fixed a problem and these are the enhancements we have made in power mill 2018 for collision checking turning tool holders

_Signals: toolpath:2 · camOps:1 · safety:2 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-_GLQcVuPRa0-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/_GLQcVuPRa0.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].