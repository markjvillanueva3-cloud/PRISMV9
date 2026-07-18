---
title: "CAD function template — solidworks / drawing"
software: solidworks
function: drawing
source: video-tribal-aggregation
tip_count: 3
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — solidworks / drawing

**Software:** `solidworks` · **Function category:** `drawing`
**Source:** aggregated from 3 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <drawing> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.54)

> The way to draw 3D Sketches is identical to 2D ones, enabling any drawing tool and selecting the right plane

The way to draw 3D Sketches is identical to 2D ones, enabling any drawing tool and selecting the right plane. You can always change the plane to use by selecting it and going to Normal To. To get a complete 3D preview right-click, go to Rotate View and click and drag around, using the Escape key to exit. You can also use the Spacebar key to select specific views. From the Orientation dialog you can also change the coordinate system. By default SolidWorks uses XZ as ground plane and Y for depth but you can switch to XY and Z for depth.

_Signals: camOps:3 · safety:1 · howto:6_

_Source: [SolidWorks - Tutorial for Beginners in 13 MINUTES!  [ COMPLETE ]](https://www.youtube.com/watch?v=CiBwrjUeB8U) — channel `Skills Factory`_

### Tip 2 (confidence 0.42)

> display 3d connectors and check mark for drawing options options options choosing okay does produce the harness drawing

display 3d connectors and check mark for drawing options options options choosing okay does produce the harness drawing with connectors back shelves tables and callouts automatically and saves time for engineers to tackle other technical challenges technical challenges technical challenges the solidworks ecosystem lets you quickly create electrical information quickly create electrical information quickly create electrical information for components add and manipulate back shells for contact and wire protection and create flattened harness drawings that include back shells

_Signals: camOps:1 · howto:4_

_Source: [SOLIDWORKS 2022 - Routing](https://www.youtube.com/watch?v=ZxR-JfR7fp4) — channel `SOLIDWORKS`_

### Tip 3 (confidence 0.4)

> in this video we will learn about detail view how to use detail view sometime we have too busy drawing or difficult to m

in this video we will learn about detail view how to use detail view sometime we have too busy drawing or difficult to manage the dimensions or difficult to adjust the dimension in this scenario we can use detail view so you will see drawing Tab and here you will see detail view just simply view just simply view just simply select and here it will ask you create one sketch or select Circle to continue view creation so which area you want to zoom or enlarge so I'm going to uh enlarge this area because there is too many dimensions so let's say I'm going to create something like this this now

_Signals: howto:5_

_Source: [SolidWorks Drawing Create Detail View](https://www.youtube.com/watch?v=2gSzr1LuaDg) — channel `CAD CAM TUTORIAL BY MAHTABALAM`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `drawing` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation