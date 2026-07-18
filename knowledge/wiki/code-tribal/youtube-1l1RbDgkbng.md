---
title: "Automate Using Your Probe! Make the Most of Your Probe with Macros – Haas Automation Tip of the Day"
domain: general
source: youtube
videoId: 1l1RbDgkbng
url: https://www.youtube.com/watch?v=1l1RbDgkbng
channel: "Haas Automation, Inc."
duration_s: 848
tribal_entries: 9
chunks_scanned: 24
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Automate Using Your Probe! Make the Most of Your Probe with Macros – Haas Automation Tip of the Day

**Channel:** [Haas Automation, Inc.](https://www.youtube.com/watch?v=1l1RbDgkbng)
**Duration:** 14m 8s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 9 of 24 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.49

> Now, if you're tightening up those tools by hand

Now, if you're tightening up those tools by hand... This is really an "introduction to macros" video disguised as a "probe your part and adjust your tool offset" video. Walking through this one example, will really give us an idea of how macros work on our Haas mill and lathe. Here's our application. We have a part with a 1.3 inch bore in it, that needs to be held to plus or minus one thousandths of an inch. I want the machine to probe that bore, and adjust my tool for me, keeping us right in the middle of our tolerance.

_Signals: camOps:3 · params:1 · howto:2_

### Tip 2 — confidence 0.53

> Now, we'll also want to have the machine alarm out if that part is bad, If that bore is oversize

Now, we'll also want to have the machine alarm out if that part is bad, If that bore is oversize. Now, this kind of use of probing in macros is the first step towards lights out machining towards automation. Here's the start of our code. It starts with an O number and it ends with an M30. So far , so good. After my M30, I've stuffed in a few subprograms When we run this first line of code, M97, P1000, it's gonna call up subprgram N1000. P1000 and 1000. When it's done running this subprogram it'll reach the M99 and go back to our main program.

_Signals: camOps:1 · gcode:4_

### Tip 3 — confidence 0.55

> This subprogram conatins all the G Code needed to finish mill that 1

This subprogram conatins all the G Code needed to finish mill that 1.3 inch bore. Got it! Our finish pass is in a subporgram that we can call up anytime that we'd like. Now, if that doesn't make complete sense, we've got you covered. We've made an entire video on M97 subprograms and we've linked to it in the dsecription of this video. Not only that, but whenever you see this icon it means that we've made another video that dives deep into the topic that we're just glossing over right now in this video.

_Signals: camOps:4 · params:1 · gcode:1_

### Tip 4 — confidence 0.54

> So, M97 subprogram for my finish pass The next code that we'll add to our example program is a G103 P1

So, M97 subprogram for my finish pass The next code that we'll add to our example program is a G103 P1. This code limits LOOKAHEAD. Now , I placed this carefully after all of our machining was done. But' prior to our probing in macro statements. If you block LOOKAHEAD during your machining you might actually get some choppy motions. LOOKAHEAD is fantastic for high speed machining, it can see the turn in the road coming a mile down the way, or it knows that there's no turn coming and it can keep it's foot no the gas.

_Signals: camOps:3 · gcode:2_

### Tip 5 — confidence 0.48

> So, LOOKAHEAD is great for machining, but, when it comes to probing and macro statments it might cause us to evaluate so

So, LOOKAHEAD is great for machining, but, when it comes to probing and macro statments it might cause us to evaluate some type of macro statement too early. So, we want to block LOOKAHEAD during our macro statements. This M97 call, M97 P2000 calls up our probing subprograms. Contains all the code needed to probe our part. It's gonna probe the part and write that bore diameter right into variable on eighty eight. Now, all of the probing variables are listed in the Renishaw Inspection Plus manual. And we've made an entire video on that, so, check it out.

_Signals: camOps:1 · gcode:2_

### Tip 6 — confidence 0.4

> So if you see a pound one through a pound thirty-three in a program somewhere, it's likely being used with a G65, to con

So if you see a pound one through a pound thirty-three in a program somewhere, it's likely being used with a G65, to convey information from a main program to a macro subprogram, or used with some kind of alias G code. Now this is good stuff. It's a great topic, but not a topic for today. For more information on local variables, check out G65 in your manual. Right now, we're gonna look at our global variables. Global variables are what we're gonna be using today with our custom macro.

_Signals: gcode:2_

### Tip 7 — confidence 0.4

> These next few lines will read my probe diameter and adjust my tool diameter wear offset, making use of global and syste

These next few lines will read my probe diameter and adjust my tool diameter wear offset, making use of global and system macro variables. Now those are big words, but we're statin to sound like macro programmers. Now, I'm storing my target bore diameter in global variable pound one hundred. Pound one hundred equals one point three and we know that pound one hundred is just a global variable that I'm using to store some information in. Pound one hundred is being set to one point three in my program.

_Signals: camOps:1 · howto:2_

### Tip 8 — confidence 0.42

> That is my ideal target bore size one point three minus my actual probed bore size, one point two nine nine five

That is my ideal target bore size one point three minus my actual probed bore size, one point two nine nine five. That leaves us with a variance of minus point zero zero zero five. That's how much we have to adjust this tool to get us back in the center of our tolerance. The next line, pound twenty six oh six, this is what we talked about on the great big board. Pound twenty six oh one through pound twenty eight hundred directly relates to the diameter wear comumn on our tool offset page. For all two hundred offsets.

_Signals: camOps:2 · howto:1_

### Tip 9 — confidence 0.4

> Pound twenty six oh one would be tool offset one diameter wear, pound twenty six oh two would be tool offset 2 diameter 

Pound twenty six oh one would be tool offset one diameter wear, pound twenty six oh two would be tool offset 2 diameter wear, pound twenty six oh six relates to the tool 6 diameter wear position. I milled out this bore with a half inch ball nose in tool six. This is the one that we wanna adjust, twenty six oh six. Twenty six oh six equals pound twenty six oh six minus my variance pound one oh one minus a half fowl. So, every time a part is run, the control is gonna make small adjustments for us keeping us right in the middle of our specs. Well, we accomplished what we set out to do .

_Signals: camOps:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-1l1RbDgkbng-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/1l1RbDgkbng.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].