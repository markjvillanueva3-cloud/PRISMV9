---
title: "CAD function template — rhino / assembly"
software: rhino
function: assembly
source: video-tribal-aggregation
tip_count: 3
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — rhino / assembly

**Software:** `rhino` · **Function category:** `assembly`
**Source:** aggregated from 3 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <assembly> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.41)

> component so at this point you might be thinking wait I don't have a place block component and you're goddamn right you

component so at this point you might be thinking wait I don't have a place block component and you're goddamn right you don't it's if you if I hold Ctrl alt click Ctrl alt click Ctrl alt click you can see that it's located in a plugin that's called human human plugin enables you to do many things with your grasshopper oh sorry with your rhino file that you know deals with blogs and also uh text and textures and so on it's a very useful plugin by the way so you should download it it's on foot for rhino.com it's free blah blah blah you know the drill so just go to foodforino.com foodforino.com

_Signals: camOps:1 · howto:3_

_Source: [How To: Use Rhino BLOCKS as STRUCURAL BEAMS with Grasshopper (BEAMS PART 1)](https://www.youtube.com/watch?v=V5srJHLpAYs) — channel `Gediminas Kirdeikis`_

### Tip 2 (confidence 0.4)

> go vertically and now we're going to take a new component so I'll go 120 to make it 10 feet tall feet tall feet tall and

go vertically and now we're going to take a new component so I'll go 120 to make it 10 feet tall feet tall feet tall and that's good but actually I want to increase the size here just to just to have a little bit more space in making a blue van nicer so perfect now we have our base columns that we can always increase or decrease the count depending on what we're looking for and we are now going to create the roof portion of it so what we're gonna do is take this plane and just move it so we'll plug in the plane into the geometry for moon and the good thing is that since we already have the

_Signals: safety:1 · howto:1_

_Source: [Rhinoceros 6 and Grasshopper Multi-floor Structure with Columns and Floors Full Steps](https://www.youtube.com/watch?v=18zJ_NQypJQ) — channel `DCO Parametric`_

### Tip 3 (confidence 0.4)

> next we'll merge outputs A and B and create a love surface from pairs of lines lines lines following this I will extract

next we'll merge outputs A and B and create a love surface from pairs of lines lines lines following this I will extract the surface outline during the data trees so all the POI lines on the same level are in the same branch in the same branch in the same branch from this list I'll create pairs of Point lines or pairs of items using the partition list component partition list component partition list component and create a loft surface and in the final step we'll apply the cap component to create a closed B rep foreign foreign foreign [Music] version of this tutorial we are going to continue

_Signals: howto:5_

_Source: [You need THIS skill to work for BIG](https://www.youtube.com/watch?v=ujQRODWK1OU) — channel `How to Rhino`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `assembly` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation