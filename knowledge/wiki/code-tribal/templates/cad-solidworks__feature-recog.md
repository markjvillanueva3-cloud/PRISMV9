---
title: "CAD function template — solidworks / feature-recog"
software: solidworks
function: feature-recog
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — solidworks / feature-recog

**Software:** `solidworks` · **Function category:** `feature-recog`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <feature-recog> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.78)

> the stock next we're gonna select generate operation plan literally all we're doing is just moving left to right right r

the stock next we're gonna select generate operation plan literally all we're doing is just moving left to right right right all of these buttons here and you can see what it did is it took that machinable feature and turned it into a rough mil and a contour mil now what SolidWorks is doing is it's generating a rough mill which is going to remove the bulk of the material and then it's coming in afterwards with a contour mill contour mill is going to cut it to final shape now we can see this briefly if we select generate tool path and simulate tool path what this is gonna do is it's gonna

_Signals: toolpath:5 · camOps:5 · howto:3_

_Source: [Solidworks CAM Tutorial: Basic Contour (1)](https://www.youtube.com/watch?v=jlhjrMKiZfo) — channel `Professor Cameron`_

### Tip 2 (confidence 0.43)

> and what it does is it recognizes this rectangular pocket here as the machinable feature we're gonna generate the operat

and what it does is it recognizes this rectangular pocket here as the machinable feature we're gonna generate the operation plan generate tool paths we're gonna come back and edit these values in a little bit and there we go we have our in this case three tool paths so let's go ahead and simulate this let's see how this looks before we go ahead and start editing any of these values so what its gonna start out with first is a three-quarter inch a 10mm and it's just going to come in here and and and clear out the bulk of this material and we can fast-forward through this and it's down to the

_Signals: toolpath:1 · params:1_

_Source: [Solidworks CAM Tutorial: Adding Tool Paths (3)](https://www.youtube.com/watch?v=Z8TOSDcW-po) — channel `Professor Cameron`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `feature-recog` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation