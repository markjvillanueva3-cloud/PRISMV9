---
title: "SOLIDWORKS SHEET METAL - What is K-FACTOR?"
domain: cad
source: youtube
videoId: -4uN9eRihQQ
url: https://www.youtube.com/watch?v=-4uN9eRihQQ
channel: "Too Tall Toby"
duration_s: 760
tribal_entries: 8
chunks_scanned: 20
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SOLIDWORKS SHEET METAL - What is K-FACTOR?

**Channel:** [Too Tall Toby](https://www.youtube.com/watch?v=-4uN9eRihQQ)
**Duration:** 12m 40s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 8 of 20 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.45

> chart like this hanging up in the shop where I worked and what you would do is you would use a formula like the formula 

chart like this hanging up in the shop where I worked and what you would do is you would use a formula like the formula here in the upper right says L1 plus L2 plus L3 minus Q minus Q gives us the flat length that we could cut the material to so in the case of this model L1 L2 and L3 are 40 60 and 20 now Q is determined by looking at the chart first we look at our default material wall thickness 2 mm then we look at our default Bend radius 6 mm and that gives us a q value of 5.5 and so what we do is we take 40 + 60 + 20 - 5.5 - 5.5 and that gives us our flat length 109 mm that's what we're

_Signals: params:3 · howto:1_

### Tip 2 — confidence 0.42

> to spend two days learning all kinds of time-saving tips and tricks and solid works and we're just about done with our s

to spend two days learning all kinds of time-saving tips and tricks and solid works and we're just about done with our sheet metal training class we're going to be releasing that soon so keep checking out the website if you're interested in taking some sheet metal training all right let's get into it here in solid works here we can see that model we were looking at a moment ago it's got a wall thickness of 2 mm it's got an inside Bend radius of 6 mm and when we Define sheet metal there's a feature over here in the tree called sheet metal this is the overall folder and then there's a second

_Signals: params:2 · howto:1_

### Tip 3 — confidence 0.45

> the bend begins uh with Bend deduction you measure to the virtual sharp that's what we're going to be using here so we'r

the bend begins uh with Bend deduction you measure to the virtual sharp that's what we're going to be using here so we're going to say that we're going to use Bend deduction and from that chart we learned that our Bend deduction value is 5.5 mm and so we hit the green check mark and now let's turn this thing into a flat so we're going to go here to our sheet metal flat pattern and then if we click on this edge here this line of the flat pattern we can look down in our status bar and we can see that that line yields a length of 109 mm awesome so we're measuring to the virtual sharp and then

_Signals: camOps:1 · params:2 · howto:1_

### Tip 4 — confidence 0.49

> whenever we go to a flat pattern this region here will always calculate at a length of 10

whenever we go to a flat pattern this region here will always calculate at a length of 10.5 mm if we determine that's maybe a little too long or a little too short we could edit the sheet metal feature here we could say actually we want that to be 10.6 mm 10.6 millim it should be a little bit longer in that flat section and so now when we go into the flat pattern we click on that edge we look down here in the status bar 10.6 mm so that's bend allowance verse Bend deduction two different ways of calculating the flat pattern these were the only tools we had for a long time and when we use

_Signals: params:3 · safety:1 · howto:1_

### Tip 5 — confidence 0.45

> something like bend allowance we're saying that region is always going to be 10

something like bend allowance we're saying that region is always going to be 10.6 mm long now that can be a problem if we click on this edge here and we jump into the edge flange command and we choose to create an edge flange and maybe change the radius of that edge flange so we're not going to use the default radius we're going to make this radius 15 a much larger radius there in that corner and so now the result of this thing is going to be that you know the length of that Arc you'd expect the length of that Arc would be a lot longer however when we go back into the flat pattern hm this

_Signals: params:1 · safety:1 · howto:3_

### Tip 6 — confidence 0.42

> looks the same as this and this and that's because we're using bend allowance we're saying that the length of our bends 

looks the same as this and this and that's because we're using bend allowance we're saying that the length of our bends is always going to be 10.6 m millim and this is where we run into some problems that can be resolved with K Factor so what is K Factor K factor is a way of calculating the flat pattern length based on an offset distance from the original Arc so here's what I mean if I go to the front plane and I begin a sketch this line here is going to be the same on the inside and the outside so I could just do a convert entities whatever the length of that line is you know 32 mm is the

_Signals: params:1 · safety:1_

### Tip 7 — confidence 0.5

> the length of that Arc is 10

the length of that Arc is 10.52 mm so our K factors 0.35 actually got us prettyy close to what our uh Bend deduction and bend allowance calculations came up with so now for this segment here I'm just going to do a convert entities that length is not going to change it's going to be uh let's see here 44 mm then for this Arc here I'm going to do another offset offset entities you know 2 * 0.35 the K Factor then this leg here is going to be 12 mm it's not going to change so I'll just do a convert entities and then for this Arc we're always is going to offset from the inside of that Arc so this

_Signals: params:3 · safety:1 · howto:2_

### Tip 8 — confidence 0.41

> that length should be so if all your bends are always 90° you're probably better off using bend allowance or bend deduct

that length should be so if all your bends are always 90° you're probably better off using bend allowance or bend deduction but if you you work with a lot of variety a lot of variety of angles a lot of variety of radi then you might be better off trying to dial in a good K Factor ratio so now if we exit this sketch and then we go over here to our sheet metal feature we right Mouse button we say edit feature we're going to change this to use K Factor as our bend allowance we're going to set the K Factor value to Factor value to Factor value to 0.35 and now let's take a look at this thing in

_Signals: safety:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath--4uN9eRihQQ-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/-4uN9eRihQQ.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].