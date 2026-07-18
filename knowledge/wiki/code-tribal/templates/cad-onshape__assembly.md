---
title: "CAD function template — onshape / assembly"
software: onshape
function: assembly
source: video-tribal-aggregation
tip_count: 3
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — onshape / assembly

**Software:** `onshape` · **Function category:** `assembly`
**Source:** aggregated from 3 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <assembly> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.43)

> the gear mate relation relates two mates with a revolute degree of Freedom when one component is rotated the other also

the gear mate relation relates two mates with a revolute degree of Freedom when one component is rotated the other also rotates the magnitude of the resulting rotation is dependent on the gear ratio defined within the gear defined within the gear defined within the gear relation to define a gear relation there must be two components in an assembly defined with a mate that allows a rotational degree of Freedom this includes the revolute mate cylindrical mate planer mate pin slot mate mate or the parallel mate select the gear relation and specify which two mates should be related by the gear

_Signals: toolpath:1 · howto:3_

_Source: [Gear Mate Relation](https://www.youtube.com/watch?v=X-Qk3VlCDPo) — channel `Onshape`_

### Tip 2 (confidence 0.41)

> so what I did was do a create a series of features where I would create a mate connector on a reference surface like the

so what I did was do a create a series of features where I would create a mate connector on a reference surface like the bottom of this stub of wire and as you can see here there's a mate connector there and then I would create another one uh on some sort of routing along the way maybe it uh you can see here I offset that Surface by 1 mm and I've put a mate connector right there on the edge of it um and so in this method I'm creating a bunch of mate connectors and actually I'll roll back to here you can see those mate connectors all there's one two three mate connectors which constitute the

_Signals: params:1 · howto:3_

_Source: [Using Onshape's new Routing curve for various 3D curve workflows](https://www.youtube.com/watch?v=8shIxZ4eBXQ) — channel `Greg Brown - Onshape`_

### Tip 3 (confidence 0.4)

> [Music] [Music] so in our last video we brought components together from different parts Studios into an on-shape assemb

[Music] [Music] so in our last video we brought components together from different parts Studios into an on-shape assembly now we're ready to create mates between these components so we can establish Dynamic assembly motion meaning we want the lid to hinge open and closed at 90 degrees now mates work a little differently in on shape than they did in SolidWorks in SolidWorks what we would do is select two faces and mate them together well in on shape things work a little bit differently because we utilize what are known as mate connectors now a mate connector is kind of like a coordinate system

_Signals: params:1 · howto:2_

_Source: [SW Expert Explores Mate Connectors](https://www.youtube.com/watch?v=TBWLGuLl5Nk) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `assembly` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation