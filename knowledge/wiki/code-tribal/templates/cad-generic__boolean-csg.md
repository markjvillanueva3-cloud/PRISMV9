---
title: "CAD function template — generic / boolean-csg"
software: generic
function: boolean-csg
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — generic / boolean-csg

**Software:** `generic` · **Function category:** `boolean-csg`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <boolean-csg> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> let's see if I can redeem myself on uh threading barrels so I've got the OD turned in as you can see here we're within a

let's see if I can redeem myself on uh threading barrels so I've got the OD turned in as you can see here we're within a foul now I don't own fancy guns smithing stuff and I unfortunately don't have a pin gauge set that goes from you know the sort of zero to quarter inch but when you combine fraction letter to number drills and Metric drills odds are you're going to have something pretty close so again is this perfect World Ventures gun gun smithing no but is it going to work let's try so this is a 52 or 5.5 mm drill and if we slide that in here we can see um it's the closest fit I got a 7302

_Signals: camOps:1 · params:1 · howto:1_

_Source: [SBR an S&W M&P 22LR:  Making Barrel tool & turning threads!](https://www.youtube.com/watch?v=2F2tJrhOp4g) — channel `NYC CNC`_

### Tip 2 (confidence 0.41)

> manipulate the points until i get the shape that i want not the best way to build a complex surface but if you're trying

manipulate the points until i get the shape that i want not the best way to build a complex surface but if you're trying to replicate something you already have then oftentimes you're gonna have to just play around with the geometry i'm okay with that okay with that okay with that i'm going to finish the sketch i'm going to hide that mesh section i'm going to go back to sketch 7 and just fix this to make sure that we do have that intersection point so once again create project include intersect intersect intersect this time i'm going to select this say okay okay okay and delete the horizontal

_Signals: camOps:1 · howto:3_

_Source: [Reverse Engineer Car Parts with CAD | Use Forms and Surfaces to create CAD models from SCAN Data](https://www.youtube.com/watch?v=4fU3PUs2syM) — channel `Learn Everything About Design`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `boolean-csg` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation