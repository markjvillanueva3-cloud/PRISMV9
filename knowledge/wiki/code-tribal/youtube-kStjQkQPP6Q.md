---
title: "CNC LATHE PROGRAMMING LESSON 6 - TOOL NOSE RADIUS COMPENSATION"
domain: lathe
source: youtube
videoId: kStjQkQPP6Q
url: https://www.youtube.com/watch?v=kStjQkQPP6Q
channel: "Tom Stikkelman"
duration_s: 419
tribal_entries: 6
chunks_scanned: 10
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# CNC LATHE PROGRAMMING LESSON 6 - TOOL NOSE RADIUS COMPENSATION

**Channel:** [Tom Stikkelman](https://www.youtube.com/watch?v=kStjQkQPP6Q)
**Duration:** 6m 59s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 10 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.4

> differences all right so here we're looking at a side by side comparison of the OD finishing tool path on the left side 

differences all right so here we're looking at a side by side comparison of the OD finishing tool path on the left side we're using the sharp corner tool and on the right side the6 stol most radius now take a look at the x and z values on the left and the right and how they are different and also the radius value on the left you'll see the actual radius that is being machined versus on the right it compensates for the tool nose radius on the tool so you can see that the numbers on the right would be a lot more complex to calculate all right so let's take a quick look at the code side by side

_Signals: toolpath:1_

### Tip 2 — confidence 0.4

> for the ID work and here again on the left side we're using the sharp corner tool and on the right side we're using a 30

for the ID work and here again on the left side we're using the sharp corner tool and on the right side we're using a 30second tool no radius if you look at the geometry portion you can see the Z and X values are different at each stopping point and also again the radius value is different because of the tool no radius that needs to be calculated all right so we have determined that we're going to use the program using the sharp corner tool because that stops at the exact tangency points and intersections now let me show you where to put the g41 and the G4 to in code to make the program work

_Signals: gcode:1_

### Tip 3 — confidence 0.46

> with any tool no radius on the machine all right so before we look at the code let's go over three g-codes the g42 is go

with any tool no radius on the machine all right so before we look at the code let's go over three g-codes the g42 is going to be used for the OD tool no radius compensation the g41 for ID tool NOS radius compensation and of course the G40 cancels the g41 and g42 all right so let's take a look and see where we put these codes in the Pro prog all right so this is the code for the Finish pass on the OD and as you can see the g42 right here is on the very first line as we wrap it into position to start our finish pass so the g42 engages the tool noose radius compensation and then on the very

_Signals: camOps:2 · gcode:1_

### Tip 4 — confidence 0.4

> last move where we retract away from the tool path is where we cancel the tool no radius compensation radius compensatio

last move where we retract away from the tool path is where we cancel the tool no radius compensation radius compensation radius compensation so what exactly happens when we call a g42 let's take a look at the tool page on the machine and see where it gets this information and what values we need to enter to make it all work all right so here we're looking at a tool data page on a moriki lath and if you look here the two columns on the right one that has the r obviously is for the tool noose radius value that's where we're going to enter the size of the tool nose radius and then C is the

_Signals: toolpath:1_

### Tip 5 — confidence 0.41

> the tool so three is the number that we put in column C now for the ID boring if you look at the upper leftand corner yo

the tool so three is the number that we put in column C now for the ID boring if you look at the upper leftand corner you can see that's the orientation of our boring bar so to apply the g41 to no radius compensation use the two in col column C so use this illustration as a reference to determine what number needs to go into the C column all right so let's take a quick look at the code for the ID finish pass and where to put the g41 in the code all right so here we're looking at the code that is used to finish the ID now again on the approach we have the g41 on the line where we wrap it into

_Signals: camOps:2_

### Tip 6 — confidence 0.45

> position right before a makes the finished tool path so the g41 is called at the beginning and then when you retract the

position right before a makes the finished tool path so the g41 is called at the beginning and then when you retract the tool at the end of the tool path you put a G40 to cancel tool noose radius compensation all right so that covers g41 and g42 tool no radius compensation if you have any questions please leave me a comment I thank you for watching and we'll see you in the next one

_Signals: toolpath:2 · gcode:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-kStjQkQPP6Q-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/kStjQkQPP6Q.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].