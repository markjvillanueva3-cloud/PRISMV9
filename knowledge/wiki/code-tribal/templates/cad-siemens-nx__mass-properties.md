---
title: "CAD function template — siemens-nx / mass-properties"
software: siemens-nx
function: mass-properties
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / mass-properties

**Software:** `siemens-nx` · **Function category:** `mass-properties`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <mass-properties> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> this is a little demonstration of the new assembly Mass Property Management functions in the June 2022 release of NX so

this is a little demonstration of the new assembly Mass Property Management functions in the June 2022 release of NX so first off a little thing about the display of the center of mass symbols if we come in and of course turn on the mass panels here mass panels here mass panels here in this options we have the ability here to display some Center of mass symbols if we want I'm going to grab the first couple here there's one for the displayed part that'll be red and then one for anything we select that'll be green and so if we turn these on you'll see there that we've got that red Center of mass

_Signals: camOps:2 · howto:1_

_Source: [What's new - Assembly Mass Properties Analysis on NX](https://www.youtube.com/watch?v=9-lOFfDRFz4) — channel `Huan Duong NX`_

### Tip 2 (confidence 0.4)

> have multiple H3 HD 3D tools turned on at the same time if we go to visual reporting there's going to be a very similar

have multiple H3 HD 3D tools turned on at the same time if we go to visual reporting there's going to be a very similar one here that's this report for a Mass properties reference set okay if we choose that and execute this one then we're going to see here that we've colored these objects relative to the the categories up above so this is again looking for the empty reference set or the entire part or master master solid and model here it's found those those two that are the ones that are the the odd ones and we've got similar capability to come in here and and make these the work part or

_Signals: camOps:1 · howto:2_

_Source: [NX Assembly Mass Properties: New Checker and Report for Mass Reference Sets [NX 2212]](https://www.youtube.com/watch?v=gFWy5stfRik) — channel `Taylor Anderson NX Videos`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `mass-properties` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation