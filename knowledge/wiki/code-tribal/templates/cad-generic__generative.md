---
title: "CAD function template — generic / generative"
software: generic
function: generative
source: video-tribal-aggregation
tip_count: 3
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — generic / generative

**Software:** `generic` · **Function category:** `generative`
**Source:** aggregated from 3 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <generative> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.44)

> geometry an obstacle geometry an obstacle offset a starting shape an unassigned geometry and even something called symme

geometry an obstacle geometry an obstacle offset a starting shape an unassigned geometry and even something called symmetry planes planes planes it is important to note with generative design and with many other functionalities inside of fusion 360 it's always a good idea to go into the preview features and take a look at what's available in this case for generative design you can see that we have die casting as a preview functionality as well as experimental generative solvers and features you can always click learn more to be directed to the fusion 360 website and find out more about these

_Signals: safety:2 · howto:1_

_Source: [Preserve geometry](https://www.youtube.com/watch?v=5dam0me3ZoQ) — channel `Learning Expressway`_

### Tip 2 (confidence 0.4)

> in this video we'll navigate to the generative design workspace and we'll select preserve regions select preserve region

in this video we'll navigate to the generative design workspace and we'll select preserve regions select preserve regions select preserve regions in fusion 360 we'll get started with the supplied data set genitive design geometry setup geometry setup geometry setup this contains several different this contains several different this contains several different components including a set of wheels a rear shock motor front suspension even handlebars and headlight handlebars and headlight handlebars and headlight we're going to be using these to help us design a generative design frame in fusion

_Signals: howto:5_

_Source: [Preserve geometry](https://www.youtube.com/watch?v=5dam0me3ZoQ) — channel `Learning Expressway`_

### Tip 3 (confidence 0.4)

> Hi, I'm Tom from Siemens Digital Industry Software

Hi, I'm Tom from Siemens Digital Industry Software. In today's video, we're going to take a deep dive into one of the key themes from this year's NX Premiere: AI-enabled and generative design. Artificial intelligence has been integrated with NX for years. Since 2019, the NX Adaptive User Interface has used AI and machine learning to boost productivity and tailor the NX experience to every user's needs. There's also a wide variety of powerful AI-enabled CAD tools to optimize designs, generate complex geometry and simulate performance.

_Signals: toolpath:1_

_Source: [What's new in NX | June 2024 | AI-enabled and generative design](https://www.youtube.com/watch?v=D9_U2EI0Sdw) — channel `Siemens Software`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `generative` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation