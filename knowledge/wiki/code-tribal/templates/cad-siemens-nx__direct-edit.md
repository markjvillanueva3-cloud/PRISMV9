---
title: "CAD function template — siemens-nx / direct-edit"
software: siemens-nx
function: direct-edit
source: video-tribal-aggregation
tip_count: 3
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / direct-edit

**Software:** `siemens-nx` · **Function category:** `direct-edit`
**Source:** aggregated from 3 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <direct-edit> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.48)

> solid body and then click okay the promoted CAE model is now Associated to the history in the master part if the master

solid body and then click okay the promoted CAE model is now Associated to the history in the master part if the master part is updated NX also updates the promoted body in the idealized part next turn on the synchronous modeling synchronous modeling synchronous modeling toolbar from the synchronous modeling toolbar select move face this command moves a set of faces adjusting related faces accordingly click the settings tab the face finder automatically selects faces that are related to the faces that you select it uses a set of search criteria to find the related faces turn on the select Co

_Signals: camOps:2 · howto:7_

_Source: [NX CAE Tips and Tricks - Direct Editing](https://www.youtube.com/watch?v=VJEMzA3NBvI) — channel `GMSystem2001`_

### Tip 2 (confidence 0.45)

> tools have the right tool numbers they don't so I'll Define the tool numbers now all the tools are defined with the tool

tools have the right tool numbers they don't so I'll Define the tool numbers now all the tools are defined with the tool numbers so now we are good to go to create our first tool create our first tool create our first tool path now let's hide the blank for Simplicity purpose so we will go to the part Navigator and hide the bounding body notice that the other bodies are imported these are coming from our step file so we can ignore them in case we want to make any changes we can do that by going to the geometry Tab and using the synchronous modeling functions to alter or change any type of

_Signals: toolpath:1 · howto:5_

_Source: [Master NX CAM with this Crash Course!](https://www.youtube.com/watch?v=XiSCDtbowXo) — channel `CAM Learning Partner`_

### Tip 3 (confidence 0.4)

> in this example we will use a synchronous modeling command to lengthen the arms of this model then we will update the ex

in this example we will use a synchronous modeling command to lengthen the arms of this model then we will update the existing mesh to conform to the geometry changes in situations where you do not have permission to modify the master CAD part you can make the geometry changes to the CAE idealized part first load and display the idealized part the master part is an assembly component of the idealized part before we can edit the cat geometry in the idealized part we must create an associative copy of the solid body from the master part in the advanced simulation toolbar click promote select the

_Signals: howto:5_

_Source: [NX CAE Tips and Tricks - Direct Editing](https://www.youtube.com/watch?v=VJEMzA3NBvI) — channel `GMSystem2001`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `direct-edit` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation