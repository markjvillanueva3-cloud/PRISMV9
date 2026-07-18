---
title: "Sheet Metal Beginner Tutorial (Angle Bracket)"
domain: cad
source: youtube
videoId: 4rndxiRc0Xc
url: https://www.youtube.com/watch?v=4rndxiRc0Xc
channel: "Onshape"
duration_s: 724
tribal_entries: 6
chunks_scanned: 20
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Sheet Metal Beginner Tutorial (Angle Bracket)

**Channel:** [Onshape](https://www.youtube.com/watch?v=4rndxiRc0Xc)
**Duration:** 12m 4s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 20 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.42

> hey what's up everybody tutal Toby here and in today's onshape step-by-step tutorial we're going to take a look at a she

hey what's up everybody tutal Toby here and in today's onshape step-by-step tutorial we're going to take a look at a sheet metal challenge so I'm very excited to get into this this challenge comes from the tutall Toby playlist called practice models you can see here that we've got a lot of different practice models to challenge you in the world of 3D CAD but for today we're going to take a look at a sheet metal challenge so let's start the clock here and see how long it takes us to complete this challenge this challenge this challenge now as always what I recommend you do whenever you're

_Signals: camOps:1 · safety:1_

### Tip 2 — confidence 0.4

> taking one of these challenges is just start out by looking at the 2D print and kind of coming up with a game plan I thi

taking one of these challenges is just start out by looking at the 2D print and kind of coming up with a game plan I think in the case of this model I'm going to use the onshape functionality that allows me to sketch two lines in my first sketch and then immediately extrude them as sheet metal with the sheet metal bend features and I only really need to create half of this model because the model has symmetry we can see here we've got center line symmetry so I only need to create half the model so my very first sketch will be these two lines and I'll extrude them out along this direction then

_Signals: camOps:1 · howto:2_

### Tip 3 — confidence 0.44

> I think my second sketch is going to be well really it won't be a sketch it'll just be a feature I'll just pick this sha

I think my second sketch is going to be well really it won't be a sketch it'll just be a feature I'll just pick this sharp edge that I create in the first feature and create a flange sticking out here at 4 in then for my third feature what I'll do is I will cut away this kind of triangular shape and then I'll finish off the model by creating this final flange here this little smaller rectangular flange that's sticking out adding some fillets and then going through and adding the cuts so as always it's a great idea to kind of come up with a game plan before you get started with one of these

_Signals: camOps:1 · safety:1 · howto:2_

### Tip 4 — confidence 0.43

> we're only doing half of the model the next options you're going to see here are going to be your options for the wall t

we're only doing half of the model the next options you're going to see here are going to be your options for the wall thickness and for the bend radius now just generally speaking in sheet metal you never want your wall thickness to be greater than your Bend radius the bend radius should always be greater than the wall thickness and so in the case of our drawing we're being told that the default wall thickness is 0.125 and the default Bend radius is 0.250 the bend radius is larger than the wall thickness and that is a good thing that is what we want in sheet metal finally what we're going to

_Signals: safety:2_

### Tip 5 — confidence 0.41

> select this face begin a sketch I will create a sketch of a circle here and this circle has a diameter of 0

select this face begin a sketch I will create a sketch of a circle here and this circle has a diameter of 0.5 in it's got a distance location from this front edge of the model here at a distance of um 1 in and then it's got a dist across the entire model so I could begin a line command here and pick up on the origin and then I can press the letter Q to turn that line into a construction line and the reason that's valuable is because now I can create a dimension from the center of that hole to the construction line and actually cross over that Center Line and type in the value of 2.5 just so

_Signals: camOps:1 · howto:3_

### Tip 6 — confidence 0.44

> going to go up to face so I'll pick this rear face here and there we go that's looking pretty good let's jump into our f

going to go up to face so I'll pick this rear face here and there we go that's looking pretty good let's jump into our fillet command and our fillet is going to have a radius of 0.25 and that'll be applied on this Edge on this Edge and on this Edge and now we will finish this whole thing off by clicking the mirror command choosing this as our body to mirror choosing this as our mirror plane and then finishing up by making sure that we're choosing to add this material so that we don't end up with two separate sheet metal bodies but instead one single merged sheet metal body so we hit the green

_Signals: camOps:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-4rndxiRc0Xc-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/4rndxiRc0Xc.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].