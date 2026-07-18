---
title: "Onshape Sheet Metal Tutorial – FLARED BRACKET - LIVE!"
domain: cad
source: youtube
videoId: cShoxXtbUbk
url: https://www.youtube.com/watch?v=cShoxXtbUbk
channel: "Too Tall Toby"
duration_s: 987
tribal_entries: 7
chunks_scanned: 29
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Onshape Sheet Metal Tutorial – FLARED BRACKET - LIVE!

**Channel:** [Too Tall Toby](https://www.youtube.com/watch?v=cShoxXtbUbk)
**Duration:** 16m 27s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 29 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.41

> about that uh the spring open leaderboard is open all right let's get into some on shaped 3D modeling some sheet metal h

about that uh the spring open leaderboard is open all right let's get into some on shaped 3D modeling some sheet metal here we go this is Victor K's favorite part 23t 81 flared bracket uh kind of a tricky part here you can see here um that we tried our best in the 2D print to let people know kind of what to expect and how to uh avoid you know avoid running outside of spec probably the biggest part of that is this region right here this Bend region flared wall so having this section here straight and then having this flare out is key if you start flaring out too early you're going to end up too

_Signals: camOps:2_

### Tip 2 — confidence 0.42

> two lines bring that out cut off that flared region and then I'll go back in and add another flange that comes in this w

two lines bring that out cut off that flared region and then I'll go back in and add another flange that comes in this way so that should help me to avoid you know running into a challenge with regards to inadvertently loing off the this little sharp corner here these are just kind of things that you learn over time when you do a lot of 3D CAD you kind of learn how to look at a model whether it's a physical part or whether it's a a 2d print and kind of like unbuild it in your head and imagine what the feature tree is going to look like and then you go through and actually try to create the

_Signals: camOps:2 · howto:1_

### Tip 3 — confidence 0.44

> that fully defined sketch and turn it into a sheet metal model using the extrude option so I'm going to take this geomet

that fully defined sketch and turn it into a sheet metal model using the extrude option so I'm going to take this geometry this geometry here extrude it to a thickness of 4 mm with a radius of 6 mm so 4X 6 and then I'm going to bring this out to 120 over2 that should give me enough room to kind of cut that thing down the last thing I want to look at is the direction of the sheet metal the dimension that I put in here for 65 is from the floor to the peak of the sheet metal or to the the top of that top surface so this needs to go the other direction so whenever you're doing sheet metal you

_Signals: camOps:1 · params:2_

### Tip 4 — confidence 0.42

> the straight segment is supposed to be 20 mm so here on this on this print we can see that it's supposed to be 20 mm the

the straight segment is supposed to be 20 mm so here on this on this print we can see that it's supposed to be 20 mm the length of that kind of straight section to the bend this little straight line here and so the way that I usually do something like this if I can't figure out a good elegant solution to let the software do it for me what I'll usually do is just kind of fire it in there with the default and then click on that edge so I just clicked on this edge here and then I look at some kind of a measure command so in on shape or in solid works or whatever you're using it's 17.33% to this

_Signals: params:2 · howto:1_

### Tip 5 — confidence 0.43

> and drop it so it's nice and centered and we'll give that the designated radius here of 12 mm and then the location of t

and drop it so it's nice and centered and we'll give that the designated radius here of 12 mm and then the location of that is uh 140 over 2 so 70 and uh and then what we can do is we can take that and we can cut extrude it down into the model we could probably even cut extrude it all the way down to this point so we could do extrude here and we're going to remove that down and then we can either type in a distance like 40 mm or we could even go all the way down to that point either way the point is we're not going to go through the whole model and then we're going to create a second cut here

_Signals: params:2 · howto:2_

### Tip 6 — confidence 0.42

> and that would be like your up to surface end condition uh a mirr so yep you can do up surface for sure and then this fi

and that would be like your up to surface end condition uh a mirr so yep you can do up surface for sure and then this final feature here I always manag to uh uh struggle with this feature regardless of what CAD system I'm using creating this final like a tabbed area that's sticking up out of the top here uh just because of partially because of the way it's dimensioned uh but it's supposed to stick up 20 mm total off of uh off of the edge here so we'll take this edge here we'll do a here we'll do a here we'll do a flange uh we're going to reverse the direction of that flange I think it's going

_Signals: params:1 · safety:1_

### Tip 7 — confidence 0.47

> hole that's going to be 9 mm and that is going to be at a distance from the floor here you can see I can pick that cente

hole that's going to be 9 mm and that is going to be at a distance from the floor here you can see I can pick that center point and I can just pick the top plane from the tree and that way I can get that Dimension without having to go and find the top plane that's going to be 77 and then that's going to be uh removed and we'll make that through all and then we can finish up here with a fillet of 7 mm on that top Edge there there we go and now we are ready to take this thing and mirror it so this is going to be mirror we're going to mirror the entire part about this face here and this is going

_Signals: camOps:2 · params:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-cShoxXtbUbk-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/cShoxXtbUbk.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].