---
title: "Introduction to Routing and Harness Design in NX CAD - Tutorial - PROLIM Webinar"
domain: cad
source: youtube
videoId: 2yVEHcIrWkA
url: https://www.youtube.com/watch?v=2yVEHcIrWkA
channel: "PROLIM Global Corporation"
duration_s: 984
tribal_entries: 6
chunks_scanned: 28
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Introduction to Routing and Harness Design in NX CAD - Tutorial - PROLIM Webinar

**Channel:** [PROLIM Global Corporation](https://www.youtube.com/watch?v=2yVEHcIrWkA)
**Duration:** 16m 24s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 28 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> confirm and then you can see your listed listed listed port along with its assigned terminal now if i hop back over to m

confirm and then you can see your listed listed listed port along with its assigned terminal now if i hop back over to my top level you'll notice you'll notice you'll notice my port isn't actually showing in my top level assembly level assembly level assembly this is because i need to create a reference set that includes that port in it it it so i'm just going to go over to my reference sets and create a new one set it so it includes everything in the environment close that i come back and do a replace reference set my new reference that is there along with the assigned port and terminal now

_Signals: howto:5_

### Tip 2 — confidence 0.43

> generates the spline path as i select each successive port and just as easy as that i have my main run for my path if i 

generates the spline path as i select each successive port and just as easy as that i have my main run for my path if i wanted to create branches off of this i could very easily go in and do create linear path create linear path create linear path select the point along my main run and select the port that i wanted to go through now what if i wanted to create some control points to use to create paths later later later let's go ahead and use subdivide segment to create those control points i can specify this one at about i want to have this at forty percent arc length i don't have another one

_Signals: howto:11_

### Tip 3 — confidence 0.41

> up here at twenty percent now i want to create some heel paths and think of heel pass as just a same thing as a linear a

up here at twenty percent now i want to create some heel paths and think of heel pass as just a same thing as a linear as a linear path except i can set this as a spline and i have a few different parameters that i can use to control the pathing of the spline or the linear path depending on whether or not you have it set to generate via lines or splines go ahead and select my ports and i'm going to be using going to be using going to be using an extension of one and one for all of these paths and you can watch as i very easily i very easily i very easily just select the ports specify my

_Signals: howto:6_

### Tip 4 — confidence 0.5

> start importing our netlist information and this is all the connection and component information used for routing starti

start importing our netlist information and this is all the connection and component information used for routing starting with my electrical component navigator i'm going to be pulling in the all the 2d information and specifying what 3d components specifying what 3d components specifying what 3d components represent those 2d connectors adapters and other devices used in this routing so to pull this information in i just need to verify my import format is correct correct correct and i can simply come in and import this cmp file cmp file cmp file it pulls in all the information about the

_Signals: camOps:5_

### Tip 5 — confidence 0.41

> this instance i'm going to go ahead and just open up my harness in a new window new window new window and then select cr

this instance i'm going to go ahead and just open up my harness in a new window new window new window and then select create form board drawing drawing drawing i can then specify my sheet size which i'll leave a z and it gives me this 3d representation of my form board of my form board of my form board and along with a few options to control how it's displayed how it's displayed how it's displayed at the top it gives me the option to choose the main run it can be specified via the longest via the longest via the longest thickest or user specified run so by longest i'll use the longest run in

_Signals: camOps:1 · howto:3_

### Tip 6 — confidence 0.41

> just automatically route them you can watch as it routes the cable and another thing that goes along with the design cha

just automatically route them you can watch as it routes the cable and another thing that goes along with the design change process the design change process the design change process is that if say you make one of these cables and you cables and you cables and you don't like how it automatically routed the path the path the path for instance for this black cable here if i wanted to modify this cable i can very easily go into the cable it'll generate a new point along this curve curve curve and i can modify the position of that point in space point in space point in space to modify how the

_Signals: howto:6_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-2yVEHcIrWkA-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/2yVEHcIrWkA.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].