---
title: "CAD function template — solidworks / data-management"
software: solidworks
function: data-management
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — solidworks / data-management

**Software:** `solidworks` · **Function category:** `data-management`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <data-management> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.4)

> Speaker 1: Hi and welcome my name's Tom and today we'll be looking at how to get started with SOLIDWORKS CAM

Speaker 1: Hi and welcome my name's Tom and today we'll be looking at how to get started with SOLIDWORKS CAM. SOLIDWORKS CAM is kept directly with inside SOLIDWORKS and you can see we have an added tree and toolbar to help us do CAM upon our CAD models. For the toolbar you can see, we have buttons from left to right, and the workflow is very much working from left to right from definement machine to post-processing at the bottom in the tree we have what's called the CAM feature tree. This is where SOLIDWORKS CAM will recognize features from your model at an apply a tool path to them.

_Signals: toolpath:1_

_Source: [Getting Started with SOLIDWORKS CAM - Part 1](https://www.youtube.com/watch?v=2-SvDm4eZpc) — channel `TriMech Group`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `data-management` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation