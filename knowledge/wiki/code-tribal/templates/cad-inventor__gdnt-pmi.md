---
title: "CAD function template — inventor / gdnt-pmi"
software: inventor
function: gdnt-pmi
source: video-tribal-aggregation
tip_count: 3
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — inventor / gdnt-pmi

**Software:** `inventor` · **Function category:** `gdnt-pmi`
**Source:** aggregated from 3 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <gdnt-pmi> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.5)

> is create one of these surfaces with a a fit uh mesh facets fit fit mesh tool and that's going to help you because you c

is create one of these surfaces with a a fit uh mesh facets fit fit mesh tool and that's going to help you because you can play around with the location of these points along the the line that I mentioned and they're always going to be consistent the points in here let me let me turn them now this points are never going to going to going to fail as long as they are inside our frame and our and and with the fact that our fit mesh surface is larger than our rectangle or our area so as you can see I have here a 3D um sketch where I already did some some work so here is where uh the magic where

_Signals: camOps:2 · safety:2 · howto:1_

_Source: [From 3D Scan to Surface in Autodesk Inventor 2025 #tutorial](https://www.youtube.com/watch?v=0Cwp1by_JIQ) — channel `lucmartz`_

### Tip 2 (confidence 0.43)

> in either direction that is actually quite a bit of Tolerance and I could actually have a part let's pretend that this i

in either direction that is actually quite a bit of Tolerance and I could actually have a part let's pretend that this is I'm going to make my line a little thinner little thinner little thinner here make it red let's pretend like we're really zoomed in and this is 0.005 in the positive direction and this is 005 in the negative Direction and I could actually have a part that is like this and still fulfill that tolerance requirement because it never goes less than 0.005 and it never goes greater than 05 in the other direction but what's really important here is that it is flat as flat as we

_Signals: safety:2_

_Source: [Intro to GD&T in Inventor](https://www.youtube.com/watch?v=nPzGIzEDbZs) — channel `Trent Jensen`_

### Tip 3 (confidence 0.43)

> is my feature control frame and that is how we specify geometric tolerances when I click on this now I'm going to draw a

is my feature control frame and that is how we specify geometric tolerances when I click on this now I'm going to draw another leader line from the back here and I'll click again to set where it is and I can keep clicking to create more places or I can right click and say continue to create that feature control frame and when I continue on that this uh window pops up that allows me to specify some geometric tolerance so the first thing I need to specify is my symbol and you can find um examples of these pull up one here from the here from the here from the internet here are the different

_Signals: howto:9_

_Source: [Intro to GD&T in Inventor](https://www.youtube.com/watch?v=nPzGIzEDbZs) — channel `Trent Jensen`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `gdnt-pmi` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation