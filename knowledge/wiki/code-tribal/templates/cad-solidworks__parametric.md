---
title: "CAD function template — solidworks / parametric"
software: solidworks
function: parametric
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — solidworks / parametric

**Software:** `solidworks` · **Function category:** `parametric`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <parametric> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.49)

> inch diameter drill we actually don't have much we have to edit on this our tool we don't have to change our spindle spe

inch diameter drill we actually don't have much we have to edit on this our tool we don't have to change our spindle speed we can change this it's going to be the same it's going to be 2 800 rpm we're actually going to leave that spindle speed the same spindle speed the same spindle speed the same as our end mills drill hole parameter so when this drills it's not just going to take that drill bit and bury it down in in one continuous pass it's going to do an operation called pecking and that's where it kind of just comes in and pecks it a little bit at a time and that's to help clear out

_Signals: camOps:3 · params:1 · howto:2_

_Source: [SOLIDWORKS CAM: TOOL CHANGES AND ADDING TOOL PATHS](https://www.youtube.com/watch?v=-CJtW6ORjDw) — channel `Professor Cameron`_

### Tip 2 (confidence 0.41)

> Um and and for now I mean for the for our purposes one of the biggest benefits is we can change the um the value of thos

Um and and for now I mean for the for our purposes one of the biggest benefits is we can change the um the value of those variables so that we can have different dimensions different features in um different configurations. And again different configurations. And again different configurations. And again looking at this every time we want to change an actual global variable it's dollar sign value at the variable name at equations and it it always maintains that same format. So I'm going to close that. I'm going to go ahead and add a configuration. configuration. configuration.

_Signals: safety:1 · howto:2_

_Source: [SolidWorks: Control Global Variables Across Configurations with Design Tables](https://www.youtube.com/watch?v=xdh7w3Egj4c) — channel `Brad Peirson`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `parametric` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation