---
title: "CAD function template — onshape / direct-edit"
software: onshape
function: direct-edit
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — onshape / direct-edit

**Software:** `onshape` · **Function category:** `direct-edit`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <direct-edit> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.47)

> editing functionalities can be found in the toolbar here they are intuitive and easy to use but are incredibly powerful

editing functionalities can be found in the toolbar here they are intuitive and easy to use but are incredibly powerful when working with imported geometries imported geometries imported geometries the first functionality is modify fillet which you can use to change the fillet radius or completely delete fillets out of a model next to remove holes or Pockets I can use the delete face use the delete face use the delete face returning to the original geometry I can also use this functionality to remove the pockets and have an opening going through with the move face feature I can increase or

_Signals: camOps:2 · howto:6_

_Source: [How to Import and Edit STEP, IGES, Parasolid, STL Files in Onshape - Tech Tip](https://www.youtube.com/watch?v=zzfqk7uauFk) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `direct-edit` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation