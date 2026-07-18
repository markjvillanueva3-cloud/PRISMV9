---
title: "Fusion 360 - HWIMT - Part 001 Setup 2 - Op 1 (2D vs. 3D Adaptive Clearing)"
domain: cad
source: youtube
videoId: 62226pmX3i0
url: https://www.youtube.com/watch?v=62226pmX3i0
channel: "Learn It!"
duration_s: 471
tribal_entries: 7
chunks_scanned: 12
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Fusion 360 - HWIMT - Part 001 Setup 2 - Op 1 (2D vs. 3D Adaptive Clearing)

**Channel:** [Learn It!](https://www.youtube.com/watch?v=62226pmX3i0)
**Duration:** 7m 51s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 12 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.42

> [Music] [Music] so welcome back to our next tutorial in which we'll be discussing the next operation now this is pretty 

[Music] [Music] so welcome back to our next tutorial in which we'll be discussing the next operation now this is pretty amazing we're going to go to setup and we are going to right here click a new setup okay so for our stock this is what the option is that comes up from proceeding setup we want the stock to remain the same from our previous setup and to update as it has just been cut and set up one so we're going to continue rest Machining as well post process let's keep our work offset while work offset would be in this instance G55 and again we're not talking about Advanced fixturing and

_Signals: gcode:1 · howto:2_

### Tip 2 — confidence 0.71

> definitely a 3D part I'm going to use a 3D tool path because 3D is better than 2D right I mean it's 2D plus one well ada

definitely a 3D part I'm going to use a 3D tool path because 3D is better than 2D right I mean it's 2D plus one well adaptive clearing is probably what you're going to pick we're going to select our tool half inch End Mill and I'm going to show you that that thinking is not correct all the time if we've got various levels in various steps I'm going to prove to you that adaptive 3D adaptive clearing is not the right option so geometry let's pick our geometry here we're going to actually for geometry we don't even need to pick anything it will do it for us us us our Heights our bottom height we

_Signals: toolpath:4 · camOps:7 · howto:1_

### Tip 3 — confidence 0.49

> here this material is already removed material is already removed material is already removed and our tool wants to cut 

here this material is already removed material is already removed material is already removed and our tool wants to cut that all those all that material away what it the material is not there so it's going to be wasting it and look at what it's doing up at the top here it's a little disastrous it's a little disastrous it's a little disastrous okay there we go look at all that wasted time time time okay anyways this is too much this is too much to bear so let's just go to 3D or this adaptive tool path and see if we can adjust something real quick here um we could reduce air cutting if we want

_Signals: toolpath:2 · camOps:1 · howto:1_

### Tip 4 — confidence 0.51

> want want uh let's see what that looks like all right so it kind of recognizes it but all of this at the top there you k

want want uh let's see what that looks like all right so it kind of recognizes it but all of this at the top there you know it's done a little bit better job but we could do it an even better job there let's go to our tolerance we're going to add a little bit more there optimal load let's just bring it to 0.15 Let's slowly refine our tool path here there we go hey you know what that's actually looking not too too bad but let's pick a better way here I'm going to delete it going to delete it going to delete it and let's put pick our 2D adaptive clearing we're going to go back to our half inch

_Signals: toolpath:2 · camOps:1 · howto:3_

### Tip 5 — confidence 0.53

> End Mill and for our geometry we are going to just pick just pick just pick and you can see the blue level right here or

End Mill and for our geometry we are going to just pick just pick just pick and you can see the blue level right here or the blue plane showing the material that's going to be removed and here as well and here as well and here as well so that is going to be removed right there that is great considering the stock as well our Heights now we picked this Contour that contour and this we could actually pick for our bottom height selected Contours because those were the exact uh Contours on the exact planes that we wanted to machine them on and it's smart it will understand that this Contour is on

_Signals: toolpath:3 · camOps:1_

### Tip 6 — confidence 0.4

> one plane this Contour is on the same plane and this is on a different plane on a different plane on a different plane y

one plane this Contour is on the same plane and this is on a different plane on a different plane on a different plane you can also see that the first two are closed and the last is an open chain perfect let's go to passes optimal load let's go to point one five there great stock to leave let's pick tenthal for our radial tenthal for our axial and let's go okay let's go okay let's go okay now this is a beautiful looking pass right there the only difference is is we have lots of retracts so again we're going to go to our dual path go to linking linking linking instead of full retraction

_Signals: toolpath:1_

### Tip 7 — confidence 0.49

> minimum this is just a little bit of a warning for you while you're programming you while you're programming you while y

minimum this is just a little bit of a warning for you while you're programming you while you're programming you while you're programming don't always pick minimum retraction exercise discernment I should say when you are switching this from minimum to full or full to minimum um um um this is just to educate you on different tool paths so just let the let the machinist let the programmer beware okay now look at this tool path it's beautiful beautiful beautiful very few wasted cuts very few wasted cuts very few wasted cuts let's hit OK look at that it's great so click on the top right of your

_Signals: toolpath:1 · safety:2 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-62226pmX3i0-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/62226pmX3i0.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].