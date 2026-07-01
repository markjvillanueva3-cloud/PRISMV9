---
title: "Getting Started with SOLIDWORKS CAM - Part 1"
domain: cam
source: youtube
videoId: 2-SvDm4eZpc
url: https://www.youtube.com/watch?v=2-SvDm4eZpc
channel: "TriMech Group"
duration_s: 369
tribal_entries: 4
chunks_scanned: 11
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Getting Started with SOLIDWORKS CAM - Part 1

**Channel:** [TriMech Group](https://www.youtube.com/watch?v=2-SvDm4eZpc)
**Duration:** 6m 9s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 11 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.4

> Speaker 1: Hi and welcome my name's Tom and today we'll be looking at how to get started with SOLIDWORKS CAM

Speaker 1: Hi and welcome my name's Tom and today we'll be looking at how to get started with SOLIDWORKS CAM. SOLIDWORKS CAM is kept directly with inside SOLIDWORKS and you can see we have an added tree and toolbar to help us do CAM upon our CAD models. For the toolbar you can see, we have buttons from left to right, and the workflow is very much working from left to right from definement machine to post-processing at the bottom in the tree we have what's called the CAM feature tree. This is where SOLIDWORKS CAM will recognize features from your model at an apply a tool path to them.

_Signals: toolpath:1_

### Tip 2 — confidence 0.42

> We have the operations tree to see what those operations would be

We have the operations tree to see what those operations would be. And finally, we have a tool tree as well. Is this for any tools that we are using to machine the parts. So let us get started. The first place we want to go is a SOLIDWORKS CAM toolbar and hit define machine, defined machine and let's just pick the kinematics of our machine. The tools used and the post processor to get the code from the tool paths we added in SOLIDWORKS CAM. So you can see to start off with I've picked mill metric. If the units inside SOLIDWORKS where inch, this would turn to Imperial.

_Signals: camOps:2 · howto:1_

### Tip 3 — confidence 0.53

> And if I want to get something, that's not an end mill, like a drill, for instance, I can pick drill and I can go and gr

And if I want to get something, that's not an end mill, like a drill, for instance, I can pick drill and I can go and grab whatever drill I wish in this case, I might get a 10 mm drill because I have one of those and you can see, this is really quick and easy to start building up a tool library. We can also go and get other variations, such as ball, nose, and hognose ball nose mills. We'll go and hop as we can describe a ball on the bottom. And I might want to get, let's say a six mill ball nose, and a hog nose, a similar, but not quite the same.

_Signals: camOps:6 · params:1_

### Tip 4 — confidence 0.4

> If we had one, we could go and pick one of the vertexs of the parts, bounding box or as we want it to be on the stock ve

If we had one, we could go and pick one of the vertexs of the parts, bounding box or as we want it to be on the stock vertex and you can see it's defaulted to the top center. Now, any of these white dots we could pick and it will move coordinate system or your G54 to that position. But for now, the center is exactly where I want it, So by pressing tick on that and goes and captures that information for us straight away, from there you can go and get stock manager. The stock manager is really powerful.

_Signals: gcode:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-2-SvDm4eZpc-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/2-SvDm4eZpc.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].