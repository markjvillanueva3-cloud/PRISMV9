---
title: "CAD function template — fusion-360 / sketch-3d"
software: fusion-360
function: sketch-3d
source: video-tribal-aggregation
tip_count: 4
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / sketch-3d

**Software:** `fusion-360` · **Function category:** `sketch-3d`
**Source:** aggregated from 4 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <sketch-3d> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 4 by confidence)

### Tip 1 (confidence 0.63)

> delete everything will delete everything will delete everything and i will write 0

delete everything will delete everything will delete everything and i will write 0.5 millimeters then in the last one on linking tab you can see how the tool will operate between different between different between different g-codes and let's go here to the ramp so here if you're holding the mouse here we are able to see a lot of ways how we can can can curve into our model for example the helix the profile the zigzag the plunge and so on but for our case i will let the helix will let the helix will let the helix so in this way our tool will go down into into into our stock here and

_Signals: toolpath:6 · howto:3_

_Source: [Fusion360 | Generate TOOLPATH and export G CODE | Quick and Simple](https://www.youtube.com/watch?v=wsSWVtjp8c0) — channel `MariusCAD`_

### Tip 2 (confidence 0.56)

> there's a pocket over them then that generate okay so this looks nice here this looks nice as also have four helix helix

there's a pocket over them then that generate okay so this looks nice here this looks nice as also have four helix helix helix maybe if I create a geometrical it's little bit higher okay yeah it's what as well okay and then if here horizontal game with the same tool this is the selection five millimeter tool selection five millimeter tool selection five millimeter tool orientation is orientation is orientation is here and hit the z-axis and then mas para and then also to millimeter and three millimeter of the fraction okay yeah it's nice and then also want to machine this one with some

_Signals: toolpath:4 · howto:1_

_Source: [5 Axis CAM - Fusion 360 Tutorial](https://www.youtube.com/watch?v=bI4JiT_i1cc) — channel `Didi Widya Utama`_

### Tip 3 (confidence 0.48)

> we're going to use the new tool tool tool [Music] you seem flat and mill with two millimeter of the Amazon and 24 the le

we're going to use the new tool tool tool [Music] you seem flat and mill with two millimeter of the Amazon and 24 the length of the bully okay okay and then the selection will be here inside there the orientation is the surface here see the z-axis just flip order okay - we'll be outside boundary with part millimeter and then using the things okay if you want to use the okay okay if you want to use the step offer you can use the manuals at all but I'm going to use the automatic one with the more spiral and I'm going to use the helix with systems of the hail will be trimming method okay because

_Signals: toolpath:2 · camOps:1_

_Source: [5 Axis CAM - Fusion 360 Tutorial](https://www.youtube.com/watch?v=bI4JiT_i1cc) — channel `Didi Widya Utama`_

### Tip 4 (confidence 0.43)

> things I'll click OK and I bet you we're gonna get to depths of cut past now so 1 & 2 perfect little tip if you got 3 th

things I'll click OK and I bet you we're gonna get to depths of cut past now so 1 & 2 perfect little tip if you got 3 there sometimes what can happen is you need to say depth of cut could be just a hair more say 2 5 1 and that would help you get avoid that sort of whisper third cut at the floor so let's simulate it click on setup go back to simulate now I don't want to watch the face again we already did that so click on this go to next operation play so there it's doing a spiral move linking in and again one reason I really like the fog Buster versus flood coolant is you can use that air

_Signals: toolpath:1 · howto:3_

_Source: [Fusion 360 CAM Tutorial for Beginners! FF102](https://www.youtube.com/watch?v=Do_C_NLH5sw) — channel `NYC CNC`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `sketch-3d` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation