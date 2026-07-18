---
title: "CAD function template — inventor / routing"
software: inventor
function: routing
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — inventor / routing

**Software:** `inventor` · **Function category:** `routing`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <routing> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.43)

> your cable hardness in the same cable harness need to add it first if not it will create a new cable like this right cli

your cable hardness in the same cable harness need to add it first if not it will create a new cable like this right click click connection right click click connection right click click connection so now I already have few lines oh sorry so this one is not yet updated delete delete delete go here save update okay so update here so done just right click create connection so now I already have three line at one time time time okay to make it more realistic to the project so I would like to add more item so more item means I want to add a trunking okay so if I already have the trunking so if I

_Signals: howto:12_

_Source: [Autodesk Inventor - Wire Modelling for Control Panel](https://www.youtube.com/watch?v=jk9wEgNzRtI) — channel `Acad Systems Sdn Bhd`_

### Tip 2 (confidence 0.41)

> goes through the wire we're gonna want to click right click on it click harness properties we don't wait for that to loa

goes through the wire we're gonna want to click right click on it click harness properties we don't wait for that to load it takes a little bit of time if you have a lot of wires in your Ken model just gonna wait a little bit and now you're gonna be brought to this screen here it's gonna show you laying suggested links and other information you're not really gonna need to know that right now all we gonna need to know is a diameter currently the Diane rumor is 5.08 oh now to change this diameter we can't just click on here we have to click calculate size from wire something that we can alter

_Signals: howto:6_

_Source: [How To Wire Assemblies In Autodesk Inventor Professional](https://www.youtube.com/watch?v=KTEAzj3rzDk) — channel `Kyle Friedman`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `routing` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation