---
title: "Rhino 8   The Secret Sauce!"
domain: cad
source: youtube
videoId: 4sC131_cO6U
url: https://www.youtube.com/watch?v=4sC131_cO6U
channel: "Rhino 3D (Rhinoceros3d official)"
duration_s: 231
tribal_entries: 4
chunks_scanned: 5
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Rhino 8   The Secret Sauce!

**Channel:** [Rhino 3D (Rhinoceros3d official)](https://www.youtube.com/watch?v=4sC131_cO6U)
**Duration:** 3m 51s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 5 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> hi everybody this is Brian James from Rhino 3d

hi everybody this is Brian James from Rhino 3d.com and in this video I'd like to share with you one of my favorite workflows in Rhino workflows in Rhino workflows in Rhino 8 here we have a low poly scan of an armchair this mesh has a number of issues including holes and issues including holes and issues including holes and self-intersecting topology I'd like to end up with a closed solid poly surface and I'll start in the front view I'll draw a line with the polyline command and I'll hold down shift to keep the line straight I'll go into the mesh tools and select the mesh split select the mesh

_Signals: camOps:1 · howto:2_

### Tip 2 — confidence 0.42

> split select the mesh split command I have the create Eng gon option set to know I'll select the mesh to split and The C

split select the mesh split command I have the create Eng gon option set to know I'll select the mesh to split and The Cutting object will be that that that line I'll select the part of the result that I care about and then use the invert command followed by delete to remove every everything I don't need next I'll go into the mesh tools again and use shrink again and use shrink again and use shrink wrap I'll enable preview as well as hide input input input objects The Fill mesh holes option will fill any holes in the input objects and the target Edge length will allow us to capture more

_Signals: howto:7_

### Tip 3 — confidence 0.45

> detail from the input the smaller this number smaller this number smaller this number is I'll choose delete input object

detail from the input the smaller this number smaller this number smaller this number is I'll choose delete input objects and click okay okay now if you wanted to 3D print this model you're done you could select this mesh and Export it as an STL file but I'd like to go one step further by using the quad remesh command in the subd tools quad remesh will create an all quad mesh you can specify a target number of quads I'll click preview as well as hide input well as hide input well as hide input objects I'll also use this convert to subd option to create a subdivision surface from the Quad

_Signals: camOps:1 · howto:7_

### Tip 4 — confidence 0.43

> surface from the Quad surface from the Quad mesh the Symmetry axis option is also useful here the central line will be d

surface from the Quad surface from the Quad mesh the Symmetry axis option is also useful here the central line will be defined parallel to the Y AIS in the world space and an edge Loop will be created in the created in the created in the subd I'll choose delete input objects so we have just this subd surface left the final step is to use the two nerbs command the two nerbs command has a delete input option so that we're left just with this closed solid poly surface if I enable isocurves for my display mode you can see the density of the nerb surfaces that result anywhere we had more than four

_Signals: toolpath:1 · howto:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-4sC131_cO6U-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/4sC131_cO6U.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].