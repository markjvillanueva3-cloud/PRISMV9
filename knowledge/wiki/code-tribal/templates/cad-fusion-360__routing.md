---
title: "CAD function template — fusion-360 / routing"
software: fusion-360
function: routing
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — fusion-360 / routing

**Software:** `fusion-360` · **Function category:** `routing`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <routing> in <fusion-360>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.4)

> So again depending on your part file you could have certain areas you need to make smaller and other areas that you need

So again depending on your part file you could have certain areas you need to make smaller and other areas that you need to make bigger. Good example of that heat shrink um not heat shrink I should say is heat fitting you know bearing races pressed on type of profiles in the same kind of tool path you could break it up you would have two tool paths one using inverse wear and one using normal wear. So again this works really really good on those guys that go and do a minus minus tolerance on your drawing. So let's go ahead and keep going with this.

_Signals: toolpath:1_

_Source: [Turning Tuesday: ⚙️ Mastering the Passes Tab in Autodesk Fusion 360 Lathe Toolpaths](https://www.youtube.com/watch?v=r88wX51bg38) — channel `JIT CAD CAM`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `routing` operations in `fusion-360`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation