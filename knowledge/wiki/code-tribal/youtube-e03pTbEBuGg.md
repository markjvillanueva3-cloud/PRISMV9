---
title: "CNC LATHE PROGRAMMING - SINGLE POINT THREADING"
domain: lathe
source: youtube
videoId: e03pTbEBuGg
url: https://www.youtube.com/watch?v=e03pTbEBuGg
channel: "Tom Stikkelman"
duration_s: 680
tribal_entries: 4
chunks_scanned: 14
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# CNC LATHE PROGRAMMING - SINGLE POINT THREADING

**Channel:** [Tom Stikkelman](https://www.youtube.com/watch?v=e03pTbEBuGg)
**Duration:** 11m 20s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 14 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.44

> we're tapering out at a 17 1 12 degree for about an inch so let's take a look at the process on the machine and then we'

we're tapering out at a 17 1 12 degree for about an inch so let's take a look at the process on the machine and then we'll take a look at the program all right we're starting off with the g72 can cycle taking about 15,000 per pass roughing and finishing the face you can hear the can hear the can hear the g96 constant service speed with a Max RPM of 3,000 RPM and we're going right into the g71 a rough OD can cycle taking about 80,00 th000 off the diameter as we're roughing the excess stock off stock off stock off there breaking up the chips very nicely we're going to leave about 30,000 on X

_Signals: camOps:1 · params:2_

### Tip 2 — confidence 0.47

> and 15,000 on Z it's going to take one more rough pass one more rough pass one more rough pass smoothing everything smoo

and 15,000 on Z it's going to take one more rough pass one more rough pass one more rough pass smoothing everything smoothing everything smoothing everything out and we come back and do a finish pass and then we do a thread relief all right so now we're ready for threading all right so we're taking about 1,000 depth of cut and you can see that the tool starts about 200,000 in front of the part and that gives the machine time to perfectly synchronize the Z axis and the spindle RPM each time it goes back into the cut because everything has to be lined up perfectly now as you go deeper the chip

_Signals: camOps:4_

### Tip 3 — confidence 0.44

> and that's it all right so this is the code that was used in the video to turn our half inch 20 thread so we pick up too

and that's it all right so this is the code that was used in the video to turn our half inch 20 thread so we pick up tool number nine and we turn the spindle on to 1,000 RPM we wrap it to a go g54 X 700,000 and then 200 100,000 in the front of the part then we put the machine in g99 which is inches per Revolution mode and then we start our g92 threading cycle and our first pass is going to be made at x496 the zv value is the end point of the thread and the f is the lead of the thread now the way you figure that is if you divide one inch into 20 because we have 20 threads per inch on our half

_Signals: camOps:2 · params:1_

### Tip 4 — confidence 0.4

> angle which means that it will plunge straight down and you can also move in at 29° which means it stays off the backsid

angle which means that it will plunge straight down and you can also move in at 29° which means it stays off the backside of the thread by about one Dee and that may be a preferred method for many all right so then the Q10 is the minimum depth of cut on each pass now we watched the video and we were in feeding 1,000 depth of cut per pass the machine does not allow decimal so we're going to have to move the decimal four places to the right so it's 1 2 3 4 and then we come up with Q10 and we do the same thing for the R value now the R value is the depth of the last pass so again that is 1,000

_Signals: toolpath:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-e03pTbEBuGg-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/e03pTbEBuGg.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].