---
title: "Using Onshape's new Routing curve for various 3D curve workflows"
domain: cad
source: youtube
videoId: 8shIxZ4eBXQ
url: https://www.youtube.com/watch?v=8shIxZ4eBXQ
channel: "Greg Brown - Onshape"
duration_s: 1742
tribal_entries: 10
chunks_scanned: 44
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Using Onshape's new Routing curve for various 3D curve workflows

**Channel:** [Greg Brown - Onshape](https://www.youtube.com/watch?v=8shIxZ4eBXQ)
**Duration:** 29m 2s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 10 of 44 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> header tubes um Runner tubes here and in the routing curve is actually a really good way to to do these things so I'm go

header tubes um Runner tubes here and in the routing curve is actually a really good way to to do these things so I'm going to take a step you through the process that I used and but before we do that let's just take a little time to look at one of the other nice things from version 195 uh which is the Cosmetic thread um obviously there's some M10 threaded uh tapped holes here and there's a thread on the on the stud here as well and if I take a a cross-section through it you'll see it behaves nicely um with that as well so um you know shout out to that as a as a huge uh bonus thing for uh for

_Signals: gcode:1_

### Tip 2 — confidence 0.4

> millim off whatt right or it's 234 in the y direction compared to whatt right so obviously we can see it here it's minus

millim off whatt right or it's 234 in the y direction compared to whatt right so obviously we can see it here it's minus 234 down from 234 down from 234 down from this right um so if we want to add another point but not just drag it up U we're done with this sort of add point on aess drag a really important tip I think for everyone at this point is that once you're done with that remember to turn it off because you confuse yourself later when you're trying to move things and it's adding more points and you wonder why is it adding more points it's because you forget and then left that turned

_Signals: camOps:1 · howto:2_

### Tip 3 — confidence 0.4

> close to the previous segment you'll see it goes into error and it tells you that you can't um can't do that so the red 

close to the previous segment you'll see it goes into error and it tells you that you can't um can't do that so the red bit is highlighted the whole curve is highlighted in magenta if we roll over you'll see here it says cannot create Bend at given point it's always a good idea when there's a feature error to use this rollover and the tool tip because we do our very very best to show you exactly what the problem is at that given location all right so now that's not in error anymore and we can um uh we can successfully do that you notice a couple other things in the feature name we actually

_Signals: safety:1 · howto:1_

### Tip 4 — confidence 0.41

> have the length of the curve so 537 mm if you wanted to try and say get this to H 600 um because that's what the Builder

have the length of the curve so 537 mm if you wanted to try and say get this to H 600 um because that's what the Builder wants you to do then you could you know experiment a little bit oops just by moving these vertices around and you can get it pretty close pretty quickly uh well that's pretty close and um I had it closer before and so you know now you've got your 600 mm um runner from here now of course it's going to be a little trickier when you have other ones to fit in and so that's why it's a nice idea to be able to do these things um sort of progressively in interactively I'm trying to

_Signals: params:2_

### Tip 5 — confidence 0.41

> hit 600 mm as the target I know the order from you know down the cylinders and and where they are on this merge collecto

hit 600 mm as the target I know the order from you know down the cylinders and and where they are on this merge collector here and I come up with some you know so some schemes to try and get them all to be the right length with the right sort of Bend radi and um and in within a reasonable packaging uh that we've got so I did the same thing for those six routing curbs and I got it reasonably quickly um it didn't take very long at all and I got them all within you know a few ten of a millimeter of 600 uh millimeters total uh so that's good um if I turn off those parts again uh if I go back to

_Signals: camOps:1 · params:1_

### Tip 6 — confidence 0.41

> go back to go back to here and take off the surfaces you notice I I use can color these curves um so you just click on t

go back to go back to here and take off the surfaces you notice I I use can color these curves um so you just click on the curve right click on it and um say edit appearance and you can set your own colors for these curves uh you might want a different color per cylinder or you might want them all to be blue um whichever you like I I really recommend using some of these capabilities in on shape it makes your life a whole lot easier when you're trying to see you know which bit is which as it goes through in 3D here you know I'm use my trick again uh to go front side top um or maybe I'm using

_Signals: camOps:1 · howto:3_

### Tip 7 — confidence 0.43

> get to the um the interpolated spline for the polyline you can achieve things like you know run parallel run normal um a

get to the um the interpolated spline for the polyline you can achieve things like you know run parallel run normal um all according to the mate connectors are in there obviously the mate connector is an extremely powerful uh instrument on its own um so you can make mate connectors before you create the curves or you can do them on the fly like I was kind of using here here uh it really depends on the situation as to whether you would create them before or we create them kind of Inu or implied during the actual feature that is um most of what you need to know about a polyline except for a

_Signals: toolpath:1 · howto:3_

### Tip 8 — confidence 0.42

> goes underneath into that Servo and then the last Servo goes from the wrist uh to the claws um at the top there so it's 

goes underneath into that Servo and then the last Servo goes from the wrist uh to the claws um at the top there so it's a nice little series of of roots of of wires um that are going to be plugged in they're all around 140 mm long or something like that they they come with the servo the idea with this kit is that you can build everything with just the 3D printed parts and I spent 12 hours printing these um you can just do it with your own printer create these parts and then you buy the servos and they come with a bunch of screws and wires which are the only things you need to put the whole

_Signals: camOps:1 · params:1 · howto:1_

### Tip 9 — confidence 0.41

> so what I did was do a create a series of features where I would create a mate connector on a reference surface like the

so what I did was do a create a series of features where I would create a mate connector on a reference surface like the bottom of this stub of wire and as you can see here there's a mate connector there and then I would create another one uh on some sort of routing along the way maybe it uh you can see here I offset that Surface by 1 mm and I've put a mate connector right there on the edge of it um and so in this method I'm creating a bunch of mate connectors and actually I'll roll back to here you can see those mate connectors all there's one two three mate connectors which constitute the

_Signals: params:1 · howto:3_

### Tip 10 — confidence 0.4

> anything to people I ran through here and I did a couple of spots along the way to make sure that it stayed kind of para

anything to people I ran through here and I did a couple of spots along the way to make sure that it stayed kind of parallel to the floor and that it popped out in the right place and then turned the corner and attached itself to the uh the reference that I wanted to right so that is an Inc context part studio now the red bits here are just sweeps that I made along the path the path the path um you see here that I actually created the the routing curve of those black things and the sweeps are things that I made after the fact now I'm not going to dwell on them for the moment um because

_Signals: toolpath:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-8shIxZ4eBXQ-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/8shIxZ4eBXQ.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].