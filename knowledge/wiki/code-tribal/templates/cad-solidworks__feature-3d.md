---
title: "CAD function template — solidworks / feature-3d"
software: solidworks
function: feature-3d
source: video-tribal-aggregation
tip_count: 5
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — solidworks / feature-3d

**Software:** `solidworks` · **Function category:** `feature-3d`
**Source:** aggregated from 5 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <feature-3d> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 5 by confidence)

### Tip 1 (confidence 0.5)

> time I am going to select these two holes and depth make let us say 10 millimeter it will be more visible that's why I k

time I am going to select these two holes and depth make let us say 10 millimeter it will be more visible that's why I keep 10 millimeter say OK again I am going to select sketch to extruded cut and in selected Contour I am going to choose this time this hole and make end condition through all the last operation select the last operation select the last operation select oh sorry oh sorry oh sorry excluded cut excluded cut excluded cut selected Contour this time I am going to choose this one choose this one choose this one 20 millimeter say ok now that's perfect now that's perfect now if I

_Signals: toolpath:2 · howto:5_

_Source: [SolidWorks CAM introduction Exercise-1 Mill Operation](https://www.youtube.com/watch?v=GMZO7nGZHHQ) — channel `CAD CAM TUTORIAL BY MAHTABALAM`_

### Tip 2 (confidence 0.49)

> issues with this one issues with this one we still have some material on the top of this part right because we have to a

issues with this one issues with this one we still have some material on the top of this part right because we have to add a facing operation add a facing operation add a facing operation and the the elephant in the room is it didn't cut out this big hole here so we're going to have to add in an operation for that as well so let's go ahead and start addressing these uh these uh these uh one by one and then we'll add in those missing tool paths so for this rough this rough this rough uh outside contour we're going to edit that that that definition and the first thing we're going to do is we're

_Signals: toolpath:1 · camOps:3_

_Source: [SOLIDWORKS CAM: TOOL CHANGES AND ADDING TOOL PATHS](https://www.youtube.com/watch?v=-CJtW6ORjDw) — channel `Professor Cameron`_

### Tip 3 (confidence 0.46)

> fillet we considered corner fillet we considered corner fillet we considered five millimeter okay okay look simply we ca

fillet we considered corner fillet we considered corner fillet we considered five millimeter okay okay look simply we can mirror this mirror mirror mirror let's say front let's say front let's say front and choose this and choose this and choose this ok ok ok again activate mirror tool again activate mirror tool again activate mirror tool now the reference plane i am going to choose right plane choose right plane choose right plane now bodies to mirror i am separately choose both choose both choose both selected here bodies to mirror say ok and thats it click here and here select extruded

_Signals: camOps:3 · howto:2_

_Source: [Solidworks Weldments Structural member, Trim/Extend, End Cap & Gusset](https://www.youtube.com/watch?v=u1esUuvivoo) — channel `CAD CAM TUTORIAL BY MAHTABALAM`_

### Tip 4 (confidence 0.43)

> now here you do not need to define anything say ok anything say ok anything say ok now the problem is pipe goes inside y

now here you do not need to define anything say ok anything say ok anything say ok now the problem is pipe goes inside you will see here so we have to trim click trim and extend click trim and extend click trim and extend keep this one as it is bodies to be trimmed trimmed trimmed so which bodies we want to trim select the body one select the body one select the body one two two two three three three four four four now here select boundary now here select boundary now here select boundary body these are the boundaries because this is going to cut up to this body ok ok now here comes down here

_Signals: howto:10_

_Source: [Solidworks Weldments Structural member, Trim/Extend, End Cap & Gusset](https://www.youtube.com/watch?v=u1esUuvivoo) — channel `CAD CAM TUTORIAL BY MAHTABALAM`_

### Tip 5 (confidence 0.41)

> number of tools which is available in your station now if you come down available to cry there are three are three are t

number of tools which is available in your station now if you come down available to cry there are three are three are three in each station there is 20 number of tools tools tools even though parallelly you can add tools remove tool edit tools or update tool list list list make sure your cutting tool always be smaller than the hole size but this is this all system going to be automatically in a post processor here you have to Define your machine your SolidWorks cam does not do not know the machine so you must Define by default it's already selected mil tutorial fun hook type hook type hook

_Signals: safety:1 · howto:2_

_Source: [SolidWorks CAM introduction Exercise-1 Mill Operation](https://www.youtube.com/watch?v=GMZO7nGZHHQ) — channel `CAD CAM TUTORIAL BY MAHTABALAM`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `feature-3d` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation