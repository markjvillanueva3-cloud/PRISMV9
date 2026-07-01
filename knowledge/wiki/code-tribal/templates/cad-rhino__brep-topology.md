---
title: "CAD function template — rhino / brep-topology"
software: rhino
function: brep-topology
source: video-tribal-aggregation
tip_count: 3
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — rhino / brep-topology

**Software:** `rhino` · **Function category:** `brep-topology`
**Source:** aggregated from 3 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <brep-topology> in <rhino>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.42)

> this was an organic curved surface then if you want to retain the topology turn the lose option on on on so the next ste

this was an organic curved surface then if you want to retain the topology turn the lose option on on on so the next step is basically getting rid of the additional curves so I'm gonna get rid of the let me get rid of these planes we're gonna skip the gonna skip the gonna skip the back one I think yeah keep the back one delete the front one delete the front one delete the front one then keep the front one delete the back one and vice versa okay right I think I've done the opposite maybe I've done the opposite no worries so you will end up with these three curves okay and then we just Loft

_Signals: camOps:1 · howto:4_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

### Tip 2 (confidence 0.42)

> rounded Edge called rounded Edge called rounded Edge so I have applied a fillet to that object in keyshot object in keys

rounded Edge called rounded Edge called rounded Edge so I have applied a fillet to that object in keyshot object in keyshot object in keyshot so as you can see when I set this to zero this is what we imported but you can add subtle fillets can add subtle fillets can add subtle fillets to the corners by adding this number here okay now this is also an optical illusion it's not actually deforming the geometry it's it's kind of blending the mesh vertices and creating that illusion of fillet and that is why you get this weird artifacts on the kind of like different angle okay so you have to be

_Signals: camOps:2 · howto:1_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

### Tip 3 (confidence 0.41)

> duplicating The Edge it's a bit longer process but you can nonetheless do it nonetheless do it nonetheless do it and you

duplicating The Edge it's a bit longer process but you can nonetheless do it nonetheless do it nonetheless do it and you pipe it using the radius of the fillet that you want you split a with B okay okay let me show you and then you blend these two surfaces okay using the continuity criteria and then you can join them together okay so that is how you can add slide fill it okay okay that is another way to do it if the normal fillet doesn't work which in this case is a bit difficult because we are creating a really complex topology um okay so let's see more questions uh loving the way things are

_Signals: camOps:2_

_Source: [Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0](https://www.youtube.com/watch?v=oizjcitoMdM) — channel `Cademy XYZ | Rhino 3D & Grasshopper`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `brep-topology` operations in `rhino`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation