---
title: "Rough and Finish the Bore ID - Advanced Lathe Tips and Tricks 5/12"
domain: lathe
source: youtube
videoId: ISMre9wiBeQ
url: https://www.youtube.com/watch?v=ISMre9wiBeQ
channel: "MLC CAD Systems"
duration_s: 290
tribal_entries: 6
chunks_scanned: 8
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Rough and Finish the Bore ID - Advanced Lathe Tips and Tricks 5/12

**Channel:** [MLC CAD Systems](https://www.youtube.com/watch?v=ISMre9wiBeQ)
**Duration:** 4m 50s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 8 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.44

> the next thing I want to do is actually move this back out of the way because I have to come down into the part I need t

the next thing I want to do is actually move this back out of the way because I have to come down into the part I need to drill it I'm going to have to bore the ID and I can't have this tail stock in my way so in my way so in my way so we're going to go back to that part handling operation here for tail stock and you'll notice that automatically it's at zero it's at zero it's at zero and it's setting it for 12 inches by default just because it knows what we've done in the previous uh stock setup when we started this part so I'm going to go ahead and green check okay I zoom out you notice that

_Signals: camOps:2 · params:1_

### Tip 2 — confidence 0.44

> it sends it back to the 12 inches here so for now I'm going to go ahead and say top view and fit top view and fit top vi

it sends it back to the 12 inches here so for now I'm going to go ahead and say top view and fit top view and fit top view and fit and bring the part close up on our screen again screen again screen again so the first thing you're going to notice here if I go to my lathe tool manager manager manager I actually have a boring bar and a drill already located here inside of the library so I'm simply going to Green check okay check okay check okay now before we drill the ID I actually want to be able to see the inside of my part not just whenever I'm looking at the wireframe so the very first

_Signals: camOps:2 · params:1_

### Tip 3 — confidence 0.48

> thing I'm going to do is go to my planes and inside of my planes we had this section this section this section view that

thing I'm going to do is go to my planes and inside of my planes we had this section this section this section view that we could look at and you'll notice that when I go ahead and turn the section view on section view on section view on it doesn't split the model what we're going to have to do is go to our view Tab and make sure under the graphic view that that section view is turned on from here from here I'm going to go back to my tool paths and we're going to go to the Turning tab and under the Turning tab I'm going to create a drill operation we have our drill located here and say drill

_Signals: camOps:4 · howto:1_

### Tip 4 — confidence 0.45

> ID for my comment and I'm simply going to go to the parameters for this drill operation I'm going to use the depth optio

ID for my comment and I'm simply going to go to the parameters for this drill operation I'm going to use the depth option select the back of the part I don't know what the angle is of this particular drill out of the library but I do know how much stock I got on the back face which is a hundred thousandths simply going to say I want to pass my drill by 50 000 more than the hundred thousands we had thousands we had thousands we had I can green check okay and you notice that the stock has been removed all the way through let me go ahead and put it in my top view view view fit and let's save our

_Signals: camOps:3 · howto:1_

### Tip 5 — confidence 0.54

> part so next we're going to go ahead and create a quick create a quick create a quick operation for boring the ID I'm go

part so next we're going to go ahead and create a quick create a quick create a quick operation for boring the ID I'm going to use the can Cycles use the can Cycles use the can Cycles and we're going to zoom in on this particular chamfer particular chamfer particular chamfer as well as the ID itself and I know I got a hundred thousands passed and go ahead and select my boring bar let's say rough ID I'm going to go to the canned Cycles I can adjust my depth of cuts I can adjust the exit distance for my R retract retract retract and I'm also going to go into that lead in lead out let's extend

_Signals: camOps:4 · howto:7_

### Tip 6 — confidence 0.49

> so inside of Mastercam so when I go to my canned finish parameters right off the bat I can see the turn OD I can see the

so inside of Mastercam so when I go to my canned finish parameters right off the bat I can see the turn OD I can see the rough ID as well the reason I label these is because it makes it a little bit easier to see which operations which which operations which which operations which now for a finished can cycle there's no geometry I have to select I can simply select my rough ID green check and I have a finished can cycle for this particular ID for this particular ID for this particular ID so this is one of the ways that Mastercam kind of help streamline and then speed things up if you prefer

_Signals: camOps:4 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-ISMre9wiBeQ-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/ISMre9wiBeQ.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].