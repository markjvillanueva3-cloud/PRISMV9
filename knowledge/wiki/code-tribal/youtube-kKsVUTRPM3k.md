---
title: "Designing Parts Together (In-Context Features)"
domain: cad
source: youtube
videoId: kKsVUTRPM3k
url: https://www.youtube.com/watch?v=kKsVUTRPM3k
channel: "Onshape"
duration_s: 297
tribal_entries: 3
chunks_scanned: 9
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Designing Parts Together (In-Context Features)

**Channel:** [Onshape](https://www.youtube.com/watch?v=kKsVUTRPM3k)
**Duration:** 4m 57s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 9 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.41

> part gets larger we want this upper section or this upper part to also grow at the same proportion so to do that in on s

part gets larger we want this upper section or this upper part to also grow at the same proportion so to do that in on shape it's really simple all we need to do is just begin another sketch so I'll select this face here I'll choose to begin a new sketch and then I'm going to get into an offset entities command now I can take this edge here right Mouse button select and select tangent connected edges and then I can choose to offset this to a distance of let's left Mouse button in the background the background the background 0.5 mm so now we see that we've created an offset here for just a

_Signals: params:1 · howto:3_

### Tip 2 — confidence 0.42

> little bit of clearance and we're ready to take that geometry and turn it into an extrusion so we go go into Extrusion h

little bit of clearance and we're ready to take that geometry and turn it into an extrusion so we go go into Extrusion here and now this is where things are going to be a little different because this sketch and this Extrusion started out co- planer to an existing solid the default Behavior here is to add meaning it's just another Extrusion but we're going to choose new which is going to create now a new solid body or a new part in this onshape part studio so you can see here that I can then say that I want that to go up to a height of 2 mm and we can see here that now when we hit the green

_Signals: camOps:1 · params:1 · howto:1_

### Tip 3 — confidence 0.4

> here I'm going to create the first Circle for this cut extrude let's say I just put a circle here I'll make that 12 mm i

here I'm going to create the first Circle for this cut extrude let's say I just put a circle here I'll make that 12 mm in diameter and then I'm going to choose to extrude cut that so I'll do a remove here and I'll say this is going to be removed through wall but you'll notice that down here at the bottom I have this option for merge scope and so in the merge scope if I were to choose this part as well the tray you see that now the merge scope shows me that this feature is affecting both the shelf and the tray or if I click on the tray again that is removed from the merge scope and now that

_Signals: params:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-kKsVUTRPM3k-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/kKsVUTRPM3k.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].