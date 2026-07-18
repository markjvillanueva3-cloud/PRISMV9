---
title: "CAD function template — solidworks / weldments"
software: solidworks
function: weldments
source: video-tribal-aggregation
tip_count: 5
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — solidworks / weldments

**Software:** `solidworks` · **Function category:** `weldments`
**Source:** aggregated from 5 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <weldments> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 5 by confidence)

### Tip 1 (confidence 0.48)

> Now here two options offset let's say thickness ratio if zero if you keep zero means the wall of this uh end cap and the

Now here two options offset let's say thickness ratio if zero if you keep zero means the wall of this uh end cap and the this one is parallel there is no if you keep you have to keep zero to one let's say one one inside outside see 1 mm thickness of this this this wall if I'm going to select 0.5 see this is going to lie is at up to center of this base thickness. See this is going to extend up to center of this. Okay. But let me select offset and uh I want to extend total 80 mm 10 10 both side. Okay. Offset side. Okay. Offset 15 15 15 reverse 80 15 here 15 here.

_Signals: toolpath:1 · params:2 · howto:2_

_Source: [Designing Frame Structure in SolidWorks Weldments](https://www.youtube.com/watch?v=tKSbA4alkUM) — channel `CAD CAM TUTORIAL BY MAHTABALAM`_

### Tip 2 (confidence 0.47)

> Let's take new exercise in solid works

Let's take new exercise in solid works. Frame structure weldment. Let's design this simple frame in solid works. Now here all dimensions are in millimeter ISO standard square tube. Now we have here one table. Uh this is a uh weldment cut list. You have to see item 1 to six quantity and description. This is the square tube 80 by 80 into 5 mm. Okay. These are the length. Now you will observe these are the parts. Okay. Now this is the 2D drawing. This is top view. This is let's say this is front view and this is side view. Side view let's say 800 mm. And in front view this total length 1,000 mm.

_Signals: camOps:1 · params:3_

_Source: [Designing Frame Structure in SolidWorks Weldments](https://www.youtube.com/watch?v=tKSbA4alkUM) — channel `CAD CAM TUTORIAL BY MAHTABALAM`_

### Tip 3 (confidence 0.42)

> sure I click here on options go to system options click on file locations and then I'll go to the filter and adjust it s

sure I click here on options go to system options click on file locations and then I'll go to the filter and adjust it so that I can only see the Wellman profiles and then I have correct location where it's going to be reference so I'll click OK so now click on the structural member and again the standard I can either use ISO NC inch I went ahead and modify the name so it doesn't get pickup another folder so I'll go ahead and select the NC inch then the type is going to be called aluminum round tube so there it is for the size that can either use previous ones that I've selected or I can

_Signals: howto:7_

_Source: [Get Started with Weldments in SOLIDWORKS](https://www.youtube.com/watch?v=mruur6CUrQ0) — channel `Hawk Ridge Systems`_

### Tip 4 (confidence 0.4)

> weldments Texas my Wellman's all I do is just right click here on any one of the tabs on the command manager and click w

weldments Texas my Wellman's all I do is just right click here on any one of the tabs on the command manager and click where it says Wellman's now that it's active I can either just create a 3 sketch from there which I won't be doing but I can use the weldment which is gonna put it in weldment mode here and make sure that anybody that's used will not be merged so mergers all will be unchecked and also instead of a solid bodies folder we will have a cut list that keeps track of all the tubes that we're going to be using so go ahead and click on load men now I can click on structural member but

_Signals: howto:5_

_Source: [Get Started with Weldments in SOLIDWORKS](https://www.youtube.com/watch?v=mruur6CUrQ0) — channel `Hawk Ridge Systems`_

### Tip 5 (confidence 0.4)

> to be a feather weld bead and the size is going to be 1/8 and I'll just put it here so there I've added one will be let'

to be a feather weld bead and the size is going to be 1/8 and I'll just put it here so there I've added one will be let's see if I can have one here perfect have one here perfect have one here perfect so now after adding that what I'm gonna do is I can click OK and I can also define the weld symbol if I like using the ANSI weld symbol box and have access to change the contours to let people know that this might be flat convinced or concave change the finishing method right let them know and of course put my weld symbols here we're gonna leave it at fill it so I'll just click OK then I can

_Signals: howto:5_

_Source: [Get Started with Weldments in SOLIDWORKS](https://www.youtube.com/watch?v=mruur6CUrQ0) — channel `Hawk Ridge Systems`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `weldments` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation