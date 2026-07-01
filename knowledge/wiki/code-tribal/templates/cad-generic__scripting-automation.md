---
title: "CAD function template — generic / scripting-automation"
software: generic
function: scripting-automation
source: video-tribal-aggregation
tip_count: 7
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — generic / scripting-automation

**Software:** `generic` · **Function category:** `scripting-automation`
**Source:** aggregated from 7 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <scripting-automation> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 7 by confidence)

### Tip 1 (confidence 0.54)

> So, M97 subprogram for my finish pass The next code that we'll add to our example program is a G103 P1

So, M97 subprogram for my finish pass The next code that we'll add to our example program is a G103 P1. This code limits LOOKAHEAD. Now , I placed this carefully after all of our machining was done. But' prior to our probing in macro statements. If you block LOOKAHEAD during your machining you might actually get some choppy motions. LOOKAHEAD is fantastic for high speed machining, it can see the turn in the road coming a mile down the way, or it knows that there's no turn coming and it can keep it's foot no the gas.

_Signals: camOps:3 · gcode:2_

_Source: [Automate Using Your Probe! Make the Most of Your Probe with Macros – Haas Automation Tip of the Day](https://www.youtube.com/watch?v=1l1RbDgkbng) — channel `Haas Automation, Inc.`_

### Tip 2 (confidence 0.48)

> So, LOOKAHEAD is great for machining, but, when it comes to probing and macro statments it might cause us to evaluate so

So, LOOKAHEAD is great for machining, but, when it comes to probing and macro statments it might cause us to evaluate some type of macro statement too early. So, we want to block LOOKAHEAD during our macro statements. This M97 call, M97 P2000 calls up our probing subprograms. Contains all the code needed to probe our part. It's gonna probe the part and write that bore diameter right into variable on eighty eight. Now, all of the probing variables are listed in the Renishaw Inspection Plus manual. And we've made an entire video on that, so, check it out.

_Signals: camOps:1 · gcode:2_

_Source: [Automate Using Your Probe! Make the Most of Your Probe with Macros – Haas Automation Tip of the Day](https://www.youtube.com/watch?v=1l1RbDgkbng) — channel `Haas Automation, Inc.`_

### Tip 3 (confidence 0.44)

> our subprogram pulled something off of a shelf and that shelf was empty it could crash our could crash our could crash o

our subprogram pulled something off of a shelf and that shelf was empty it could crash our could crash our could crash our program a lot of times my subprograms all write a macro statement to make sure that somebody wrote something to that shelf location an if statement if pound 4 equals pound 0 then and pound 3000 equals 10 alarm out pound 3000 is a macro statement that we can create our own own own alarm pound zero is a really unique variable it's not a variable it's not a variable it's not a regular local variable it's not 1 through 33 pound zero is not a number and you can see that in

_Signals: safety:3 · howto:1_

_Source: [The Essential Macro Video - Intro to CNC Macros and Subprograms - Haas Tip of the Day](https://www.youtube.com/watch?v=ZLW_MX5_NIM) — channel `Haas Automation, Inc.`_

### Tip 4 (confidence 0.43)

> press m-19 I watch orient and I load this tool the probe into the spindle and I always always load it with the Haas logo

press m-19 I watch orient and I load this tool the probe into the spindle and I always always load it with the Haas logo towards me towards the operator now why is this manner because at some point this probe is gonna be taken out of the machine you're gonna be changing the batteries where you need an extra extra pot in the machine to put a tool in and when that tool goes back in you want to put it back in the same way you pulled it out because during the calibration process a cycle is run and it decides how far is this probe off center in the X and it puts that value into macro variable five

_Signals: safety:2_

_Source: [Loading Tools? ALWAYS Do This First - Boring Bars and Probes - Haas Tip of the Day](https://www.youtube.com/watch?v=xcfVhNQQVcU) — channel `Haas Automation UK`_

### Tip 5 (confidence 0.41)

> NC program by entering our needed inputs into our g65 macro call our subprogram will have all of the info it needs to up

NC program by entering our needed inputs into our g65 macro call our subprogram will have all of the info it needs to update our tool path and run this part now when we ask to make a longer part all we'll have to do is adjust a variable on our macro call press cycle start and we are Machining the macro sub program makes all of our adjustments for US based on these these these inputs this is very different than an m98 subprogram call those subprograms are written in stone they are immovable they're unchangeable they're only good for one particular feature and again we want to make not one part

_Signals: toolpath:1 · howto:1_

_Source: [The Essential Macro Video - Intro to CNC Macros and Subprograms - Haas Tip of the Day](https://www.youtube.com/watch?v=ZLW_MX5_NIM) — channel `Haas Automation, Inc.`_

### Tip 6 (confidence 0.4)

> So if you see a pound one through a pound thirty-three in a program somewhere, it's likely being used with a G65, to con

So if you see a pound one through a pound thirty-three in a program somewhere, it's likely being used with a G65, to convey information from a main program to a macro subprogram, or used with some kind of alias G code. Now this is good stuff. It's a great topic, but not a topic for today. For more information on local variables, check out G65 in your manual. Right now, we're gonna look at our global variables. Global variables are what we're gonna be using today with our custom macro.

_Signals: gcode:2_

_Source: [Automate Using Your Probe! Make the Most of Your Probe with Macros – Haas Automation Tip of the Day](https://www.youtube.com/watch?v=1l1RbDgkbng) — channel `Haas Automation, Inc.`_

### Tip 7 (confidence 0.4)

> These next few lines will read my probe diameter and adjust my tool diameter wear offset, making use of global and syste

These next few lines will read my probe diameter and adjust my tool diameter wear offset, making use of global and system macro variables. Now those are big words, but we're statin to sound like macro programmers. Now, I'm storing my target bore diameter in global variable pound one hundred. Pound one hundred equals one point three and we know that pound one hundred is just a global variable that I'm using to store some information in. Pound one hundred is being set to one point three in my program.

_Signals: camOps:1 · howto:2_

_Source: [Automate Using Your Probe! Make the Most of Your Probe with Macros – Haas Automation Tip of the Day](https://www.youtube.com/watch?v=1l1RbDgkbng) — channel `Haas Automation, Inc.`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `scripting-automation` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation