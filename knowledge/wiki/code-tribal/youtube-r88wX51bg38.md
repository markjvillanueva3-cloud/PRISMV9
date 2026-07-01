---
title: "Turning Tuesday: ⚙️ Mastering the Passes Tab in Autodesk Fusion 360 Lathe Toolpaths"
domain: lathe
source: youtube
videoId: r88wX51bg38
url: https://www.youtube.com/watch?v=r88wX51bg38
channel: "JIT CAD CAM"
duration_s: 1547
tribal_entries: 23
chunks_scanned: 45
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Turning Tuesday: ⚙️ Mastering the Passes Tab in Autodesk Fusion 360 Lathe Toolpaths

**Channel:** [JIT CAD CAM](https://www.youtube.com/watch?v=r88wX51bg38)
**Duration:** 25m 47s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 23 of 45 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.43

> Good afternoon everybody and we are back again with another turning Tuesday this week where we are going to be covering 

Good afternoon everybody and we are back again with another turning Tuesday this week where we are going to be covering how to go into your passes tab, what is the purpose of the passes tab and how to maximize your efforts inside of Fusion with that passes tab. Now, we're not going to dive very deep into it as we walk through stuff today. However, this is a general overview and starting not next week but in the new year, we are going to be walking through each tool path start to finish versus the individual tabs. Now, some of you out there are probably questioning my facial hair choices.

_Signals: toolpath:1 · camOps:1_

### Tip 2 — confidence 0.44

> So, I'm going to start by jumping over to my turning tab

So, I'm going to start by jumping over to my turning tab. Now, if you guys are looking to follow along with these part files that we use for examples, they can be found inside of the home tab down in the CAM sample area at the bottom of your data panel. Now, let's go ahead and start with one of my favorite tool paths to always show an example with, which is the turning face tool path. Now, again, we've already talked about our tooling. We've talked about what we like to refer to as the wear in Z-axis on the lathe. Then we've also talked about the wear in the Xaxis.

_Signals: toolpath:1 · safety:1_

### Tip 3 — confidence 0.45

> Now lastly, what we're going to do is we're going to jump over to our passes tab

Now lastly, what we're going to do is we're going to jump over to our passes tab. Now from the go, as you guys may or may not know, this might be your first video. We like to start with two different rules. Rule number one, left to right on your tabs and then work down the list before you go to the next tab. Rule number two is when in doubt, just hit okay because it's very hard to troubleshoot a tool path until you get a tool path on your part. As you guys can see, we've now got some color coding to the system. This also will help you with troubleshooting your tool paths.

_Signals: toolpath:2_

### Tip 4 — confidence 0.56

> When we talk about this part in much more detail, as well as doing full-blown tool paths, you'll see there's going to be

When we talk about this part in much more detail, as well as doing full-blown tool paths, you'll see there's going to be a point where we don't even use the facing tool path. But let's go ahead and pivot. So, again, we're going to go ahead and now jump into a turning profile rough. Now, in this case, I do want to go back to my OD roughing tool. And of course, I'm going to hit okay just so that we can get a tool path on the part. And then from there, one additional move I am going to make temporarily is down in my toolbar. I'm going to turn off the linking part of the tool path.

_Signals: toolpath:3 · camOps:2_

### Tip 5 — confidence 0.46

> As you guys can see, let me know if you could see this quite well out there in chat

As you guys can see, let me know if you could see this quite well out there in chat. Um, my blue lines on my part are the passes. This is 100% what we are trying to control. So again, I'm going to go ahead and edit this tool path. Now, you can double leftclick the icon. You can rightclick, edit the tool path, and then we're going to jump to our passes tab. So again, you guys might change the X and Z location. Remember, work through these tabs efficiently. We're just looking at the passes tab from a high level. So as you guys can see, there's quite a few options in here.

_Signals: toolpath:2 · howto:1_

### Tip 6 — confidence 0.47

> If you didn't want to plunge in this area, one thing a lot of people do, this is an old habit, is you turn off grooving 

If you didn't want to plunge in this area, one thing a lot of people do, this is an old habit, is you turn off grooving and you go ahead and hit okay. And now magically, you're not grooving in this area. If you've caught my video last week, actually two weeks ago, the correct way to fix this, which is why I always go back to rule number one, is we should have fixed it when defining our geometry. We should have said groove suppression. Don't go in this groove. And as you guys are going to see, we'll no longer be going inside that groove. So, just keep that in mind.

_Signals: toolpath:1 · camOps:1 · safety:1_

### Tip 7 — confidence 0.4

> As you're going to see now, we have fewer blue lines

As you're going to see now, we have fewer blue lines. They are still retained in that rectangle of X and Z as well. The direction to which we want them. So again, maybe we're going to go horizontal passes. And then I'm going to say both ways. Again, you're not going to see much of a change here, but if I was to turn on my linking moves, you'll notice we have a lot less linking. And that's because we're going to feed in, feed up, out, all the way up, back in, down, and back drag our tool. Again, these are all tricks to start to lower your cycle time.

_Signals: camOps:1 · howto:2_

### Tip 8 — confidence 0.47

> Again, I cannot stress this enough because I get so many questions about it

Again, I cannot stress this enough because I get so many questions about it. is this is all possible because we've defined the where. We're just now defining the how. A few other things that you can get away with. We could skip wall passes. Another common one that I like to do is the use pecking. You guys have never used pecking before. What you could do is turn on points now. And you'll notice, I don't know if you guys can see this, but there's a bunch of black dots now in my tool path, which means we feed in, we retract. working in terrible materials like plastic.

_Signals: toolpath:1 · camOps:1 · safety:1_

### Tip 9 — confidence 0.46

> Again, pecking will cause things to chip break naturally based on our tool path

Again, pecking will cause things to chip break naturally based on our tool path. Now, one one warning to this whole concept, guys, I I feel like I'm beating a dead horse, but as you guys are seeing is I am just controlling how the blue lines are removing material. Right? So, again, we go down a little bit further. As you guys are seeing, we have things like our X and Z. We have the ability to extend our stock as well, depending on what you need to do this. Again, lots of different things to adjust and to define.

_Signals: toolpath:1 · safety:1 · howto:2_

### Tip 10 — confidence 0.43

> Now, from this, let's go ahead and shift gears back over to a finishing tool path

Now, from this, let's go ahead and shift gears back over to a finishing tool path. So, again, we're going to go into turning profile finish. We have our tool path. So, we're going to go ahead and hit okay. As you guys can see, I get some of my common errors. These are leadouts being modified. modified. modified. Now again, that's a linking problem that we'll talk about next week. But again, you're going to notice we have cycle and direction. We have passes. Lastly, we have stock to leave.

_Signals: toolpath:2 · camOps:1_

### Tip 11 — confidence 0.49

> Now, things have changed a little bit going from roughing to finishing because you're going to notice although we can do

Now, things have changed a little bit going from roughing to finishing because you're going to notice although we can do multiple stepovers, we can't necessarily define other things like our my I can't talk today, guys. We cannot change and define things like being able to do our max optimal loads, our roughing cycles, chip braking as you're seeing. But because this is a finish pass, we now have the ability to go in and do some things like turn on comp so that you can adjust it at the controller. Now, I'm going to pause here because I always get these questions.

_Signals: camOps:2 · safety:1 · howto:4_

### Tip 12 — confidence 0.4

> So again depending on your part file you could have certain areas you need to make smaller and other areas that you need

So again depending on your part file you could have certain areas you need to make smaller and other areas that you need to make bigger. Good example of that heat shrink um not heat shrink I should say is heat fitting you know bearing races pressed on type of profiles in the same kind of tool path you could break it up you would have two tool paths one using inverse wear and one using normal wear. So again this works really really good on those guys that go and do a minus minus tolerance on your drawing. So let's go ahead and keep going with this.

_Signals: toolpath:1_

### Tip 13 — confidence 0.45

> However, this is overkill had we done this part correct out the box

However, this is overkill had we done this part correct out the box. But what I want you guys to pay attention to again is we are just going to look at the blue lines. The blue lines are the most important part of this tool path. So again, I can go to my passes tab. Now, what you're seeing from the start is we're getting what's called an up and down direction. What does that mean? If I simulate this tool path, we're going to see that is it going up and down with the roughing cycle? No. It's feeding in, feeding out, and then moving over.

_Signals: toolpath:2_

### Tip 14 — confidence 0.41

> Not the most necessarily worst thing possible, but as you're seeing here, I'm now getting a collision because there's so

Not the most necessarily worst thing possible, but as you're seeing here, I'm now getting a collision because there's so much material left to be finished. So, we can adjust that. Again, the blue lines, how the blue lines are going to remove the material on the part. So, as you guys can see, we're going to go to our passes tab. Off the rip, we have the ability to control and say only down. Now, I am going to shorten this all back up, guys. Give me a sec here while we go ahead and change my front. Do a selection for my back. And of course, let's kick on some rust machining.

_Signals: safety:1 · howto:2_

### Tip 15 — confidence 0.49

> And as you guys have seen, because of rust machining, I get an angular grooving tool path because that tool path when we

And as you guys have seen, because of rust machining, I get an angular grooving tool path because that tool path when we did our roughing never accommodated for the fact that we wanted groove suppression. So, let's go back in and let's simulate this one more time to take a look at it. Again, we'll give my computer a second to catch up. I'm going to get my stock out of the way for this. But this is our last path. As you can see, we've gone down over and then we're retracting, moving back the other way, and feeding down into our part as much as we can.

_Signals: toolpath:2 · safety:1_

### Tip 16 — confidence 0.43

> So, again, we're no longer trying to pull back on that tool

So, again, we're no longer trying to pull back on that tool. How I adjusted that was nothing more than making the change from up and down to only down. Again, you guys have a lot of additional offsets here. You could use wear. Again, commonly not so much using wear because the way you touch off your tools on the lathe, you can adjust in an X and Z direction. So, a few other things, you know, the amount of step over for your finish pass, how many finish passes. You're going to notice we don't have spring pass here.

_Signals: camOps:2 · howto:2_

### Tip 17 — confidence 0.44

> However, you do still have repeat finish pass, which accommodates and does the same thing

However, you do still have repeat finish pass, which accommodates and does the same thing. Moving down a little bit further, you guys are going to notice we have roughing passes. This is one of those times where we're encountering this tool path is both finishing and roughing simultaneously when it calculates. So, we can again go in and adjust that as well. So, as you're going to see here, I'm going to go ahead and say sideways with partial. And what that's going to do is now it's going to do a more left and right lateral motion.

_Signals: toolpath:1 · camOps:1 · howto:1_

### Tip 18 — confidence 0.41

> Now, this is why again, you're going to notice that we have the ability to adjust things outside of this

Now, this is why again, you're going to notice that we have the ability to adjust things outside of this. Now, I can't go both ways with this tool path. However, some of the newer tool paths that you have, for example, turning groove roughing, we're going to go into our passes tab, and you guys are going to notice again, we have center sides. We have a lot more control when we split up our finishing from our roughing. So, again, we can go width first, we can go depth first, front to back, back to front.

_Signals: toolpath:1 · howto:1_

### Tip 19 — confidence 0.55

> Again, fully capable of adjusting even more outside of this tool path, but it's still the same concept at the end of the

Again, fully capable of adjusting even more outside of this tool path, but it's still the same concept at the end of the day. Use your okay button. Let's get a tool path on that part. In this case, I'm going to show you guys some Hollywood magic. We're going to go back to what we had before. And I'm going to go turn and groove rough. However, I'm going to turn off rest machining so that the tool paths don't get confused. And then I can make those adjustments from there. When making adjustments, don't spend a ton of time at the end of the day trying to go through and adjust everything at once.

_Signals: toolpath:2 · camOps:3 · howto:1_

### Tip 20 — confidence 0.4

> take the simple simple approach and slowly make changes

take the simple simple approach and slowly make changes. So for example, right now I have a side entry which means my tool path is going to start on the right side and work towards the left. So again I'm going to bring this in. As you guys are going to see there's my groove. We step over a little bit we groove again. Now depending on chip evacuation deflection there's so many reasons why you may want to go in the center first. So again, very simply, you guys are seeing by changing my options, as you're going to notice that green is now my entry position.

_Signals: toolpath:1_

### Tip 21 — confidence 0.51

> You do have what's called adaptive roughing

You do have what's called adaptive roughing. It is very much like adaptive milling. Again, it's not going to use a linear tool path, as in linear straight in X or straight in Z. This is going to go back and forth and try to optimalize everything possible. So optimalize everything possible. So optimalize everything possible. So again, as you guys are going to see, we have optimal load here. Let's say I could take a 100 thou bite with that tool. tool. tool. Got to change that to a little less because that is bigger than my groove radius.

_Signals: toolpath:3 · howto:1_

### Tip 22 — confidence 0.4

> But again, you're going to get a more swooping action back and forth to maximize what that tool is capable of doing, as 

But again, you're going to get a more swooping action back and forth to maximize what that tool is capable of doing, as well as getting good chip evacuation the entire time through. Another one, turning single groove, guys. Very straightforward. You're going to notice your menus are reduced by a lot because all we're doing on a tool path like this is defining a location to go to and it's nothing more than one in one out. one out. one out. Getting a little further down, talking about our turning threads.

_Signals: toolpath:1_

### Tip 23 — confidence 0.5

> As in, do you want to add extensions or do you want to reverse it, make multiple step downs as you cut those tampered ed

As in, do you want to add extensions or do you want to reverse it, make multiple step downs as you cut those tampered edges off? Again, this is all stuff that I would do at the model level to make your life much easier. So again, let's get back in here because we're going to talk about turning part. turning part. turning part. Lastly, turning part once again, it's a pretty simple tool path. The roughing tends to be the worst in grooving and adaptive or adaptive roughing, normal profile roughing, and groove roughing. You'll notice the most options.

_Signals: toolpath:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-r88wX51bg38-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/r88wX51bg38.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].