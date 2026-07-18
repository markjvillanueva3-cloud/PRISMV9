---
title: "CAD function template — generic / feature-recog"
software: generic
function: feature-recog
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — generic / feature-recog

**Software:** `generic` · **Function category:** `feature-recog`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <feature-recog> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.4)

> use another interactive feature right and you'll see here why in just a bit but i'm going to go ahead and actually use a

use another interactive feature right and you'll see here why in just a bit but i'm going to go ahead and actually use a pocket operation for this one right so this is a critical feature i want to go ahead and pour for this uh for this hole out for this hole out for this hole out and what i'm going to do is i'm actually going to use the going to use the going to use the the feature recognition capabilities the feature recognition capabilities the feature recognition capabilities within the software right so i still want to extract the information with the feature recognition that's built into

_Signals: toolpath:1_

_Source: [Reverse Engineering with Autodesk Manufacturing Technology](https://www.youtube.com/watch?v=rHhcNLa4foo) — channel `KETIV Technologies`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `feature-recog` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation