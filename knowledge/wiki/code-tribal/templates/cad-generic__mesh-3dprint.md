---
title: "CAD function template — generic / mesh-3dprint"
software: generic
function: mesh-3dprint
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — generic / mesh-3dprint

**Software:** `generic` · **Function category:** `mesh-3dprint`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <mesh-3dprint> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.44)

> If you drag the corner of a construction plane, it allows you to resize it

If you drag the corner of a construction plane, it allows you to resize it. Okay, so now we can visually see that sure enough, this plane is slicing right through it. and I'm going to go ahead and sketch on that plane. Okay, Okay, Okay, I'm going to project some geometry. So, under create under create under create project, project, project, you'll notice the P key is the shortcut key, which I always use the shortcut keys. So, I'm out here. I just hit the P key and it's going to project some geometry. So, I just want to click on these holes here.

_Signals: safety:1 · howto:5_

_Source: [360 LIVE: Electrical Wire Routes](https://www.youtube.com/watch?v=O4QkUUxbOb4) — channel `Autodesk Fusion`_

### Tip 2 (confidence 0.4)

> box i'm going to change the pattern to honeycomb and then i'm going to adjust the infill to be 50 and of course you can

box i'm going to change the pattern to honeycomb and then i'm going to adjust the infill to be 50 and of course you can make additional changes as required changes as required changes as required here i'm just going to go ahead and click ok next i want to look at the support so i'm going to go under the supports menu and click on the supports tool and again in the dialog box you can make changes as required and for now i'm just going to go ahead and click ok next i'll calculate the operations by clicking on the generate tool tool tool found on the actions menu next i'll start the simulation

_Signals: howto:5_

_Source: [Autodesk Fusion | Module 8: Additive manufacturing (3D printing)](https://www.youtube.com/watch?v=J8R1gDmKhv8) — channel `Autodesk Education`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `mesh-3dprint` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation