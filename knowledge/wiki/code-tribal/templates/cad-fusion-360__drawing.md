---
title: "CAD function template — fusion-360 / drawing"
software: fusion-360
function: drawing
source: video-tribal-aggregation
tip_count: 3
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / drawing

**Software:** `fusion-360` · **Function category:** `drawing`
**Source:** aggregated from 3 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <drawing> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.58)

> to like drill in and wrap it out I'm gonna press okay alright so now that we spotted each hole to make way for the drill

to like drill in and wrap it out I'm gonna press okay alright so now that we spotted each hole to make way for the drill so the drill goes in nice and straight we're actually going to program the drill it's tool number 4 on your setup sheet your setup sheet your setup sheet it's a 177 drill which is the pre drill size board to thread so I'm gonna come back up to drill I'm gonna select my tool we're going to a 177 drill we're gonna okay it put it at 4,000 rpms I'm just gonna feed in at 15 inches a minute with my drill my retrack trait is 40 select faces we're already there I'm going to grab

_Signals: camOps:9 · params:2 · howto:2_

_Source: [Fusion 360 Tutorial: Program the Titan-1M (OP1) | ACADEMY](https://www.youtube.com/watch?v=hTxaDxr5-Ik) — channel `TITANS of CNC MACHINING`_

### Tip 2 (confidence 0.41)

> that's fine I'll do another video showing how to make the drawing from thing yeah I had a little champ for there yes so

that's fine I'll do another video showing how to make the drawing from thing yeah I had a little champ for there yes so but you can do that however you want you can do a chamfer you can do a fillet usually you don't want a sharp edge on the top of the desk usually you want something there if you want to keep it simple you can keep it simple if you want to challenge yourself you can do something a little more something a little more something a little more decorative um so it's up to you okay any questions all right

_Signals: camOps:2_

_Source: [Creating a Weldment in Fusion360](https://www.youtube.com/watch?v=9PG_AJsewQc) — channel `CAD Training Now`_

### Tip 3 (confidence 0.41)

> extruding it out at so so so we could make this we could make this we could make this 45 degrees for example okay so thi

extruding it out at so so so we could make this we could make this we could make this 45 degrees for example okay so this is the same result as what you can do from drawing everything flat and bending so it all depends on what it is that you are working from so if you already have your kind of flat drawing you can input the flat drawing and you can create bends or you can start from this from this from this and extrude out and then create your flap from this so flap from this so flap from this so create another flange here and here and we'll bring another one up here so you can see so you can

_Signals: params:1 · howto:3_

_Source: [Fusion 360 - Sheet Metal Flange Tutorial](https://www.youtube.com/watch?v=vS5DEhBhRFM) — channel `3D CAD Projects`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `drawing` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation