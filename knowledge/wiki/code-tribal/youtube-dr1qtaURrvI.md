---
title: "FreeCAD for Beginners pt.3 - Importing and Editing .STL Files"
domain: cad
source: youtube
videoId: dr1qtaURrvI
url: https://www.youtube.com/watch?v=dr1qtaURrvI
channel: "thehardwareguy"
duration_s: 235
tribal_entries: 6
chunks_scanned: 9
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# FreeCAD for Beginners pt.3 - Importing and Editing .STL Files

**Channel:** [thehardwareguy](https://www.youtube.com/watch?v=dr1qtaURrvI)
**Duration:** 3m 55s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 9 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> welcome back to another video and today i'm going to show you how you can import and edit ftl files and edit ftl files a

welcome back to another video and today i'm going to show you how you can import and edit ftl files and edit ftl files and edit ftl files in freecad this is always good to know because sometimes if you find a file on thingiverse thingiverse thingiverse you might want to make a few changes to it and this will allow you to do that so let's take a look so we've got an empty workspace here and the first thing we need to do is go up to file import and select whichever stl you want to import to import to import into freecad just going to hit open so this is just a part that i designed inside of

_Signals: safety:1 · howto:1_

### Tip 2 — confidence 0.41

> longer need the original mesh so we can just right click and delete we're also going to need to convert this to a solid 

longer need the original mesh so we can just right click and delete we're also going to need to convert this to a solid so once again click on the path in the part tree come up to path up to path up to path and click on convert to solid that'll create another object in here for us and you can see it has solid next to it in brackets again we can delete the previous one because we no longer need it and we now have a solid object inside a freecad but notice it looks a little bit weird right it's got these dark areas on it and there are also these weird kind of triangle things on our flat edges

_Signals: howto:6_

### Tip 3 — confidence 0.43

> the original solid once again and now i'll show you how to just create a sketch and show you that this works so before w

the original solid once again and now i'll show you how to just create a sketch and show you that this works so before we can create a sketch remember we first need to create a body let's go back to the part design workspace we'll come back to our part three we'll click on our solid and then we'll click this icon here that says create a new body and make it active active active that'll create this new body for us and now if we want to create a sketch we select the surface we want to sketch on come up to the create new sketch button button button that will take us straight into a new sketch

_Signals: howto:10_

### Tip 4 — confidence 0.44

> and now we can make whatever changes we want changes we want changes we want so let's say for example i just want to add

and now we can make whatever changes we want changes we want changes we want so let's say for example i just want to add a circle in here i'm going to grab the circle tool do a quick sketch we'll throw some constraints on that as well we'll make it five mil and we'll set it to be set it to be set it to be 15 millimeters from the origin sketch goes green goes green goes green three cards happy now if we update and close the sketch close the sketch close the sketch we can see our sketch object there on the side of our stl we're just going to click that object come up to pocket and that'll

_Signals: toolpath:1 · howto:4_

### Tip 5 — confidence 0.41

> create a hole for us and we successfully edited that file successfully edited that file successfully edited that file an

create a hole for us and we successfully edited that file successfully edited that file successfully edited that file another tip as well if we scroll underneath you can see it's only cut through the one surface through the one surface through the one surface so what if we wanted to cut all the way through so what we can do is come up to type type type and that's going to select the type of cut we want to do if you want to go through everything you can select through all but what's better practice i'd say is to use up to face so if we select up to face we can then select can then select can

_Signals: howto:6_

### Tip 6 — confidence 0.41

> then select any face that we want to use i'm going to select this one so what i'll do is it'll cut it'll cut it'll cut e

then select any face that we want to use i'm going to select this one so what i'll do is it'll cut it'll cut it'll cut everything up to that face and if we have a look here have a look here have a look here you can see that it's now cut through all of those objects all of those objects all of those objects straight through the model so that's it for this video i hope you've learned something i hope you can now do some cool things with stl cool things with stl cool things with stl files as always thank you for watching subscribe for more videos subscribe for more videos subscribe for more

_Signals: safety:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-dr1qtaURrvI-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/dr1qtaURrvI.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].