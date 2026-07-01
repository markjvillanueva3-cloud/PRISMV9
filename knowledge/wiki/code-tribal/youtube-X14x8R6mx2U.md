---
title: "CNC LATHE PROGRAMMING LESSON 7- HOW TO USE CONSTANT SURFACE SPEED"
domain: lathe
source: youtube
videoId: X14x8R6mx2U
url: https://www.youtube.com/watch?v=X14x8R6mx2U
channel: "Tom Stikkelman"
duration_s: 445
tribal_entries: 6
chunks_scanned: 10
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# CNC LATHE PROGRAMMING LESSON 7- HOW TO USE CONSTANT SURFACE SPEED

**Channel:** [Tom Stikkelman](https://www.youtube.com/watch?v=X14x8R6mx2U)
**Duration:** 7m 25s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 10 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.43

> and welcome back to part seven of CNC late programming in this lesson I'd like to talk about the constant server speed t

and welcome back to part seven of CNC late programming in this lesson I'd like to talk about the constant server speed that's used on the CNC lathe I'm going to introduce three new g-codes the g96 which sets The Cutting speed the g97 which sets RPM and G50 which limits the RPM that your CNC will turn all right then we'll talk about the benefits of using using constant service speed and I'll show you a couple of formulas to calculate RPM and service speed per minute all right so let's take a look at an example of a part that has many different diameters and how the RPM changes to maintain

_Signals: camOps:1 · gcode:1_

### Tip 2 — confidence 0.41

> constant service speed all right so for this part the tool manufacturer has recommended that we use 600 surface feet per

constant service speed all right so for this part the tool manufacturer has recommended that we use 600 surface feet per minute now as you can see we have several different diameters restarting at with/ in and it climbs up to 1 in inch and A2 2 in and 2 and 1/2 in and we're actually starting with a 3in diameter stock so at each diameter you can see maintaining a 600 service feet per minute or constant service speed we would start out with an RPM of RPM of RPM of 4584 RPM at half inch then it climbs up to an inch diameter and at that point we we are at we are at we are at 2292 RPM then it

_Signals: params:2_

### Tip 3 — confidence 0.45

> slows down again as we climb up to inch and a half and we are at at at 1528 RPM and then at 2 in we are at 1146 and at 2

slows down again as we climb up to inch and a half and we are at at at 1528 RPM and then at 2 in we are at 1146 and at 2 and 1/2 in we are at 9116 RPM so you can see it would be hard to determine just an RPM that would work for all of these diameters and expect good tool life and good service finish now instead of doing that just tell your machine to maintain a 600 service speed and the Machine will automatically adjust for all these diameters so let's talk a little bit more about why to use constant service constant service constant service speed all right so the benefits of constant service

_Signals: camOps:1 · params:2 · howto:1_

### Tip 4 — confidence 0.46

> speed would be that it simplifies the programming now you don't have to determine what RPM to program because you just s

speed would be that it simplifies the programming now you don't have to determine what RPM to program because you just set the constant service speed and the Machine will automatically adjust the RPM depending on the diameter it's cutting so it also produces a consistent service finish because the feed rate and the constant service speed work hand inand to produce a constant surface finish all right then it also optimizes the tool life because the RPM is not too fast or too slow which would in turn increase to life and then lastly it optimizes the machine time because the cutting conditions

_Signals: camOps:3 · howto:2_

### Tip 5 — confidence 0.54

> will always be set properly and that translate to minimal Machining time all right so let's take a look at a program and

will always be set properly and that translate to minimal Machining time all right so let's take a look at a program and see where we put all these codes all right so here we're looking at the program of the Finish pass of the part we looked at earlier and let's talk a little bit about the format here so we have made a tool change right here picking up tool picking up tool picking up tool 101 and then the first thing you want to do is turn on spinel with a constant RPM using the g97 command so when you turn on the spinel at s1500 no matter what diameter the tool is at it will always spin at

_Signals: camOps:3 · safety:2 · howto:2_

### Tip 6 — confidence 0.54

> 1500 RPM then you wrap it into position getting ready to do your finish pass and at that point the first thing you want 

1500 RPM then you wrap it into position getting ready to do your finish pass and at that point the first thing you want to do is set the G50 which is limiting the RPM now that's going to depend on the size of the part now a part this size you probably don't want to spend faster than 3,000 RPM but some of the smaller parts that you will be running you could max out at 5 or 6,000 RPM or whatever your lath will allow all right so then after you limit the RPM you set your constant service speed using the g96 command with the recommended service feat that the tool is rated for all right so that is

_Signals: camOps:1 · params:3 · gcode:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-X14x8R6mx2U-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/X14x8R6mx2U.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].