---
title: "Setup Tools & Toolpaths on Sub-Spindle - Advanced Lathe Tips and Tricks 8/12"
domain: lathe
source: youtube
videoId: XQbu664Aw74
url: https://www.youtube.com/watch?v=XQbu664Aw74
channel: "MLC CAD Systems"
duration_s: 270
tribal_entries: 4
chunks_scanned: 6
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Setup Tools & Toolpaths on Sub-Spindle - Advanced Lathe Tips and Tricks 8/12

**Channel:** [MLC CAD Systems](https://www.youtube.com/watch?v=XQbu664Aw74)
**Duration:** 4m 30s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 6 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.46

> what you'll notice is that I have a right spindle already defined and inside of my right spindle if we look at the prope

what you'll notice is that I have a right spindle already defined and inside of my right spindle if we look at the properties here in the stock setup setup setup I can see that my Chuck from this point is 15 inches away is 15 inches away is 15 inches away and it's also a preset for a four inch diameter we're going to go ahead and create the stock transfer option here and you'll notice just like the stock flip I can select my transfer geometry I'm going to offset this by 20 just as we did before we did before we did before and Mastercam already has a lot of these options automatically populated

_Signals: params:3 · howto:2_

### Tip 2 — confidence 0.45

> select my OD rough simple 2D tool and I'm going to drag it into the upper Library here the turret that we have and I'm s

select my OD rough simple 2D tool and I'm going to drag it into the upper Library here the turret that we have and I'm simply going to double click now whenever you're selecting Tools For Your Right spindle you need to make sure that you go into your setup for the tool and here you'll see an active spindle whether it's going to be the left or right right right you'll also see the mounting position being done as you toggle between the two but this is going to let me know is whether we're going clockwise or counterclockwise counterclockwise counterclockwise depending on the mounting position as

_Signals: camOps:2 · howto:4_

### Tip 3 — confidence 0.48

> and I'll green check okay so now whenever we're working on this particular operation particular operation particular ope

and I'll green check okay so now whenever we're working on this particular operation particular operation particular operation or this particular uh spindle here I'm going to load a finish for this and inside of our finish I'm going to go ahead and select this sub spindle tool now you'll notice at the very bottom our axis combination see how it changes from the lathe upper left left left to a right upper to a right upper to a right upper and I can also go into my right upper and I can create a new plane here we want to use this one for maybe g54 and our and our and our right upper for G55

_Signals: camOps:2 · gcode:1 · howto:2_

### Tip 4 — confidence 0.53

> right upper for G55 right upper for G55 I can select my Z here to be the end of this part and that's the new location I 

right upper for G55 right upper for G55 I can select my Z here to be the end of this part and that's the new location I can green check okay I'll say sub spindle I'll say sub spindle face face face for our comment for our comment for our comment and inside of our face I say finish Z here rough rough finish operation that looks good I'm simply going to Green check okay so now we have our sub spindle being done done done for the facing operation [Music] [Music] foreign foreign foreign [Music]

_Signals: camOps:4 · gcode:2 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-XQbu664Aw74-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/XQbu664Aw74.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].