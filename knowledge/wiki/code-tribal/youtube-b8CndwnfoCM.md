---
title: "Shapeoko Feeds & Speeds and Machining Tips!"
domain: mill
source: youtube
videoId: b8CndwnfoCM
url: https://www.youtube.com/watch?v=b8CndwnfoCM
channel: "NYC CNC"
duration_s: 1752
tribal_entries: 24
chunks_scanned: 44
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Shapeoko Feeds & Speeds and Machining Tips!

**Channel:** [NYC CNC](https://www.youtube.com/watch?v=b8CndwnfoCM)
**Duration:** 29m 12s
**Domain:** `mill` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 24 of 44 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `mill`.

### Tip 1 — confidence 0.4

> hi guys vince here today we're going to get into using fusion 360 adaptive clearing clearing clearing with desktop machi

hi guys vince here today we're going to get into using fusion 360 adaptive clearing clearing clearing with desktop machines specifically how to get good feeds and speeds and what to look for while machining look for while machining look for while machining we'll do test cuts with both high and low axial depths of cut to show you the differences and benefits of each one we'll go over basic machine setup setup setup router and tooling and hopefully i can show you some tips and tricks and things i've learned along the way hope you guys enjoy for those of you that didn't watch the tormach access

_Signals: toolpath:1_

### Tip 2 — confidence 0.4

> plate or mod vises a probe or a tool length offset sensor it didn't take long to really try and push the limits on the s

plate or mod vises a probe or a tool length offset sensor it didn't take long to really try and push the limits on the shape oco basically if i could fit it on the machine i wanted to cut it right now i'm going to show you one of my favorite parts it's actually one of two assemblies and this is a sheet metal press die and what you do is you put a piece of sheet metal in there under hydraulic press press press tens of thousands of pounds later and out pops is just perfect part a die like this really couldn't be machined without machined without machined without a tool path like fusion 360

_Signals: toolpath:1_

### Tip 3 — confidence 0.55

> adaptive clearing all right guys clearing all right guys clearing all right guys enough about me let's get back to the a

adaptive clearing all right guys clearing all right guys clearing all right guys enough about me let's get back to the adaptive cutting adaptive cutting adaptive cutting the first thing i'd like to point out is that all these end mills our name brand we have 2l amana datron helical lakeshore carbide datron helical lakeshore carbide datron helical lakeshore carbide and destiny there are lots of other manufacturers out there as well but these are just some of the tools that i've used over the years with good results results results on desktop machines cutting aluminum these end mills are

_Signals: toolpath:4_

### Tip 4 — confidence 0.47

> tool isn't rubbing and the chip is sufficiently thick enough to manage the heat so chip load is the amount per amount pe

tool isn't rubbing and the chip is sufficiently thick enough to manage the heat so chip load is the amount per amount per amount per tooth per revolution that's cut so the more flutes you have the faster you're going to have to feed for that same rpm to maintain that chip look let's say we program the single flute to 40 inches per minute 40 inches per minute 40 inches per minute at that same rpm we're gonna have to run this three flute this three flute this three flute three times as fast 120 inches per minute to maintain that chip load also this three flute is going to take quite a bit more

_Signals: params:4_

### Tip 5 — confidence 0.41

> right here here here are what i like to call you know regular duty pretty much a general end mill they are lower cost es

right here here here are what i like to call you know regular duty pretty much a general end mill they are lower cost especially compared to the datron to the datron to the datron but they don't like to run at the same rpm i generally like to run both of these these these under 20 000 rpm because they aren't especially balanced and any kind of vibration vibration vibration will end up to some degree in the cut i haven't noticed a difference between the diamond coating and the zrn but it does give peace of mind give peace of mind give peace of mind so you know why not the is specially balanced

_Signals: camOps:1 · params:1_

### Tip 6 — confidence 0.44

> because it's actually designed for machines that have a much higher rpm range than our desktop machines machines machine

because it's actually designed for machines that have a much higher rpm range than our desktop machines machines machines and it also features a wiper flat on the bottom bottom bottom and that lets you get a pretty good floor finish especially compared to most single flutes which aren't really known for a good floor finish also the datron is pretty much my pick when when when i want to remove a lot of metal and i don't mind running some rpm so i usually run this one you know anywhere from 25 to 30 000 rpm no problem dry cutting as well so today we are going to pick the datron mainly because

_Signals: camOps:2 · params:1_

### Tip 7 — confidence 0.48

> really like about these makita routers is you can run up to a 3 8 or 8 millimeter end mill that's a destiny diamondback 

really like about these makita routers is you can run up to a 3 8 or 8 millimeter end mill that's a destiny diamondback and this is an eight millimeter daetron foreign one foreign one foreign one these are some of my favorite ones to run single flutes run super well at high rpm rpm rpm high balance and i don't know they just cut like magic cut like magic cut like magic now let's talk about why adaptive clearing is such an efficient roughing strategy strategy strategy and how it differs from traditional pocketing pocketing pocketing the magic behind adaptive is its constant cutting load by

_Signals: toolpath:2 · camOps:1_

### Tip 8 — confidence 0.55

> keeping its step over very controlled step over very controlled step over very controlled called the optimal load it eli

keeping its step over very controlled step over very controlled step over very controlled called the optimal load it eliminates spikes in tool engagement and allows you to run much more aggressively it also gives you the option of running much higher axial depths of cut in comparison here's a traditional pocketing tool path with the same step over as the adaptive over as the adaptive over as the adaptive as you can tell the tool engagement radically changes in the corners due to part geometry part geometry part geometry and this definitely means you'll have chatter and you'll have to reduce

_Signals: toolpath:4_

### Tip 9 — confidence 0.42

> your feed and speeds feed and speeds feed and speeds accordingly okay let's drop the test part real quick so we can make

your feed and speeds feed and speeds feed and speeds accordingly okay let's drop the test part real quick so we can make those test cuts test cuts test cuts for the uh the high and the low depth and some of the older cuts that i thought were good but thought were good but thought were good but ended up not being that great i want to create a sketch create a sketch create a sketch we will make a center rectangle and it is a four by six and a half let's dimension it okay let's dimension it okay let's dimension it okay finish the sketch we're going to extrude it it it inch and a half tall now we

_Signals: camOps:1 · howto:4_

### Tip 10 — confidence 0.45

> want to create those slots for the adaptive so we'll create another sketch on the top and we'll do a two point rectangle

want to create those slots for the adaptive so we'll create another sketch on the top and we'll do a two point rectangle this time time time okay i want these to be about an inch and a half and a half and a half wide and i want three of them so i'm going to make a rectangular pattern i'll choose all the lines and then just pull it out looks good finish the sketch okay so i want to extrude these extrude these extrude these down about a quarter of an inch just because i just want to show you guys the differences between these we have some real cutting to do later on a nice part so part so part

_Signals: toolpath:1 · camOps:1 · howto:2_

### Tip 11 — confidence 0.66

> so there you go looks good now time to put in some cam in some cam in some cam all right now here's where i'm going to c

so there you go looks good now time to put in some cam in some cam in some cam all right now here's where i'm going to cheat a little bit i've already spent quite a bit of time with proven cut recipes figuring out what to run on this tool on this machine as far as step overs and step downs so what i'm going to do is just copy that that that tool path go to my new part i'll paste it in my setup hit ok edits pick my new geometry right here there you go nice shallow adaptive tool path adaptive tool path adaptive tool path let's go to the feeds and speeds real quick 25 000 rpm quick 25 000 rpm

_Signals: toolpath:7 · params:2_

### Tip 12 — confidence 0.47

> quick 25 000 rpm 75 inches a minute 3000 feet per tooth optimum load of 0

quick 25 000 rpm 75 inches a minute 3000 feet per tooth optimum load of 0.23 so that's almost 100 percent step over 100 percent step over 100 percent step over and i've found that with these datron end mills you can almost run like a high feed feed feed end mill just a shallow depth of cut fast and they leave a beautiful finish make some really nice chips roughing step down step down step down 30 thou and because i'm cutting over 50 percent of diameter percent of diameter percent of diameter this feed per tooth is true there is no chip thinning that we have to worry about all right let's go

_Signals: camOps:2 · params:2_

### Tip 13 — confidence 0.51

> get the deep tool path path path copy paste okay edit this okay edit this i'm going to apply it to our new geometry ther

get the deep tool path path path copy paste okay edit this okay edit this i'm going to apply it to our new geometry there you go nice deep tool path and so these two tool paths are actually the same same same material removal rate but as you can tell they're going to be quite a few differences differences differences between both of them let's look at the feeds and speeds of this one the same 25 000 rpm cutting feed rate 50 inches per minute inches per minute inches per minute feed per tooth of 2000 now we will have an optimum load of 40 thou and a maximum roughing step down of 250 thou thou

_Signals: toolpath:2 · params:2_

### Tip 14 — confidence 0.45

> a bit of time i'm going to do is we're going to duplicate this deep depth of cut edit a little bit i used around the sam

a bit of time i'm going to do is we're going to duplicate this deep depth of cut edit a little bit i used around the same parameters at the same spindle rpm the same feed rates the same optimal load load load but my maximum step down is only a hundred thou so we're going to make it just one pass so minus 0.1 and then we're actually going to pick the correct geometry this time okay so there you go what's interesting is i thought i was doing really good with this toolpath you know know know everyone runs adaptive at first and they they want to they want to they want to cut as deep as possible

_Signals: toolpath:2_

### Tip 15 — confidence 0.58

> shallow adaptive pass shallow adaptive pass shallow adaptive pass and i'll stop halfway and pause the machine just to up

shallow adaptive pass shallow adaptive pass shallow adaptive pass and i'll stop halfway and pause the machine just to up the feet override so you can see you can see you can see how it's going to act a little bit more [Music] [Music] aggressively cut sounded great really nice even and consistent consistent consistent even with fifty percent override halfway through it performed through it performed through it performed really well floor finish is nice reflection is nice reflection is nice reflection is nice even though adaptive is not a finishing strategy it doesn't hurt i really like this

_Signals: toolpath:4 · camOps:1_

### Tip 16 — confidence 0.4

> kind of chip shape it's a nice it's a nice it's a nice soft little curl they don't interlock and they're not sharp and t

kind of chip shape it's a nice it's a nice it's a nice soft little curl they don't interlock and they're not sharp and they're not sharp and they're not sharp which can be important if you machine it home or you don't have an enclosure or something like that something like that something like that the next cut will be the high depth adaptive we'll be cutting a little bit deeper than deeper than deeper than 1d which in my opinion is about the limit for most desktop machines unless they have linear rails or they've been modified to be a little bit more rigid rigid rigid or they have a spindle

_Signals: toolpath:1_

### Tip 17 — confidence 0.48

> and exits the cut floor finish not as great but that's always going to be the issue when you have a high amount of step 

and exits the cut floor finish not as great but that's always going to be the issue when you have a high amount of step overs chips look nice and shiny very consistent consistent consistent not sharp at all so that's good but compared to that first cut it just didn't sound like the end mill was having a good time having a good time having a good time the walls there's some chatter the floor there's some chatter anytime you that end mill is bouncing around it usually means it's gonna not last as long long long so first cut second cut same material removal rate removal rate removal rate which

_Signals: camOps:3 · safety:1_

### Tip 18 — confidence 0.64

> is using that extra flute length really really really worth it maybe if you cut a whole lot and you want to you know pin

is using that extra flute length really really really worth it maybe if you cut a whole lot and you want to you know pinch every penny but pinch every penny but pinch every penny but i really haven't seen a drop in tool life when using the shallower adaptive type strategies usually i'll type strategies usually i'll type strategies usually i'll you know drop an end mill and break it or i'll crash it and it's my fault before a tool ever wear out i actually don't think i've ever really worn out a tool tool tool okay so we've got our low and high depth adaptive cuts adaptive cuts adaptive cuts

_Signals: toolpath:4 · camOps:1 · safety:1 · howto:2_

### Tip 19 — confidence 0.45

> parameters machining parameters machining parameters it can plot the development of the forces acting on the tool during

parameters machining parameters machining parameters it can plot the development of the forces acting on the tool during one full revolution full revolution full revolution let's look at the force plots for those first two adaptive test cuts on the left is the low axial high radial and on the right is the high axial low radial radial radial both of these cuts are at the same sfm and very close in mrr here's where it gets really interesting though the peak and average forces are much higher with the high depth adaptive cut cut cut it's easy to tell that our shallow cut is a much better option

_Signals: toolpath:2_

### Tip 20 — confidence 0.4

> for this tool in this material with my machine force parameters parameters parameters our test cuts back up this data as

for this tool in this material with my machine force parameters parameters parameters our test cuts back up this data as well now let's apply that shallow adaptive proven cut recipe to a real part this is a custom intake manifold plenum floor with raised velocity stacks there is quite a bit of material to remove so we're going to run it just a little bit more aggressively little bit more aggressively little bit more aggressively first thing we're going to do is open up the millolizer the millolizer the millolizer and i'm going to keep the same depth of cut and width of cut however i'm going

_Signals: toolpath:1_

### Tip 21 — confidence 0.45

> what's going on what's going on when the machine is cutting so this is the initial helix right here and from what i hear

what's going on what's going on when the machine is cutting so this is the initial helix right here and from what i heard in the video and from what i'm seeing as far as power usage usage usage i can afford to push that a little bit higher and i think that additional tool pressure would help with the cut once it gets into its main adaptive cuts it's hitting around it's hitting around it's hitting around 275 to you know 300 watts it's funny because you can actually see the shape of the part in the graph after it finishes the profile it starts to do the bores and that's why there's four

_Signals: toolpath:2_

### Tip 22 — confidence 0.44

> different four different four different spikes here the initial helix and then it spikes when it starts to rough inside 

different four different four different spikes here the initial helix and then it spikes when it starts to rough inside rough inside rough inside out now let's look at the average power usage and compare it to what the mililizer estimated to be mililizer estimated to be mililizer estimated to be looks to be around 280 watts 275 watts right right right open up the millilizer estimated 282.

_Signals: toolpath:1 · camOps:3_

### Tip 23 — confidence 0.46

> that's spot-on and that definitely gives me confidence in all the other factors that it's predicting that it's predictin

that's spot-on and that definitely gives me confidence in all the other factors that it's predicting that it's predicting that it's predicting there's also another interesting thing that i didn't actually see till i was done with the project but if i would have cut in would have cut in would have cut in conventional cutting i probably would have had a little bit smoother cut and that's mainly due to just the high step over i was using which is almost 100 after the adapter was done i used scallop in a daetron six millimeter single flute ball end mill for the semi-finish and finished tool paths

_Signals: toolpath:1 · camOps:2_

### Tip 24 — confidence 0.51

> paths paths [Music] once i finished those scallop toolpaths i reinstalled the daetron six millimeter four in one four in

paths paths [Music] once i finished those scallop toolpaths i reinstalled the daetron six millimeter four in one four in one four in one and ran an inside and outside contour to finish the surfaces and free the part this is the final part the finish is right off the machine without any kind of post-processing of post-processing of post-processing or polishing now let's check the width i didn't do any kind of fine-tuning infusion infusion infusion or any kind of step count adjustments in the machine controller width is supposed to be three inches see how well we did all thin about a thou

_Signals: toolpath:2 · camOps:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-b8CndwnfoCM-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `mill`
- Source artifact: `state/shared/youtube-extraction/b8CndwnfoCM.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].