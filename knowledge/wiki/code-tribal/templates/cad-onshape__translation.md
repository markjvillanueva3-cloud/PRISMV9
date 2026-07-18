---
title: "CAD function template — onshape / translation"
software: onshape
function: translation
source: video-tribal-aggregation
tip_count: 2
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — onshape / translation

**Software:** `onshape` · **Function category:** `translation`
**Source:** aggregated from 2 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <translation> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 2 by confidence)

### Tip 1 (confidence 0.42)

> hey what's up everybody tutal Toby here and in today's onshape step-by-step tutorial we're going to take a look at a she

hey what's up everybody tutal Toby here and in today's onshape step-by-step tutorial we're going to take a look at a sheet metal challenge so I'm very excited to get into this this challenge comes from the tutall Toby playlist called practice models you can see here that we've got a lot of different practice models to challenge you in the world of 3D CAD but for today we're going to take a look at a sheet metal challenge so let's start the clock here and see how long it takes us to complete this challenge this challenge this challenge now as always what I recommend you do whenever you're

_Signals: camOps:1 · safety:1_

_Source: [Sheet Metal Beginner Tutorial (Angle Bracket)](https://www.youtube.com/watch?v=4rndxiRc0Xc) — channel `Onshape`_

### Tip 2 (confidence 0.41)

> always start with an import for the standard library and declare the version of feature script being used name the featu

always start with an import for the standard library and declare the version of feature script being used name the feature Studio feature Studio feature Studio Cube select new feature at the top to insert the basic framework for a new feature a feature is made up of a function declaration and within it are the precondition ody comments are automatically inserted to direct you to the appropriate areas for customization you can delete them or leave them The annotation contains the name of the feature name it Cube the constant contains the custom feat features internal name as well as defined

_Signals: safety:1 · howto:2_

_Source: [Introduction to Featurescript](https://www.youtube.com/watch?v=JOyQ9LfpuY8) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `translation` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation