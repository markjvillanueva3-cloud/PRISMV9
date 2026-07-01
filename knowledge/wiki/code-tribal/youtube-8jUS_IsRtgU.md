---
title: "CNC Turning and Hand Finishing Column Bases"
domain: lathe
source: youtube
videoId: 8jUS_IsRtgU
url: https://www.youtube.com/watch?v=8jUS_IsRtgU
channel: "Made of stone"
duration_s: 1018
tribal_entries: 7
chunks_scanned: 24
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# CNC Turning and Hand Finishing Column Bases

**Channel:** [Made of stone](https://www.youtube.com/watch?v=8jUS_IsRtgU)
**Duration:** 16m 58s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 24 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.41

> In this episode, In this episode, I briefly consider working the old way

In this episode, In this episode, I briefly consider working the old way. I'm thinking about a career in plumbing and turning a square on a lathe. Hey everyone, today we are moving forward with another important part of the Astroski restoration, the basis for the columns. While the mill is working on the marble capitals, I'm here preparing what those capitals will eventually stand on. The first thing we need to do is drill the center holes for mounting the blanks on the machine. I have quickly assembled the electrical part of my polishing machine so it can handle drilling as well.

_Signals: camOps:2_

### Tip 2 — confidence 0.4

> If we set that aside, the drilling itself is actually a pleasure

If we set that aside, the drilling itself is actually a pleasure. I'm not applying much pressure on the drill at this stage. This is a first test and I'm still learning the real capabilities of the machine. I'm confident this process can be at least three times faster. Right now, the feed speed is fixed. It's hardcoded in my Arduino controller. In the future, I'll add a variable resistor so I can adjust the feed rate depending on the material. For marble, for example, much higher speeds should be possible. possible. possible.

_Signals: camOps:1 · howto:2_

### Tip 3 — confidence 0.4

> If the machining stops midcut due to a power loss, it's not a problem

If the machining stops midcut due to a power loss, it's not a problem. The rotation brings me back to exact same point. The roughing passes are short. The finishing passes are short. So whenever there is a window of power, I can jump in and continue. Let me briefly explain my work plan for the column bases. After drilling the center holes, the first operation is mounting the blank on the lathe and turning a square block into a round one. I don't want to meal all four corners into dust. Instead, I'm using a trapaning like strategy. The spindle is oriented parallel to the longitudinal feed.

_Signals: toolpath:1_

### Tip 4 — confidence 0.47

> So the marble supplier generously provided a slightly oversized blank

So the marble supplier generously provided a slightly oversized blank. First step is to trim the excess material before moving on to roughing and finishing. In my cam settings, you may have noticed that the tool thickness is 3 mm while the step over is 10 mm. That means we intentionally leave about 7 mm of straw between passes. After cutting these thin ribs, I simply knock them off with a hammer. The 7 mm straw thickness we leave between passes is not a fixed rule. It depends entirely on the complexity of the geometry. complexity of the geometry. complexity of the geometry.

_Signals: params:4_

### Tip 5 — confidence 0.48

> In this case, the capital has intricate forms and small transitions

In this case, the capital has intricate forms and small transitions. So, the stepover must remain relatively small. If we were machining a simple straight column, we could easily increase the step over to 20 or even 30 mm and still break off the ribs just as efficiently. The piece I trimmed at the very beginning was about 40 mm thick. So the strategy always depends on the form you're working with. This approach has two advantages. First, I avoid making additional tool passes to remove those extra 7 mm, which significantly speeds up the machining process. up the machining process.

_Signals: params:3 · safety:1_

### Tip 6 — confidence 0.41

> During the finishing, the tool follows the profile directly

During the finishing, the tool follows the profile directly. I use relatively low feed rates on the Y and Zaxis while running the highest rotational speed on the AIS. This combination results in a much cleaner surface. I also make two passes. During cutting, the tool experiences uneven load, which can cause slight deflection. So I leave a 0.5 mm offset on the first pass. Then I remove the offset with the final spring pass. And that completes the machining stage. One more important detail about the spring pass. In this case, we deliberately chose a thin 3 mm tool.

_Signals: params:2_

### Tip 7 — confidence 0.41

> I don't recommend it using a machine on the early grids

I don't recommend it using a machine on the early grids. It is very easy to round edges or distort the geometry if you are not careful. After progressing through the finer grids, I finish with a very soft 1200 grit pad. We are not aiming for a mirror polish here. The goal is a noble semi matte sheen. Finally, I use a soft muslin buffing wheel with a polishing compound to bring out that subtle refined finish. At this stage, polishing is complete. All that remains is to remove the workpiece and clean up the small excess fragments left from the oversized blank.

_Signals: camOps:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-8jUS_IsRtgU-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/8jUS_IsRtgU.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].