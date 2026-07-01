---
title: "Make complex CAD easy with these FeatureScripts - 3D design for 3D printing"
domain: cad
source: youtube
videoId: LGDxDDAv2sI
url: https://www.youtube.com/watch?v=LGDxDDAv2sI
channel: "Teaching Tech"
duration_s: 895
tribal_entries: 7
chunks_scanned: 28
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Make complex CAD easy with these FeatureScripts - 3D design for 3D printing

**Channel:** [Teaching Tech](https://www.youtube.com/watch?v=LGDxDDAv2sI)
**Duration:** 14m 55s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 28 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.41

> getting good at CAD is often about learning all of the tools and features available from your chosen package but what if

getting good at CAD is often about learning all of the tools and features available from your chosen package but what if there was a way to come up with custom tools to accomplish great things with little effort today I share with you the most powerful free feature Scripts [Music] [Music] this video is part of a series on learning 3D design for 3D printing using a free onshape account the rest of the playlist is linked Below in the video description and this is my best attempt at growing a mustache for movember thank you to those who have donated so far and if you've got a few dollars spare

_Signals: camOps:2_

### Tip 2 — confidence 0.4

> then select them clicking through until we get confirmation that they're added to our toolbar if a feature script needs 

then select them clicking through until we get confirmation that they're added to our toolbar if a feature script needs updating it'll have this blue symbol on the edge of the icon from here we can simply right click and go to update and then confirm that in the new dialogue box soon after you'll get confirmation at the Top If we want to share a feature script with others we can again right click and then go to open link document and this web address at the top is what we can share with them so they can install the feature script too if we want to delete a feature script we right click and

_Signals: howto:5_

### Tip 3 — confidence 0.41

> GitHub repo once we run the feature script we select the face to thread we can select the type we want enter other param

GitHub repo once we run the feature script we select the face to thread we can select the type we want enter other parameters such as the pitch number of starts and whether we want thread the hallway or to limit it to a number of turns or distance and when we're done we click the tick and we have our fully formed thread labeled in the feature list and present in 3D this works for internal or external threads and I've had a lot of success 3 printing these threads after adjustments were made for 3ad printing such as making the internal BS a little bit wider another feature script I've been

_Signals: camOps:1 · howto:3_

### Tip 4 — confidence 0.46

> using for a long time is spur gear by nil cook this one is driven by the vertex in a sketch so once we select that point

using for a long time is spur gear by nil cook this one is driven by the vertex in a sketch so once we select that point the spur gear will be created there we have a lot of different options generally more than you'll need to make simple gears but some that you might recognize are clicking to make them helical that's when the mhing teeth are angled which can reduce noise you can have a double helix like we used to see with old reppr 3 printer extruders and you can also turn on and specify a center B with optional keyway one tip I'd have here is to create a sketch that not only has the

_Signals: toolpath:1 · camOps:1 · howto:3_

### Tip 5 — confidence 0.41

> this part we can see Bridges have been added to the lower surface essentially allowing it to print in midair bit by bit 

this part we can see Bridges have been added to the lower surface essentially allowing it to print in midair bit by bit rather than doing it manually here's a feature script called Bridge counter Ball by imman smidgin we model the rest of the object as normal start the feature script and select the faces we want to modify because select matching faces is ticked it's automatically found the other three on this model and while I really need to do is enter my layer height or stick with the default of 0.2 mm this case will now print without support using a oneclick feature script still relevant

_Signals: params:1 · howto:3_

### Tip 6 — confidence 0.4

> set the KN value to two and as you can see the speed up the top are twice as big as the ones down the bottom and that's 

set the KN value to two and as you can see the speed up the top are twice as big as the ones down the bottom and that's based on our seed surface that we set on top so I'm going to come back to the attractor input delete the top surface and select all of the tangent edges around the perimeter I'm going to set my near size to 2 and now we can see that the SPH is in the middle of full size but they fade down as they get closer to any of those edges here's an alternate version using depth which means the Spheres will sink into the surface the closer they get to that attractor Edge this is a

_Signals: howto:5_

### Tip 7 — confidence 0.45

> called the puzzle andat by a month smidgin it can turn any solid you have in on shape into a puzzle all you need is that

called the puzzle andat by a month smidgin it can turn any solid you have in on shape into a puzzle all you need is that solid and then a mate connector with the blue axis facing the way you want to cut the puzzle pieces we click our part to slice expand the advanced options and then select our mate connector instantly whatever our object is is turned into a puzzle with the amount of slices we've input if you're 3D printing and you need all of them to fit together you can change the curf value and this will put a little bit of space in between if you want to change the pattern of the puzzle

_Signals: camOps:2 · howto:4_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-LGDxDDAv2sI-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/LGDxDDAv2sI.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].