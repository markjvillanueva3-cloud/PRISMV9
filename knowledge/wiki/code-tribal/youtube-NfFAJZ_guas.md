---
title: "Solidworks Complete Text Tutorial in 5 minutes"
domain: cad
source: youtube
videoId: NfFAJZ_guas
url: https://www.youtube.com/watch?v=NfFAJZ_guas
channel: "Slightly Engineered"
duration_s: 318
tribal_entries: 5
chunks_scanned: 8
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Solidworks Complete Text Tutorial in 5 minutes

**Channel:** [Slightly Engineered](https://www.youtube.com/watch?v=NfFAJZ_guas)
**Duration:** 5m 18s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 8 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> hello everyone and welcome back to another solid works tutorial so something that is often used in 3D printing world and

hello everyone and welcome back to another solid works tutorial so something that is often used in 3D printing world and can be very very useful is text that's built into the part specifically so that's what we're going to do going to show you how to put text onto this part both on a flat face which is obviously the easiest part but then also how to do it on a curved face because this can give you very good details and it will not be in the same plane once it's wrapped onto the face so without further Ado let's start so the first thing that we need to do to create text is to actually create a

_Signals: camOps:1 · howto:2_

### Tip 2 — confidence 0.41

> and it basically indexes with this point and there's a set offset but now we can move it around if we need to move the e

and it basically indexes with this point and there's a set offset but now we can move it around if we need to move the edge start beginning but make sure that it's big enough that all of your textt is there so now this becomes a closed contour and we can interact with it just like normal so we can do an extruded cut and we'll say let's make this an e/ inch deep cut that into the surface and now we have XYZ cut an E8 inch into the surface of this part now that's pretty straightforward now that's pretty straightforward now that's pretty straightforward relatively simple but then the question is

_Signals: toolpath:1 · howto:1_

### Tip 3 — confidence 0.47

> what do we do if it's a curved face what if we want XYZ on this face and let's let's do it so first thing we need to do 

what do we do if it's a curved face what if we want XYZ on this face and let's let's do it so first thing we need to do is we need to add a reference plane that we can sketch on so if I click this it'll default the tangent click this face okay it's it defaults to perpendicular but we want it parallel there we go it's tangent to this face it's parallel to this face there we go so now let's do the same thing we did on the first the first the first face get our line make it a construction line make it flat line make it flat line make it flat and then let's add some text we'll do the same the

_Signals: toolpath:2 · howto:2_

### Tip 4 — confidence 0.56

> same the same XYZ go through change it to 60 points save that off and now we have a close Contour close Contour close Co

same the same XYZ go through change it to 60 points save that off and now we have a close Contour close Contour close Contour sketch on the face let's try and even that up a little bit a little bit too far there we go that's good enough for what we're doing now the important thing here is we don't actually interface with anything up here in this we have to close out of our sketch so this is just becomes a close Contour sketch over here then we go to features and and and wrap now wrap knows because that was already selected sketch six was selected let's get off of that so you can see what

_Signals: toolpath:4 · howto:1_

### Tip 5 — confidence 0.41

> it'll do if I don't have a selected basically says give me an existing sketch or if you want to we can make a new sketch

it'll do if I don't have a selected basically says give me an existing sketch or if you want to we can make a new sketch so we're going to select sketch six now it knows what we're doing now we need to give it a face let's give it this face so now as you can see it takes it and projects it and wraps it onto the surface it doesn't project it straight back it actually follows the Contour of this face and now within this menu you have the ability to make it a emboss deboss and actually just kind of like a scribe etch line so I can just show you how that looks and we'll make it E inch deep to

_Signals: toolpath:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-NfFAJZ_guas-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/NfFAJZ_guas.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].