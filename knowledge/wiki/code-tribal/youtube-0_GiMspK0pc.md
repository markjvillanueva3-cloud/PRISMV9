---
title: "Troubleshoot your lathe G71 and G72 roughing cycles quickly – Haas Automation Tip of the Day"
domain: lathe
source: youtube
videoId: 0_GiMspK0pc
url: https://www.youtube.com/watch?v=0_GiMspK0pc
channel: "Haas Automation, Inc."
duration_s: 396
tribal_entries: 7
chunks_scanned: 9
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Troubleshoot your lathe G71 and G72 roughing cycles quickly – Haas Automation Tip of the Day

**Channel:** [Haas Automation, Inc.](https://www.youtube.com/watch?v=0_GiMspK0pc)
**Duration:** 6m 36s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 9 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.5

> - Hello, and welcome to another Haas tip of the day

- Hello, and welcome to another Haas tip of the day. Now, if you're a Haas Lathe programmer, then today's video is for you. We're gonna talk about our G71 and G72 roughing cycles, and give you a few tips on how to troubleshoot those cycles, things that you probably haven't heard of before. I've written an OD roughing cycle program using a G71, and I'm gonna run this in graphics. Now, as soon as it reached the G71 line, I got an alarm, a non-monotonic alarm. What does that mean, and how do we fix it? Well, non-monotonic just means that it's not monotone. A robot speaks in a monotone voice.

_Signals: gcode:4_

### Tip 2 — confidence 0.43

> I am a robot

I am a robot. Right, the voice doesn't go up. It doesn't go down. The pitch is always moving in one direction. If you were speaking in a not monotone voice, your voice wouldn't be going up and down normally. As far as machining goes, we can think of it in the same way. If something is monotone, or monotonic, our tool is always gonna move in the same direction. In this example, our tool is always gonna move in the Z negative direction, and the X positive direction. It's monotone, monotonic. A different type of roughing cycle would be non-monotonic.

_Signals: safety:3_

### Tip 3 — confidence 0.54

> Here's the trick: You're gonna go into edit mode, and we're gonna change, just for testing purposes, our G71 into a G70

Here's the trick: You're gonna go into edit mode, and we're gonna change, just for testing purposes, our G71 into a G70. G70 is finish contour cycle, and it doesn't have the limitations that G71 and G72 cycles have. This means that I'm able to run that cycle in graphics. It just ran through fine, and just like we saw on our board, we can tell that this is a non-monotonic cycle. My tool is coming up, and then down, and then back up again as it creates a groove on my part.

_Signals: toolpath:1 · camOps:1 · gcode:5 · howto:1_

### Tip 4 — confidence 0.46

> We can now see that our x axis is changing direction, which means we need to tell the control to use a type two roughing

We can now see that our x axis is changing direction, which means we need to tell the control to use a type two roughing cycle. Let's look at the code here. Our G71 P and Q values define the contour subroutine that the roughing cycle is gonna use. The P value refers to the starting block line, and our Q value refers to our ending block. If we only are using an X or a Z value on our starting block, one or the other, the control is gonna default to a type one cycle. To command a type two cycle, we must command both an X and a Z value on our starting block.

_Signals: toolpath:1 · gcode:1 · howto:1_

### Tip 5 — confidence 0.61

> Let's go ahead and change that G70 back to a G71 roughing cycle, and we'll run this in graphics

Let's go ahead and change that G70 back to a G71 roughing cycle, and we'll run this in graphics. There we go. This program gave us a non-monotonic alarm, then we changed it from G71 to a G70 so we could diagnose the problem, so we could see that contour. Once we realized that our X axis was changing directions, we needed to make sure that we were running a type two cycle. To force the control into a type two cycle, we added a Z value to our starting block in our G71 contour. What if we were already running a type two cycle but still getting a non-monotonic alarm? What do we do then?

_Signals: toolpath:2 · gcode:5 · howto:1_

### Tip 6 — confidence 0.53

> We're gonna start with the same premise

We're gonna start with the same premise. I can't fix what I can't see, so we're gonna change that G71 into a G70 cycle, and rerun this in graphics. Okay, I can see my problem right away. I've got a giant Mickey Mouse ear where there should be a groove. What's happened, is I've used a G3 arc instead of a G2 arc, so let's go ahead and edit our program. I'm gonna change this G3 into a G2, fixing my mistake, and while I'm here, I'm gonna change that G70 back into a G71. With those changes made, we'll run this in graphics, and see what we get. That's it, problem solved.

_Signals: gcode:8 · howto:3_

### Tip 7 — confidence 0.5

> Remember, if you're having a problem with your G71 or G72 roughing cycle, switch it over to a G70 temporarily so you can

Remember, if you're having a problem with your G71 or G72 roughing cycle, switch it over to a G70 temporarily so you can view this thing in graphics, until you can find the problem. If you're getting a non-monotonic alarm, make sure that you've got both an X and a Z on that starting block to force it into a type two cycle. For more information on G71 and G72 cycles, download the Haas Lathe Manual. We also have a nice lathe programming workbook. Both of those can be found on the Hass DIY site, diy.HaasCNC.com. That's it, and thanks for watching this Haas tip of the day.

_Signals: gcode:5_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-0_GiMspK0pc-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/0_GiMspK0pc.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].