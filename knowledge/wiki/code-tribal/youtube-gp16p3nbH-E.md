---
title: "The Making of the Gingerbread House | Multiaxis Smoothing"
domain: cam
source: youtube
videoId: gp16p3nbH-E
url: https://www.youtube.com/watch?v=gp16p3nbH-E
channel: "Mastercam"
duration_s: 314
tribal_entries: 7
chunks_scanned: 10
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# The Making of the Gingerbread House | Multiaxis Smoothing

**Channel:** [Mastercam](https://www.youtube.com/watch?v=gp16p3nbH-E)
**Duration:** 5m 14s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 10 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.53

> foreign foreign [Music] [Music] [Music] the goal of this gingerbread house project was to really show off what Mastercam

foreign foreign [Music] [Music] [Music] the goal of this gingerbread house project was to really show off what Mastercam and hermley can do when paired together on a really complicated part so in this case what we're trying to do is really try to optimize every tool path so that we get the best surface finish out of every single tool path the snow that goes around the bottom of the house was the challenge because this was a very organic surface but it was also a mesh so being a mesh is composed of a lot of triangles that have normals that face all over the place and when you run a tool path

_Signals: toolpath:3 · camOps:1_

### Tip 2 — confidence 0.43

> normal to those faces the tool axis control Jitters a lot because each triangle has its own orientation so if we zoomed 

normal to those faces the tool axis control Jitters a lot because each triangle has its own orientation so if we zoomed in and took a look at this the bottom of this mesh you can see what I'm talking about if I turn on the mesh facet edges each of these triangles has its own orientation its own orientation its own orientation and this tool path is using this orientation of these triangles to decide the orientation of the tool so if we snap to this view we can kind of talk about one feature in Mastercam that is really new and really really powerful powerful powerful so we started with this

_Signals: toolpath:1 · camOps:1_

### Tip 3 — confidence 0.49

> morph tool path basically right out of the box just created a morph between two curves and we analyze the tool path you 

morph tool path basically right out of the box just created a morph between two curves and we analyze the tool path you can see the tools angle remains pretty consistent the problem with this is when we posted out this code we can see the number of reversals the b-axis and the C axis have here so 1800 reversals the B 651 reversals of the C so the reversal is something we really want to try to back away from Mastercam has this cool new utility called smoothing under tool axis control control control so when we turn on the smoothing button that actually opens up a drop down we've done videos on

_Signals: toolpath:2 · camOps:1 · howto:1_

### Tip 4 — confidence 0.4

> smoothing before and shown how powerful it really is when it comes to eliminating reversals and smoothing tool access co

smoothing before and shown how powerful it really is when it comes to eliminating reversals and smoothing tool access control but we've never really gone into the specifics of what's happening on this page what we're looking at here is the default value of smoothing when you turn on the smoothing checkbox and for the most part what we've done is just turn on smoothing and Let It Go Let It Go Let It Go so when we do this you can see first of all we go from 1800 b-axis reversals to 54.

_Signals: camOps:2 · safety:1_

### Tip 5 — confidence 0.4

> and then again we cut the c-axis down by about 20 percent so percent so percent so the problem with this is if you zoom 

and then again we cut the c-axis down by about 20 percent so percent so percent so the problem with this is if you zoom in you can see this code doesn't look very uniform it has been smoothed but what's happening is there is a global smoothing factor in play here so when this says Global what it's doing is it's taking the entire tool path into account when it tries to smooth all the motion so looking at this on analyze if you mainly focus on the Z Direction here it's pretty constant pretty constant pretty constant it does have a little bit of a Jitter to it if these blue lines showed us the

_Signals: toolpath:1_

### Tip 6 — confidence 0.4

> we cut this down to five so this really is basically the same algorithm just kind of turned down a little bit compared t

we cut this down to five so this really is basically the same algorithm just kind of turned down a little bit compared to our first tool path here and you can see the reversals have increased and it does seem to be seem to be seem to be a little bit smoother when it comes to the variations from past to pass you do see there's some what appear to be step over variations this is not a step over variation it's a tool tilt orientation variation variation variation so Global Smoothing in this case is taking into account the tilt on the top of this part as it works its way down and this is kind of

_Signals: toolpath:1_

### Tip 7 — confidence 0.46

> throwing things off as we get down towards the bottom of the part part part we also have the ability to smooth a specifi

throwing things off as we get down towards the bottom of the part part part we also have the ability to smooth a specific axis specific axis specific axis so when we open tool axis smoothing we can say smooth the rotary axis around Z so basically we're targeting our c-axis to smooth a little bit and I'm telling it basically don't even try to smooth anything on the Tilt axis and just give us 10 degrees either way on the rotary and again I turn down the strength a bit and in this case you can see the reversals do jump up a bit they're still really reduced from the beginning tool path but in

_Signals: toolpath:1 · camOps:1 · params:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-gp16p3nbH-E-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/gp16p3nbH-E.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].