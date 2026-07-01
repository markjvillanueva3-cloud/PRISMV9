---
title: "Training Class - Okuma Lathe Multi-Function Programming Basics"
domain: lathe
source: youtube
videoId: wzJrocvyIBs
url: https://www.youtube.com/watch?v=wzJrocvyIBs
channel: "Hartwig"
duration_s: 2308
tribal_entries: 21
chunks_scanned: 54
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Training Class - Okuma Lathe Multi-Function Programming Basics

**Channel:** [Hartwig](https://www.youtube.com/watch?v=wzJrocvyIBs)
**Duration:** 38m 28s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 21 of 54 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.5

> collets collets with g184 you can set a parameter to float float float and you can float tap in a live tool lathe lathe 

collets collets with g184 you can set a parameter to float float float and you can float tap in a live tool lathe lathe lathe you can also set that parameter to concurrent concurrent concurrent and synchronize tap with g184 now if i intend to synchronize tap me personally because i want to standardize the program across all the program across all the program across all machines it may run on i prefer to use g178 and g179 g178 and g179 g178 and g179 which is always synchronized tapping for all of the above cycles you can also use a q value use a q value use a q value for the number of holes

_Signals: camOps:3 · safety:1 · howto:2_

### Tip 2 — confidence 0.41

> equally spaced around the part around the part around the part and the machine will take 360 divided by the number of ho

equally spaced around the part around the part around the part and the machine will take 360 divided by the number of holes the number of holes the number of holes in this example we're using six and the result would be 60 degrees in this case so this case so this case so six holes will be drilled every 60 degrees degrees degrees starting from my coordinate c zero drilling to z of minus two and a half inches inches inches on a two inch diameter bolt hole circle this is the parameter i was talking about for g184 tapping or g298 for left-handed tapping tapping tapping float is your typical

_Signals: params:2_

### Tip 3 — confidence 0.44

> floating holder the difference is you cannot re-tap a hole hole hole in the machine with a floating holder there's no wa

floating holder the difference is you cannot re-tap a hole hole hole in the machine with a floating holder there's no way to pick up that lead again again again versus rigid tapping you can use pec tapping which means you can chase back through the hole back through the hole back through the hole for such as an application of deep hole tapping tapping tapping you could tap in retract tap in retract three or four packs to get to depth instead of having to take one full depth say two three or four inches deep inches deep inches deep if necessary that can be a really nice feature of rigid

_Signals: camOps:3_

### Tip 4 — confidence 0.41

> tapping on these machines something else to be aware of on a live tool lathe tool lathe tool lathe is the ability to rev

tapping on these machines something else to be aware of on a live tool lathe tool lathe tool lathe is the ability to reverse the direction of your live tool spindle within all the fixed cycles i talked about a couple slides ago the machine will actually turn on the spindle of the lathe spindle of the lathe spindle of the lathe the live tool of the lathe in the m13 direction direction direction for any drilling operations for any drilling operations for any drilling operations now if you're using a standard velocity live tool that's okay because the tool is set up is set up is set up for the

_Signals: camOps:1 · howto:3_

### Tip 5 — confidence 0.44

> way the machine is programmed for m13 to be clockwise rotation which will drill a hole will drill a hole will drill a ho

way the machine is programmed for m13 to be clockwise rotation which will drill a hole will drill a hole will drill a hole but if you're using aftermarket holders for instance for instance for instance kenna metals holders you have to use this parameter this parameter this parameter you would check mark the station that you've mounted the holder on and that will reverse the rotation of the servo motor that's the servo motor that's the servo motor that's driving that live tool because if you leave it leave it leave it at the standard direction when you command m13 command m13 command m13 the

_Signals: camOps:3_

### Tip 6 — confidence 0.47

> tool will rotate counterclockwise which will break your drill so even if you tried to use m14 to run the spindle the pro

tool will rotate counterclockwise which will break your drill so even if you tried to use m14 to run the spindle the proper direction as soon as you go to use a fixed cycle such as g181 such as g181 such as g181 to drill a hole the machine will rotate the spindle back to m13 breaking your drill if you do not reverse the direction of rotation on this parameter here this parameter here this parameter here again you just check mark the station of which the tool is mounted in and then the machine is ready to run so this is a sample program where i'm using using using some live tool to drill a

_Signals: camOps:4_

### Tip 7 — confidence 0.5

> hole on the face of the part face of the part face of the part so i have a nice little heading i like to put a heading w

hole on the face of the part face of the part face of the part so i have a nice little heading i like to put a heading with the programmer's initials the part number the date just some relevant information and we have a tools list we're going to have a rough turning operation a finished turning operation and drill a half inch hole half inch hole half inch hole so i'm going to skip through the turning portion portion portion should look fairly familiar we have a g85 rough turning cycle g85 rough turning cycle g85 rough turning cycle lap cycle and we have a g87 finished turning lap cycle to do

_Signals: camOps:5_

### Tip 8 — confidence 0.41

> the profile of the part profile of the part profile of the part then when we get to nat3 our half inch diameter carbide 

the profile of the part profile of the part profile of the part then when we get to nat3 our half inch diameter carbide drill the first line of code returns the machine to the x limit and z limit the next line is g 271 sp equals one what this means is c axis machining mode on spindle number one one one my left spindle then we call up tool three offset three three offset three three offset three with sb equals we are setting the spindle speed of the live tool sb in this case equals 3400 this case equals 3400 this case equals 3400 rpm to my live tool and m13 says spindle on clockwise on

_Signals: camOps:1 · params:1_

### Tip 9 — confidence 0.41

> clockwise on clockwise then we have a rapid move to 1 inches 260 260 260 in diameter and a hundred thousands away from t

clockwise on clockwise then we have a rapid move to 1 inches 260 260 260 in diameter and a hundred thousands away from the end of the part turning coolant on on on our g181 is going to be a drill with no peck peck peck at a diameter of x one inch 260.

_Signals: toolpath:3 · camOps:1 · params:1_

### Tip 10 — confidence 0.47

> to a depth of minus one inch 150 at c0 with a return plane of a hundred thousandths thousandths thousandths and a feed r

to a depth of minus one inch 150 at c0 with a return plane of a hundred thousandths thousandths thousandths and a feed rate of five thousands per rev rev rev k would be a shift amount so let's say we're drilling down inside of a counter bore that's a half inch deep i don't want to have to cut air for the first half inch of first half inch of first half inch of my drill so i could put k of 0.5 or a half inch and my drill would wrap at a half wrap at a half wrap at a half inch then drill to the depth of minus one inch 150. one inch 150. one inch 150.

_Signals: camOps:4_

### Tip 11 — confidence 0.44

> now in nat4 we're going to mill a flat with an inch and a half shoulder mill so the first line of code will rapid to the

now in nat4 we're going to mill a flat with an inch and a half shoulder mill so the first line of code will rapid to the x limit x limit x limit and z limit we'll activate turret station 4 offset number 4 is going to be our live tool m110 will engage the c-axis joint to get ready for ready for ready for our milling operation sb our milling operation sb our milling operation sb equals 6000 this is the max rpm of your live tool if you have a genos l machine or an lb 3000 4000 live tool lathe this will be the max rpm of your live tool so in this program sb equals 6000 m13 to turn on my tool

_Signals: camOps:3_

### Tip 12 — confidence 0.41

> the machine to bring y back to zero back to zero back to zero from wherever it is and then m109 will release the c-axis 

the machine to bring y back to zero back to zero back to zero from wherever it is and then m109 will release the c-axis joint and m12 turns off the spindle then we have to drill two off-center holes holes holes so rapid to the x limit and z limit call up tool five offset number five this time to drill our holes m110 will engage the c-axis sb equals 3500 storing our live tool rpm now at 3500 now at 3500 now at 3500 m13 for clockwise again m13 for clockwise again m13 for clockwise again this time we're in feed per rev mode g95 wrap it to our clearance plane and to the z the z the z location of

_Signals: camOps:2_

### Tip 13 — confidence 0.47

> the first hole minus one inch inch inch g138 turns on y-axis mode and the first hole is offset 700 thousandths from cent

the first hole minus one inch inch inch g138 turns on y-axis mode and the first hole is offset 700 thousandths from centerline thousandths from centerline thousandths from centerline y minus 0.7 y minus 0.7 y minus 0.7 g181 is again a live tool drill cycle so we're going to drill a hole one inch deep at this location deep at this location deep at this location at c0 then we're at c0 then we're at c0 then we're going to go to y of 700 thousandths above above above center line z minus 4 inches and drill another hole one inch deep g180 will cancel the fixed cycle g136 will again have y axis come

_Signals: camOps:3 · params:1_

### Tip 14 — confidence 0.5

> back to zero and turn off y mode m109 will release the c-axis joint and then m12 will turn off the live tool spindle spi

back to zero and turn off y mode m109 will release the c-axis joint and then m12 will turn off the live tool spindle spindle spindle let's take a look at how this part will so here's our rough finish and then grooving cycle that we're not in the sample program now here comes our live tool live tool live tool y-axis mode's on you'll notice on the left side of the control x i a has come up and the diameter was cut in half cut in half cut in half and our last pass y goes to zero here comes our drill off center and that's our sample part does anybody have any questions about that joe i don't see

_Signals: camOps:5_

### Tip 15 — confidence 0.5

> turning offset turning this allows you such as the picture here to stack to stack to stack two turning tools one on top 

turning offset turning this allows you such as the picture here to stack to stack to stack two turning tools one on top of the other in a block other in a block other in a block in this case this is a subspindle lathe there are four turning tools rough in finish for main and rough and finish for sub finish for sub finish for sub stacked in this one turret station using the y-axis the y-axis the y-axis offset y-i in the tool offset chart below below below you can tell the machine from y0 the position of the tip of each tool then when you activate the tool offset the y-axis will slide down to

_Signals: camOps:6_

### Tip 16 — confidence 0.4

> applications such as that where this is limited limited limited is when you get into large diameter work pieces you can 

applications such as that where this is limited limited limited is when you get into large diameter work pieces you can have interference between the turning tools the turning tools the turning tools so you really have to look at the application of whether it's cost effective to purchase a block like this and set up y-axis offset turning or if you're better off having separate tools in separate stations are there any questions before we go on the subspindle none yet none yet none yet none yet all right for those of you who do not have a sub spindle lathe this does conclude the first portion

_Signals: safety:1 · howto:1_

### Tip 17 — confidence 0.41

> g122 and 123 are used for lt machines only to command the w axis from the a turret or the b turret when doing a part tra

g122 and 123 are used for lt machines only to command the w axis from the a turret or the b turret when doing a part transfer and then our g140 main spindle mode command and g141 command and g141 command and g141 subspindle mode commands these are the m codes used for the main spindle spindle spindle when doing a part transfer we have chuck clamp and unclamp clamp and unclamp clamp and unclamp m83 and 84 air blow on off it's nice to blow air on the work piece piece piece as you feed over make sure everything's nice and clean and you're not packing any chips on to a nice turn finish m88 and 89

_Signals: camOps:2_

### Tip 18 — confidence 0.49

> finish m88 and 89 finish m88 and 89 will blow air from the main spindle side m151 and m150 are your spindle synchronizat

finish m88 and 89 finish m88 and 89 will blow air from the main spindle side m151 and m150 are your spindle synchronization commands synchronization commands synchronization commands we're going to use this to sync the two spindles together spindles together spindles together for a successful part part transfer m185 and m184 allow m185 and m184 allow m185 and m184 allow the main spindle to be unclamped and rotating for the part transfer and then m976 allows the w axis to feed past the turret face saying that i understand there's interference i understand there's interference i understand

_Signals: camOps:2 · safety:2_

### Tip 19 — confidence 0.43

> the machine to reach the machine to reach the torque limit defined if it does that's when the machine will alarm out say

the machine to reach the machine to reach the torque limit defined if it does that's when the machine will alarm out saying you've had a crash or a bump into your work piece and the machine has stopped before damage occurs damage occurs damage occurs now you must figure out what's not lining up and how to fix the issue without having a crash that causes damage to the machine tool in 1899 is typically the sequence name i will use for my part transfer we're canceling the tool offset and moving the turret moving the turret moving the turret to the limits turning on the spindle at a thousand rpm

_Signals: safety:2_

### Tip 20 — confidence 0.48

> chuck to be unclamped when i come in to to to grab my part once the sub spindle is allowed to rotate allowed to rotate a

chuck to be unclamped when i come in to to to grab my part once the sub spindle is allowed to rotate allowed to rotate allowed to rotate unclamped then we can turn on spindle sync with m151 sync with m151 sync with m151 then we turn on our air blow for both spindles to get ready to feed on and clean the part m976 turn off my w axis interference so that i can i can i can pass up the turret to grab my work piece rapid to one inch away from the end of the part the part the part put the machine in feed per minute mode and limit the torque command to 20 percent load percent load percent load now

_Signals: camOps:3 · safety:1_

### Tip 21 — confidence 0.41

> we're using a torque skip move to feed feed feed two and a half inches onto the work piece we're allowed to come up 50 0

we're using a torque skip move to feed feed feed two and a half inches onto the work piece we're allowed to come up 50 000 short or overrun by 50 000 if we torque out at greater than 50 000 short or overrun by more than 50 thousands the machine will alarm out and we're trying to feed into the work piece at 15 percent piece at 15 percent piece at 15 percent load to know it's seated at 40 inches per minute per minute per minute once we've reached our torque skip position position position we shut off torque limiting command with g28 g28 g28 clamp the sub spindle turn off the chuck interlock

_Signals: camOps:1 · params:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-wzJrocvyIBs-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/wzJrocvyIBs.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].