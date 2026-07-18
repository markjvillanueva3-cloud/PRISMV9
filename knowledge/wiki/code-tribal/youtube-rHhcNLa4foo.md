---
title: "Reverse Engineering with Autodesk Manufacturing Technology"
domain: general
source: youtube
videoId: rHhcNLa4foo
url: https://www.youtube.com/watch?v=rHhcNLa4foo
channel: "KETIV Technologies"
duration_s: 3416
tribal_entries: 27
chunks_scanned: 111
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Reverse Engineering with Autodesk Manufacturing Technology

**Channel:** [KETIV Technologies](https://www.youtube.com/watch?v=rHhcNLa4foo)
**Duration:** 56m 56s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 27 of 111 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.43

> let's move ahead here so this is this is giving me the fit so i'm getting instant feedback and all i do here is left cli

let's move ahead here so this is this is giving me the fit so i'm getting instant feedback and all i do here is left click here is left click here is left click and right click so that's that's created a plane underneath a plane underneath a plane underneath and then it sort of designates that area as white so i know exactly what and where i've actually fitted these planes planes planes so moving around the part here now here's one here that's getting getting good coverage and i can left click right click to accept click to accept click to accept there's one in this sort of flat region here i

_Signals: howto:8_

### Tip 2 — confidence 0.43

> like i just make sure that it's got enough sort of information to give me what i need and i left click and right click r

like i just make sure that it's got enough sort of information to give me what i need and i left click and right click right click right click in this particular face it's only sort of grabbed of grabbed of grabbed regions of triangles in this area so what i can do is just increase this sort of similarity angle so really it's going to include more triangles within the calculation once again i can look over and say left click right click click right click click right click and then all i do is just really move around the part i'll try not to rotate too much but once again there's the fit left

_Signals: howto:10_

### Tip 3 — confidence 0.43

> click right click left click right click left click right click let's move around to this side once again i'm getting go

click right click left click right click left click right click let's move around to this side once again i'm getting good coverage there's the fit that i like left click right click right click right click whoops move around this way now again this one is not really getting triangles or enough information from that area so all i do is just increase that similarity angle and hit preview keep going until i get what i need preview there we go that's better coverage and again left click right click okay so moving up to the end of the part here there's a good surface i like that one we'll come

_Signals: howto:12_

### Tip 4 — confidence 0.42

> okay and remember i said i was going to do something different in this sort of 3d area so let's just grab that triangle 

okay and remember i said i was going to do something different in this sort of 3d area so let's just grab that triangle mesh triangle mesh triangle mesh we'll hit ctrl k to look at that on its own own own and then we'll do something slightly different in this area so if i click on the mesh the mesh the mesh i go to the manage tab what we're going to do is sort of select some triangles in a completely different sort of manner in this case by discontinuity discontinuity discontinuity i'm just going to drop that down to about 10 about 10 about 10 click on the triangles and again i'm looking for

_Signals: camOps:1 · howto:4_

### Tip 5 — confidence 0.43

> the new 3d sort of contour and again that's um you know there's my solid there solid there solid there now again obvious

the new 3d sort of contour and again that's um you know there's my solid there solid there solid there now again obviously i can't go ahead and you know due to time constraints i can't really do the whole part but now what we're going to be doing is looking at how we can let's do it the other way let's grab the mesh hit control k mesh hit control k mesh hit control k now we're going to look at some of these holes here now really these holes have been been been originally you know in the original design intent was to go through the model but model but model but if we were to rotate round again

_Signals: toolpath:1 · camOps:1_

### Tip 6 — confidence 0.4

> click to accept and then we'll do this region here hopefully everyone's not getting too seasick with all the rotations b

click to accept and then we'll do this region here hopefully everyone's not getting too seasick with all the rotations but we'll do this one over here now we don't really know what kind of diameters uh were originally intended but what we can do is then can do is then can do is then go ahead and sort of start editing and modify them modify them modify them modifying them as a group so i like that right mouse click and again once i come out of the form out of the form out of the form what we should have is our solids now we have the original have the original have the original solid and we

_Signals: howto:5_

### Tip 7 — confidence 0.41

> know we want to have these um you know going all the way through let's just turn the mesh off grab these particular soli

know we want to have these um you know going all the way through let's just turn the mesh off grab these particular solids these particular solids these particular solids okay we'll hit ctrl k and what we're going to do is quickly modify those colors as well let's give it something a bit bit bit brighter now i could either modify them individually but if we actually modify them as a group them as a group them as a group first of all i know the bottom of the part is at zero so i'm going to globally move them move them move them uh you know the bottom of the cylinders down to say minus one

_Signals: camOps:1 · howto:3_

### Tip 8 — confidence 0.43

> it in the way that you expect the model to uh to to behave and then to actually turn out to out to out to so now what we

it in the way that you expect the model to uh to to behave and then to actually turn out to out to out to so now what we're going to show is we're actually going to go into into feature cam and then cam and then cam and then bring the part in that that ted was working on and then go ahead and actually actually actually um apply some tool path to it right so let's go ahead and actually bring the part in again if i take a look at at at what it got exported as uh and again i'm not sure ted if you wanted to detail onto like what kind of uh file types you can export these models as is there as is

_Signals: toolpath:1 · camOps:1_

### Tip 9 — confidence 0.52

> recognition cam software right so completely different from some of the other tools that are that are out there in the s

recognition cam software right so completely different from some of the other tools that are that are out there in the sense that you don't need don't need don't need any sort of 2d drama to to to drive that uh that toolpath right so what i mean by 2d geometry i'm talking about chains um or or you know extrusions or islands you you don't need to really select any sort of feature sort of feature sort of feature in order to generate some sort of tool path for the for the cam software and another thing with feature cam is that there's a lot of automation built into the software for instance if

_Signals: toolpath:2 · camOps:2 · howto:1_

### Tip 10 — confidence 0.41

> actual machine simulation file as well if you guys take a look down here at the bottom of my screen of my screen of my s

actual machine simulation file as well if you guys take a look down here at the bottom of my screen of my screen of my screen and then you also you also have to make sure you set up your tools correctly right so why is that important well the way that feature cam works is that it takes a look at your tool library library library um and it actually takes a look at the stock type that you're working with now what i mean by that is it's taking a look at what kind of material you're working with and it applies the correct tool path strategies it applies the correct feeds and speeds all kind of in

_Signals: toolpath:1 · howto:1_

### Tip 11 — confidence 0.45

> the background right so very very limited uh interaction that needs to take place from the programmer in order to get so

the background right so very very limited uh interaction that needs to take place from the programmer in order to get some sort of tool path out to the out to the machine now obviously that in a perfect world right you would just click a button have a fully part program that's not really always going to be the case so you do you do you do have the option to also do some sort of interactive machining as well interactive machining as well interactive machining as well and we'll take a look at what that looks like here in just a bit but just right off the bat off the bat off the bat right we're

_Signals: toolpath:1 · safety:1 · howto:1_

### Tip 12 — confidence 0.44

> option to deselect some of the features right so maybe there's a specific side that you don't want a machine just yet ri

option to deselect some of the features right so maybe there's a specific side that you don't want a machine just yet right maybe there's a side here that you you want to hold off for either for another setup or maybe for for a different time you do have the option to deselect some of these these uh these features that get automatically selected automatically selected automatically selected but really that's all it takes right so i'm just going to say go ahead and finish this off finish this off finish this off and then show me what what it comes up with like i said here on the left hand side

_Signals: camOps:3_

### Tip 13 — confidence 0.41

> specific error that specific error that specific error it's telling me that it cannot find a twist drill for that specif

specific error that specific error that specific error it's telling me that it cannot find a twist drill for that specific size hole right and that's okay that that's going to be the case i'm going to have tools in my library that don't necessarily correspond correspond correspond with some of the the uh the dimension features here features here features here so what i can do is i can go back into the hole the hole the hole go to the properties and say you know what i actually intended that feature to be machined be machined be machined with the drill that i actually do have in my tool

_Signals: camOps:2_

### Tip 14 — confidence 0.5

> library right so i can go ahead and select ahead and select ahead and select the 11 30 seconds drill there select the se

library right so i can go ahead and select ahead and select ahead and select the 11 30 seconds drill there select the second hole second hole second hole select the drill apply that right hole number three select the drill now you're probably thinking well that's kind of a kind of a kind of a that's that's a really manual process right what right what right what what is the what's the reason for that what if i have 20 holes right do i need to do that 20 times um and you really don't right so the first thing that i want you to take a take a look at is that we just just by selecting the actual

_Signals: camOps:3 · howto:6_

### Tip 15 — confidence 0.53

> property of the the tool path we're able to now modify that toolpath and say instead of using a a drill that you couldn'

property of the the tool path we're able to now modify that toolpath and say instead of using a a drill that you couldn't find for a specific size go ahead and just use the drill that we just selected right and it applies that and it takes care of the error messages for us for us for us now again that was a very manual process what i can do what i can do what i can do is i can actually select a handful of features or a handful of of tool pads and apply a specific tool to those tool pets to those tool pets to those tool pets so take for instance we have you know we have a couple roughing

_Signals: toolpath:2 · camOps:2 · howto:2_

### Tip 16 — confidence 0.41

> of tool path that's going to work for your parts and then go in and modify or you're just trying to you know just get tr

of tool path that's going to work for your parts and then go in and modify or you're just trying to you know just get try to get something something something try to get something out the door relatively quickly and so relatively quickly and so relatively quickly and so the last thing here that i want to take for the for this for this specific setup is going to be the surfacing uh feature here on the top here on the top here on the top right so how do we how do we handle that um if i take a look at some of the additional tools that we have here so again we just talked about the automatic

_Signals: toolpath:1 · howto:1_

### Tip 17 — confidence 0.4

> say going to say next we want to go to machine this surface here surface here surface here go ahead and select it this i

say going to say next we want to go to machine this surface here surface here surface here go ahead and select it this is where it gets interesting right so again you do have the option have the option have the option to have a roughing operation right automatically have the software pick a roughing operation roughing operation roughing operation apply a semi-finish and then apply a finishing strategy right so this is again where the automation comes into play play play into the software for us we're going to go ahead and apply a single operation and say next right and i'll talk a little bit

_Signals: camOps:1 · howto:2_

### Tip 18 — confidence 0.63

> about why i'm doing that here in just a bit but again we're going to go ahead and stick with this parallel tool path too

about why i'm doing that here in just a bit but again we're going to go ahead and stick with this parallel tool path tool path tool path i'm going to say next you have your your options so if you're coming from another cam software cam software cam software um or even some of the other autodesk softwares softwares softwares with a parallel toolpath you do have the the very similar options right where you can define can define can define which axis it's going to be parallel to um you can make it automatic right so kind of let the software choose the best orientation for it i'm going to say

_Signals: toolpath:7 · howto:3_

### Tip 19 — confidence 0.57

> finish and then there is is is our parallel tool path right we only have one have one have one ball end mill here in the

finish and then there is is is our parallel tool path right we only have one have one have one ball end mill here in the tool library so it automatically knew what to select if you know if you have the option if you have multiple options you have multiple options you have multiple options there are ways to kind of push the software kind of nudge the software into a specific a specific a specific into a specific tool for a specific tool path path path and for this one one thing that i did want to point again we're working with the five axis machine and depending on how much or how critical the

_Signals: toolpath:3 · camOps:2 · howto:1_

### Tip 20 — confidence 0.53

> surface is uh uh uh we can we can really really uh spend a little bit of time little bit of time little bit of time maki

surface is uh uh uh we can we can really really uh spend a little bit of time little bit of time little bit of time making sure that that we're getting the surface uh surface uh surface uh uh not only accurate but you also want to get a really really nice surface finish right especially with the five axis machine you can use uh just the full capabilities of the machine machine machine in order to get nice surface nice surface finishes and surface finishes and surface finishes and the thing that i wanted to point out is that for this toolpath that for this toolpath that for this toolpath being

_Signals: toolpath:3 · camOps:1_

### Tip 21 — confidence 0.61

> that we enabled the five axis capabilities you do have the option to make this one a make this one a make this one a ful

that we enabled the five axis capabilities you do have the option to make this one a make this one a make this one a full five axis tool path right so again if you want to use lead lean you have options here to make it vertical um vertical um vertical um contact normal right so you have specific options you can specify the angles for this tool path and then now instead of a three axis tool path you just converted it into a into a fully functioning uh five axis tool path so tool path so tool path so again really really easy to go to do some of these things um it doesn't take you know an access

_Signals: toolpath:6 · howto:1_

### Tip 22 — confidence 0.42

> you don't need to create reference geometry or or you don't need to create reference surfaces for that matter um it's ju

you don't need to create reference geometry or or you don't need to create reference surfaces for that matter um it's just a very efficient process when it comes to programming inside of inside of feature cam of feature cam of feature cam so i'm going to say okay and really all of these features of these features of these features again within a matter of minutes right without me just kind of going into details details details you can you can have tool path within a matter of minutes instead of feature cam now the next thing that i want to do is i want to go ahead and take a look at some of

_Signals: toolpath:1 · howto:2_

### Tip 23 — confidence 0.4

> use another interactive feature right and you'll see here why in just a bit but i'm going to go ahead and actually use a

use another interactive feature right and you'll see here why in just a bit but i'm going to go ahead and actually use a pocket operation for this one right so this is a critical feature i want to go ahead and pour for this uh for this hole out for this hole out for this hole out and what i'm going to do is i'm actually going to use the going to use the going to use the the feature recognition capabilities the feature recognition capabilities the feature recognition capabilities within the software right so i still want to extract the information with the feature recognition that's built into

_Signals: toolpath:1_

### Tip 24 — confidence 0.41

> the software and so for this one one one we're going to say next we're going to select the side surface for it and then 

the software and so for this one one one we're going to say next we're going to select the side surface for it and then just really by selecting the hole right it automatically picks up the depth and it picks up the correct diameter that we need diameter that we need diameter that we need that we need to bore this out to all right so we'll say next you have additional features here if you did want to modify that so again you can kind of deviate from some of the geometry that it finds geometry that it finds geometry that it finds which is really nice now what i wanted to what to what to what

_Signals: camOps:1 · howto:3_

### Tip 25 — confidence 0.6

> there say okay to that and then once again apply apply apply that pocket operation right so we'll say pocket pocket pock

there say okay to that and then once again apply apply apply that pocket operation right so we'll say pocket pocket pocket extract the feature recognition select the side the side the side come in here select the the actual surface itself surface itself surface itself and then finish that off all right maybe the last one here and and i kind of overlapped this one but the last one that we want to go ahead and machine if you take a look at the setups here we have this setup that's machining so if i take a look at it it's going to be site 2 right and if you take a look at it so site 2 site 4 um

_Signals: toolpath:4 · camOps:1 · howto:2_

### Tip 26 — confidence 0.58

> your machine simulation here at the bottom bottom bottom so i'm going to start off with just a 3d simulation just so we 

your machine simulation here at the bottom bottom bottom so i'm going to start off with just a 3d simulation just so we can generate the tool path tool path tool path all right hit play it's going to take a while here to while here to while here to kind of process the entire tool path that i have out and it looks like it's milling or it's pouring out that hole there and then it actually does do the the surfacing right so even for the surfacing i didn't really talk about this but you do have uh machining configurations that can that can apply to some of these surfacing strategies so if you are

_Signals: toolpath:4 · camOps:1_

### Tip 27 — confidence 0.42

> that the rotation is actually is actually is actually opposite to this right so it's actually machining away from you um

that the rotation is actually is actually is actually opposite to this right so it's actually machining away from you um i already did the change here but inside of feature cam if you want to make a change just just for your guys's information when you have a five axis setup you do have the option here the option here the option here to change which position it's going to it's going to machine it right so again obviously obviously obviously you want to have as much visibility as possible when you're machining this so um um um so you always want to machine it you know when it's facing you if

_Signals: safety:1 · howto:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-rHhcNLa4foo-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/rHhcNLa4foo.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].