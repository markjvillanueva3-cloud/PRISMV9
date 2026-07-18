---
title: "CAD function template — fusion-360 / derived-parts"
software: fusion-360
function: derived-parts
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / derived-parts

**Software:** `fusion-360` · **Function category:** `derived-parts`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <derived-parts> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.4)

> tool life improves parting tool life improves parting tool life and it lets us run these walk away and come back when th

tool life improves parting tool life improves parting tool life and it lets us run these walk away and come back when they're done much better workflow than having to run a second operation to properly clean up and machine and machine and machine that back side the first step is not in our part file but rather in this master template and we'll have this available cart here to download with the file open we're going to activate our part placeholder component right click on our actual part file and insert into current design click ok click ok click ok enable the visibility on our stock main

_Signals: howto:5_

_Source: [Programming Dual Spindle CNC Lathes in Fusion 360!](https://www.youtube.com/watch?v=ZHvz86sfu5M) — channel `NYC CNC`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `derived-parts` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation