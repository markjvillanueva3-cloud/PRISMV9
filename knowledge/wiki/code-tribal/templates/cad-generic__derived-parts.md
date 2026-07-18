---
title: "CAD function template — generic / derived-parts"
software: generic
function: derived-parts
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — generic / derived-parts

**Software:** `generic` · **Function category:** `derived-parts`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <derived-parts> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.55)

> process if we want to kick the feed rate up and type in a number

process if we want to kick the feed rate up and type in a number .012 input .012 input .012 input so now we have 12 000 speed rate for the rough rough rough we got to be very careful not to type in 0.120 as a hundred and twenty thousands per rev the machine will not catch that mistake and it will crash the insert into the part into the part into the part been there done that a couple times so be careful with changing the feed rates we're going to rough it with tool number four four four input offset always on this machine offset number one offset number one offset number one we're not going

_Signals: camOps:4 · safety:2_

_Source: [Mazak CNC Lathe Mazatrol Programming tutorial](https://www.youtube.com/watch?v=EPkvGVNoV98) — channel `CNC CADCAM`_

### Tip 2 (confidence 0.42)

> in Wisconsin cool I'm softball and of course you're around fishing so that's enough about me and let's get on to what we

in Wisconsin cool I'm softball and of course you're around fishing so that's enough about me and let's get on to what we're here for right so let's talk about getting started what are weldments basically the idea is weldments allow me to design in a part level using multi bodies using 2d sketches 3d sketches which defines the framework or the skeleton of what I'm working for working for working for and then when I start to add those weldment features and what's really cool about this is that as I create these weldments I'm not just stuck using weldments I can use weldments I can use weldments

_Signals: camOps:2 · howto:1_

_Source: [A Beginners Guide to Weldments](https://www.youtube.com/watch?v=h_PSPuO7-fg) — channel `CATI: Computer Aided Technology is now GoEngineer`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `derived-parts` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation