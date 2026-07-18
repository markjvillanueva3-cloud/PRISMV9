---
title: "How to Program a Renishaw Probe to Automatically Adjust Tool Offsets and Recut Parts"
domain: general
source: youtube
videoId: 9onq3zqjGCA
url: https://www.youtube.com/watch?v=9onq3zqjGCA
channel: "automatedmfg"
duration_s: 562
tribal_entries: 4
chunks_scanned: 16
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# How to Program a Renishaw Probe to Automatically Adjust Tool Offsets and Recut Parts

**Channel:** [automatedmfg](https://www.youtube.com/watch?v=9onq3zqjGCA)
**Duration:** 9m 22s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 16 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.41

> condition least material condition least material condition meaning oversized for a bore or undersized for a boss unders

condition least material condition least material condition meaning oversized for a bore or undersized for a boss undersized for a boss undersized for a boss too much material has been removed and since material cannot be added on with the typical machine tool the typical machine tool the typical machine tool the part cannot be fixed the machine should then stop and reject this part if the feature is out of tolerance by most material condition meaning undersized for bore or oversized for a boss for a boss for a boss not enough material has been removed so the cycle can be run again with an

_Signals: camOps:2_

### Tip 2 — confidence 0.52

> updated tool offset to remove more material more material more material after the recut the probe will measure the featu

updated tool offset to remove more material more material more material after the recut the probe will measure the feature again the feature again the feature again to verify it is now intolerance now let's take a look at the actual g-code program g-code program g-code program this program is for the analysis of a 1.20 bore 1.20 bore 1.20 bore located at g54 x0 located at g54 x0 located at g54 x0 y0 with z0 located on the top surface first we use tool 14 to cut the 1.20 bore bore bore note that we have a line number before the tool change so that we can easily return to this section of the

_Signals: camOps:6 · howto:2_

### Tip 3 — confidence 0.5

> program for the recut for the recut for the recut now it's time to measure this machine uses tool 25 for the probe so we

program for the recut for the recut for the recut now it's time to measure this machine uses tool 25 for the probe so we will call it to the machine we then make our work and tool offsets active with g54 and g43 we then turn the probe on with the g65 p9832 command p9832 command p9832 command using the protected probe positioning command command command g65 p9810 g65 p9810 g65 p9810 we move to x 0 y 0 and then z negative 0.5 half an inch inside the bore bore bore once we are inside the bore we use the diameter measure command diameter measure command diameter measure command g65 p9814 g65

_Signals: camOps:5_

### Tip 4 — confidence 0.5

> into variable output into variable output into variable pound one three we will then save the value value value of pound

into variable output into variable output into variable pound one three we will then save the value value value of pound 138 to pound 100 for our analysis let's assume that for our bore our bore our bore of diameter 1.20 we have a tolerance of plus or minus plus or minus plus or minus 5 thou therefore anything between 1.195 and 1.205 1.195 and 1.205 1.195 and 1.205 should be accepted because this is a bore bore bore any diameter greater than 1.205 has had too much material removed and must be rejected must be rejected must be rejected any diameter less than 1.195 has had too little material

_Signals: camOps:6_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-9onq3zqjGCA-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/9onq3zqjGCA.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].