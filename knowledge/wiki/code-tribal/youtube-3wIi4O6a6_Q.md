---
title: "How to find the moment of inertia for composite shapes"
domain: general
source: youtube
videoId: 3wIi4O6a6_Q
url: https://www.youtube.com/watch?v=3wIi4O6a6_Q
channel: "Engineer4Free"
duration_s: 626
tribal_entries: 9
chunks_scanned: 15
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# How to find the moment of inertia for composite shapes

**Channel:** [Engineer4Free](https://www.youtube.com/watch?v=3wIi4O6a6_Q)
**Duration:** 10m 26s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 9 of 15 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.4

> all right guys welcome back in this video we are finding the moment of inertia for composite shapes so in order to do th

all right guys welcome back in this video we are finding the moment of inertia for composite shapes so in order to do that we need to find the centroid of the composite shape and then we can proceed from there um using the parallel axis theorem so the first thing that we need to do is we need to recognize that this T this is the cross-section of you know a t-shaped prismatic member and we know that the top rectangle is going to have a centroid right in the middle and the bottom rectangle here is going to have its own little centroid there and what we want to do is we want to find the the

_Signals: toolpath:1_

### Tip 2 — confidence 0.41

> overall centroid of the composite shape and it's going to be somewhere in between them somewhere about like that all rig

overall centroid of the composite shape and it's going to be somewhere in between them somewhere about like that all right so the way that we need to do this is uh let's identify where the the centroids are for each of the composite shapes let's take a let's take our measurement off of the bottom here so we have a measurement like that and we also have a measurement like that um so obviously this Cent is going to be half of the height so that's uh 30 mm and then uh this centroid is half of this height that's 10 mm plus 60 so we're going to be up 70 uh mm up to this Cent right here all right

_Signals: params:2_

### Tip 3 — confidence 0.5

> the equation right here and this is from the Statics videos if you watched those about finding the centroids of composit

the equation right here and this is from the Statics videos if you watched those about finding the centroids of composite shapes so again the first thing that we need to do is we need to uh find our areas for each of these the area of section A is 80 mm * 20 mm that's going to give us6 100 mm squ and the area of section B here is 20 mm * 60 mm that gives us a 1200 millim squared and we are going to have to take the sum of the areas here so if we just sum those up right now we're going to get 1600 + 1200 that is 2800 mm squar we're going to be plugging that into our equation at the bottom here

_Signals: params:6_

### Tip 4 — confidence 0.44

> all right so the next column that we're going to need in order to figure out what this equation is is we're going to hav

all right so the next column that we're going to need in order to figure out what this equation is is we're going to have to have the Y Bar of each of the comp each of the parts so we'll throw that in we have y bar so the Y Bar for a well we already figured that out it's from the bottom it's 70 mm all right the Y Bar for Section B we already figured that out is 30 mm okay and uh the last thing that we're going to need in order to uh do this equation here the easiest way to do it is to put a whole row in our table or sorry a whole column in our table here for Y Bar * a so we just get 70 mm *

_Signals: params:3_

### Tip 5 — confidence 0.44

> 1600 1600 1600 mm that gives us mm that gives us mm that gives us 112,000 mm cubed and if we do the same thing 30 * 100 

1600 1600 1600 mm that gives us mm that gives us mm that gives us 112,000 mm cubed and if we do the same thing 30 * 100 30 * 1200 we get uh that is 36,000 millime cubed and if we take the sum of those guys the sum of Y Bar * a uh we see that this is just 148,000 mm cubed all right so we actually have we can fill out this equation now we have the sum of all of the parts of the product of here of Y Bar * a that's 148,000 millimet cubed and uh the sum of all the areas here we also have that that's a 2,800 millimet squared so if we just divide those divide those divide those we're going to find

_Signals: params:3_

### Tip 6 — confidence 0.43

> mechanics of material mechanics of material mechanics of material textbook um but the shape that we're looking at here i

mechanics of material mechanics of material mechanics of material textbook um but the shape that we're looking at here is a composite shape and the centroids of the the individual Parts don't line up with the centroidal axis here of the centroid of the of the whole thing and you know what we should also just draw on our measurement here now that we know now that we know now that we know it um we'll say that this is what was it 53 mm millimeters all right you know what let's write it like this cool um so what we need to do is we need to account for their offset using the parallel axis theorem

_Signals: toolpath:1 · params:1_

### Tip 7 — confidence 0.4

> and uh all the parallel axis theorem really does is it just uh for the if we basically label this line here the cidal ax

and uh all the parallel axis theorem really does is it just uh for the if we basically label this line here the cidal axis as our xaxis um then we'll call our Our Moment our our centroidal moment of inertia really for the whole thing is just going to be equal to the sum of all the parts where we have each one's we have each one's we have each one's individual moment of inertia so that would be like this 112th base height if we're dealing with we're dealing with we're dealing with rectangles uh and then we add in plus a d^ d^ d^ 2 and D is just the distance from the crosssections centroid to

_Signals: toolpath:1_

### Tip 8 — confidence 0.5

> there so we can write this out so for section A first of all we have 112th time the base times the height so we have tim

there so we can write this out so for section A first of all we have 112th time the base times the height so we have times 80 mm * 20 80 mm * 20 80 mm * 20 [Music] [Music] [Music] mm uh mm uh mm uh cubed cubed cubed right that's height cubed plus a so the area is 80 * area is 80 * area is 80 * 20 so+ 80 mm * 20 mm * d^ 2 and da well we have the height up here is 70 mm so this is equal to 70 minus this height 53 right that just gives us the difference here and that's going to be equal to 17 mm equal to 17 mm equal to 17 mm all right so we have time 17 mm squar all right so then we'll uh so

_Signals: params:10_

### Tip 9 — confidence 0.5

> that is we have the first area done so we'll do the second area now so we have + have + have + 12th uh this one's width 

that is we have the first area done so we'll do the second area now so we have + have + have + 12th uh this one's width is 20 mm its height is 60 mm and that guy is cubed plus the area of this section which is which is which is 20 mm * 60 20 mm * 60 20 mm * 60 mm time d^ 2 and D in this case is going to be equal to be equal to be equal to uh we have 53 minus 30 that's the difference we need right if this is 30 if this is 53 and this is 30 the difference there is going to be 23 mm all right so we have times 23 23 23 millimet to the power of three sorry to the power of the power of the power of

_Signals: params:7_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-3wIi4O6a6_Q-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/3wIi4O6a6_Q.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].