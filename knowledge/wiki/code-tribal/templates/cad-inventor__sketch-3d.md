---
title: "CAD function template — inventor / sketch-3d"
software: inventor
function: sketch-3d
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — inventor / sketch-3d

**Software:** `inventor` · **Function category:** `sketch-3d`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <sketch-3d> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.44)

> and click on spline tension tension tension and drag this thing up to 100 so as you can see in the preview it is is is n

and click on spline tension tension tension and drag this thing up to 100 so as you can see in the preview it is is is now closer to a straight connecting or or a splain that is connecting points on the most effective way um the closest distance let's say okay so after that it is it is ready this plan is ready to be used on a loft command for example so I will U add this other one okay so now we do the exactly the same thing SP in tension drag it to 100 and accept Okay so the rest of the planes are already on that condition I will finish the 3D sketch and uh something very important to do in

_Signals: camOps:2 · howto:3_

_Source: [From 3D Scan to Surface in Autodesk Inventor 2025 #tutorial](https://www.youtube.com/watch?v=0Cwp1by_JIQ) — channel `lucmartz`_

### Tip 2 (confidence 0.42)

> same that's the same okay even the different parts I can do the same uh the same D1 T2 something okay so to make it manu

same that's the same okay even the different parts I can do the same uh the same D1 T2 something okay so to make it manual hardness okay manual wire sorry so I can click on this crit wire select from which point to which point which point which point later you will see that you can change the category of your wire and also the size and size and size and the color of your wire okay so the size and the color of each wire wire wire so by default this one already done so how to make it more look realistic so you can adjust the position of wire because normally wire people will do a 3D spline and

_Signals: camOps:1 · howto:4_

_Source: [Autodesk Inventor - Wire Modelling for Control Panel](https://www.youtube.com/watch?v=jk9wEgNzRtI) — channel `Acad Systems Sdn Bhd`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `sketch-3d` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation