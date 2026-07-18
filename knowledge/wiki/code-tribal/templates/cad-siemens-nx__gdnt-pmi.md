---
title: "CAD function template — siemens-nx / gdnt-pmi"
software: siemens-nx
function: gdnt-pmi
source: video-tribal-aggregation
tip_count: 5
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — siemens-nx / gdnt-pmi

**Software:** `siemens-nx` · **Function category:** `gdnt-pmi`
**Source:** aggregated from 5 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <gdnt-pmi> in <siemens-nx>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 5 by confidence)

### Tip 1 (confidence 0.6)

> these allow your tool path points to go inside the part or outside the part so if it is balanced then it mostly means th

these allow your tool path points to go inside the part or outside the part so if it is balanced then it mostly means that your tool path point will each tool path point will basically vary between a certain tolerance rate range so obviously the tool pads are calculated on mesh in many cases and there there is a tolerance that comes into play so this tolerance helps you to control to a larger extent the accuracy of your tool path obviously you can you would not want to make it one micron otherwise your tool path will take so much time to generate so let's go back and get let's go to the

_Signals: toolpath:5_

_Source: [Master NX CAM with this Crash Course!](https://www.youtube.com/watch?v=XiSCDtbowXo) — channel `CAM Learning Partner`_

### Tip 2 (confidence 0.51)

> turn a visual reporting option on to see exactly what stock makes up your frame let's have a look we have the start of o

turn a visual reporting option on to see exactly what stock makes up your frame let's have a look we have the start of our machine with the key components in the correct location now it's time to create a frame to maintain those positions creating the initial cage is as simple as three clicks adding interior elements can be done by copying or moving existing elements we'll copy the base elements to meet the machine's transport frame snapping to existing geometry will guarantee fit and position later when we create 3D create 3D create 3D members we'll move these elements into position by using

_Signals: camOps:4 · howto:4_

_Source: [NX Structure Designer - Webinar](https://www.youtube.com/watch?v=dc01FU7ErxY) — channel `Emixa Industry Solutions`_

### Tip 3 (confidence 0.51)

> you create your operation then you you have options to choose any strategy that NX tells you would be the best fit so it

you create your operation then you you have options to choose any strategy that NX tells you would be the best fit so it predicts your behavior inside NX cam how you use the application and it tells you what would be the most probable strategy that you may want to you may want to you may want to cues and then you have additional actions such as generating your tool path checking your tool path for any collisions or gouch validation report verification of the tool path simulation postprocessing and then many other functions that we will take a look at in the later part of the videos on the

_Signals: toolpath:3 · howto:1_

_Source: [Master NX CAM with this Crash Course!](https://www.youtube.com/watch?v=XiSCDtbowXo) — channel `CAM Learning Partner`_

### Tip 4 (confidence 0.41)

> particular rule identify uh select the datum a primary data and click on okay and it will go out and create all the posi

particular rule identify uh select the datum a primary data and click on okay and it will go out and create all the positional tolerances for all the holes it finds on this part again it's using feature recognition to locate the size of those holes and then group them uh individually and Define patterns for the holes so in the end I will have all of the PMI that gets created and you can see if I click on this PMI it's identified six holes and applied a positional tolerance Based on data a and I can go in and select any one of these this is really just PMI so at the end of the day when I

_Signals: howto:6_

_Source: [NX1953 NX MBD   Automated PMI Authoring / NX1953: Reguły MBD w PMI](https://www.youtube.com/watch?v=LsCLMkQXRSc) — channel `GMSystem2001`_

### Tip 5 (confidence 0.4)

> now we're ready to create drawings NX supports tradition drawings with automatic view creation dimensions and parts list

now we're ready to create drawings NX supports tradition drawings with automatic view creation dimensions and parts list however let's see if we can't expedite that process We'll add PMI Dimensions directly on the model and create a 3D PDF document we'll start with ordinate dimensions on the left view we'll only need to add overall and location Dimensions since the parts will have been cut to length PMI in NX is smart enough to associate these Dimensions with the correct view plane then later during viewing recalling that view shows these dimensions dimensions dimensions we'll repeat this

_Signals: camOps:1 · howto:2_

_Source: [NX Structure Designer - Webinar](https://www.youtube.com/watch?v=dc01FU7ErxY) — channel `Emixa Industry Solutions`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `gdnt-pmi` operations in `siemens-nx`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation