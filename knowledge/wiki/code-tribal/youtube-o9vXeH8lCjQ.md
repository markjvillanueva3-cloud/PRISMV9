---
title: "CNC LATHE PROGRAMMING LESSON 1 - LEARN TO WRITE A G72 CANNED CYCLE FOR FACING ON A CNC LATHE"
domain: lathe
source: youtube
videoId: o9vXeH8lCjQ
url: https://www.youtube.com/watch?v=o9vXeH8lCjQ
channel: "Tom Stikkelman"
duration_s: 477
tribal_entries: 8
chunks_scanned: 10
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# CNC LATHE PROGRAMMING LESSON 1 - LEARN TO WRITE A G72 CANNED CYCLE FOR FACING ON A CNC LATHE

**Channel:** [Tom Stikkelman](https://www.youtube.com/watch?v=o9vXeH8lCjQ)
**Duration:** 7m 57s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 8 of 10 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.43

> Hello, this is Tom Stegelman and welcome to this first lesson of CNC late programming

Hello, this is Tom Stegelman and welcome to this first lesson of CNC late programming. In this lesson, we're going to be covering the G72 can cycle used for rough facing. So, let's see how that's that's that's done. All right, so the first thing I want to do is cover the two axis used on a twoaxis CNC lathe. As you can see, we got the X axis and the Z-axis. Now, the X-axis controls the diameter of the part. You can see the minus and the plus. Obviously, in the minus direction, the part would get smaller. In the plus direction, the part would get larger.

_Signals: camOps:1 · gcode:1_

### Tip 2 — confidence 0.4

> Now, I want you to notice that before you start into the can cycle, you need to position your tool somewhat even with th

Now, I want you to notice that before you start into the can cycle, you need to position your tool somewhat even with the excess material and then 100,000 above the part for a safe clearance plane. So, when we're through writing our G72 code, the operation should look something like this. We take a pass. We back up 50,000. We wrap it back up to our clearance plane until all the excess material is removed, leaving 5,000. And then it kicks out of the can cycle. So, let's take a look at the code and see what it needs to look like to do exactly this operation. All right.

_Signals: gcode:1_

### Tip 3 — confidence 0.45

> So here we're looking at the G72 can cycle used in our previous previous previous illustration

So here we're looking at the G72 can cycle used in our previous previous previous illustration. Now the first thing we need to do is stage our tool in the right position before we start getting into the G72 can cycle. Now we were going to remove 200,000 off the face. So we need to position our tool at 200,000 in front of in front of in front of Z0. And then it starts counting down from 200 down to zero in 40,000 increments. Now the 2 in 200 is the clearance plane that it will wrap back to. And that is a safe clearance plane.

_Signals: gcode:2_

### Tip 4 — confidence 0.4

> Actually, that means it's 100,000 above the surface where it starts the cut

Actually, that means it's 100,000 above the surface where it starts the cut. So the first line of the G72 can cycle is where we tell it how much to take per pass. The W is actually the incremental address for the Z move. So W40 means Z 40,000 passes. Okay. So W is the incremental value of Z. R is the retract plane or retract move after it's through with each pass. And then it remembers where it came from. It remembers that it came from X2 in 200. So that's what it's going to wrap it back up to before it starts the next 40,000 40,000 40,000 pass.

_Signals: gcode:1_

### Tip 5 — confidence 0.46

> Now the second line of the G72 can cycle is where we tell it how much first of all to leave in X

Now the second line of the G72 can cycle is where we tell it how much first of all to leave in X. Now U is the incremental address for the X and we're not leaving any excess material on X. So obviously that is going to need to be zero. Now we do want to leave 5,000 on the face for a finish pass. And so the W meaning the incremental address for Z needs to be at 5,000 meaning that it's going to leave going to leave going to leave 5,000 for a finish pass. Then of course the F is the feed rate that sets the feed rate for this whole can cycle right here on this second line.

_Signals: camOps:2 · gcode:1_

### Tip 6 — confidence 0.45

> Now notice we have a P 100 and a Q102

Now notice we have a P 100 and a Q102. Now those can be numbers like P1 and Q2 or P10 and Q20 as long as they are different. Okay. Now what that looks at is the is the is the P100 refers to the P100 refers to the P100 refers to the N100 and the N100 and the N100 and the Q102 refers to the Q102 refers to the Q102 refers to the N102 down inside the can cycle where the geometry is located. Okay. So the G72 can cycle looks at the first N number and the second N number and looks what is in between those two numbers and does the operation based on the information given in the G72 CAN cycle.

_Signals: gcode:2_

### Tip 7 — confidence 0.43

> So the very first line on the N100 line, you tell it where the can cycle needs to stop or where it needs to finish

So the very first line on the N100 line, you tell it where the can cycle needs to stop or where it needs to finish. So we do that with a go, okay, which means wrap it. And we want to stop at Z0. Now, it also will look at this W value. Okay. So, it doesn't go all the way to Z0 because we have a W of 5,000, but the Z0 is still necessary because otherwise it wouldn't know how much excess to leave. The G1 is actually the end point in X at the very center of the part. And the reason why it's minus.064 064 is because the radius on the tool is a 32,000 radius.

_Signals: camOps:1 · gcode:1_

### Tip 8 — confidence 0.41

> The first in 100 line is where you're going to going to going to end taking in consideration the excess you want to leav

The first in 100 line is where you're going to going to going to end taking in consideration the excess you want to leave. And of course the G1 notice that's a feed line a linear feed line is the pass that it takes from X 2 in 200 to in 200 to in 200 to XUS.064 in a straight line for each pass. All right. So, that's it for this video. If you like what you saw, give me a thumbs up, drop me a comment, and if you haven't subscribed yet, please do so now, and you'll be notified each time I release a new video. So, thanks for watching, and we'll see you in the next one.

_Signals: gcode:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-o9vXeH8lCjQ-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/o9vXeH8lCjQ.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].