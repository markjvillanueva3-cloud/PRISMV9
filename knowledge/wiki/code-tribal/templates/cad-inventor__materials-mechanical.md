---
title: "CAD function template — inventor / materials-mechanical"
software: inventor
function: materials-mechanical
source: video-tribal-aggregation
tip_count: 3
videos_covered: 2
generated_at: 2026-05-27
---

# CAD function template — inventor / materials-mechanical

**Software:** `inventor` · **Function category:** `materials-mechanical`
**Source:** aggregated from 3 video tribal tips across 2 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <materials-mechanical> in <inventor>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 3 by confidence)

### Tip 1 (confidence 0.45)

> So I'm not going to allow it to mirror this time because I discovered that was a problem

So I'm not going to allow it to mirror this time because I discovered that was a problem. Um, problem. Um, problem. Um, not sure what bind does, but uh, you're you can allow rotating 90 degrees, 180 degrees, 270 degrees. Um, or I could probably type in whatever else I wanted. Um, so you got all these different options. I'm going to say okay because I'm just doing one of each. So now I need to tell it what size of material I have. have. have. So to do that, I'm going to go over here to processes or material library. So you come in here, you click on packaging.

_Signals: params:3 · howto:1_

_Source: [Autodesk Inventor CAM 2021 Ultimate Tutorial.  How to Create a Toolpath For a CNC Plasma Cutter.](https://www.youtube.com/watch?v=WICMnnJvbh8) — channel `Beck Tools`_

### Tip 2 (confidence 0.42)

> that we need to do is we need to do the PIN for each item so in this case if I want to set up the PIN you just need to o

that we need to do is we need to do the PIN for each item so in this case if I want to set up the PIN you just need to open the specific folder file folder file folder file okay so you can look on your 3D model tab let it see this hardness with this pin features pin features pin features so a certain PC these buttons are not available available available okay so this hardness panel will be not appeared so the main reason why because of you not tick on this area so you just need to turn on this hardness later you will see this hardness speed so for this case I will like to do few pins in here

_Signals: camOps:2 · howto:1_

_Source: [Autodesk Inventor - Wire Modelling for Control Panel](https://www.youtube.com/watch?v=jk9wEgNzRtI) — channel `Acad Systems Sdn Bhd`_

### Tip 3 (confidence 0.41)

> like this edit so this one 3D rotate hit right click OK first and then click cable hardness hardness hardness okay so th

like this edit so this one 3D rotate hit right click OK first and then click cable hardness hardness hardness okay so the the basically the segment will be automatically update depends on your size your size your size depends on all your size wire it will automatically update the diameter so to check the diameter go to this display custom change to anything and then go back to the render display so now you will see that this will be the actual size later so as long as the radius is between the trunking means your wire still can be able move along to this trunking so that will be okay that

_Signals: camOps:1 · howto:3_

_Source: [Autodesk Inventor - Wire Modelling for Control Panel](https://www.youtube.com/watch?v=jk9wEgNzRtI) — channel `Acad Systems Sdn Bhd`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `materials-mechanical` operations in `inventor`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation