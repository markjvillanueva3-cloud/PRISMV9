---
title: "Fusion 360 Tutorial: Program the Titan-1M (OP1) | ACADEMY"
domain: cam
source: youtube
videoId: hTxaDxr5-Ik
url: https://www.youtube.com/watch?v=hTxaDxr5-Ik
channel: "TITANS of CNC MACHINING"
duration_s: 3278
tribal_entries: 38
chunks_scanned: 69
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Fusion 360 Tutorial: Program the Titan-1M (OP1) | ACADEMY

**Channel:** [TITANS of CNC MACHINING](https://www.youtube.com/watch?v=hTxaDxr5-Ik)
**Duration:** 54m 38s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 38 of 69 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.44

> as I've selected five different tools that we're going to program today to finish operation number one on this part righ

as I've selected five different tools that we're going to program today to finish operation number one on this part right here we have a finished part that we drew up at 3/4 of an inch an inch an inch by 1 point 9 by 4 inches our finished stock that we called out is actually 1 inch so that means that there's a quarter inch at the bottom because where the part is only 3/4 of an inch so it leaves a quarter inch then the stock is the standard rectangle bar is two inches wide the part is 1.9 so that's the difference of one hundred thousandths we're going to divide that in half so we have an

_Signals: camOps:1 · params:2_

### Tip 2 — confidence 0.43

> axis Z is highlighted all I have to do is hit somewhere on the line that represents z axis so it's up and down I'm comin

axis Z is highlighted all I have to do is hit somewhere on the line that represents z axis so it's up and down I'm coming up and down so I want to hit this line right here so I highlight it I click it and now it's got its edge now it went to X so where's X X is here so I come over here and I actually click this line and you can see the coordinates it actually rotated it's not correct yet so there's a few things that I have to tell the software so is my XY 0 off the rough stock or the finished part which is gonna be inside so it's an imaginary line inside like 50 thousandths of this rough

_Signals: camOps:2 · howto:2_

### Tip 3 — confidence 0.45

> stock so I want it to be off the part so I'm always thinking part basically when I move 1/2 an inch over I always want t

stock so I want it to be off the part so I'm always thinking part basically when I move 1/2 an inch over I always want to be thinking edge apart that looks like a half an inch that's what I'm measuring that's perfect I want my numbers to be absolute so when it says box point I'm actually gonna click this and I'm gonna say model say model say model box point and then you see the little white dots actually went off of stock to model then I'm going to click this little dot right here and boom where X Y Z moved over the location I'm looking at the orientation I can see that my Z is correct but my

_Signals: safety:2 · howto:2_

### Tip 4 — confidence 0.41

> and feeds right so it says 10,000 rpms I'm gonna slow all of this programming down I got a lot of students that are watc

and feeds right so it says 10,000 rpms I'm gonna slow all of this programming down I got a lot of students that are watching and they have machines that might only run it a few thousand rpms so looking at some of the smaller machines I'm going to program everything at 4,000 rpms and then at the end when we cut the metal I'll do it at 4,000 or below and then I'll do another sample running at 10,000 and we'll look at the time it took to actually run it on this machine versus the time it took at the higher feed rates and spindle rates to see how much time we're actually saving so right now I'm

_Signals: params:2_

### Tip 5 — confidence 0.47

> going to change this to 4,000 it automatically changed my service footage my ramp spindle speed is exactly the same my c

going to change this to 4,000 it automatically changed my service footage my ramp spindle speed is exactly the same my cutting feed rate that I'm using to actually cut the material I'm gonna slow down to 25 inches per minute it changes my feed per tooth my lead in feed rate I'm just gonna keep them all 25 ramped 25 we're not using any of it at this time but I'm putting it right in place I'm gonna select the geometry select the geometry select the geometry it shows the stock contours there's nothing selected and it shows me a yellow line around the box right here and it's basically saying

_Signals: toolpath:1 · params:1 · howto:4_

### Tip 6 — confidence 0.41

> point five right so it knows it has a 3 inch tool so it's gonna offset that's gonna offset that's gonna offset that's en

point five right so it knows it has a 3 inch tool so it's gonna offset that's gonna offset that's gonna offset that's enter off the parts with drops down into air and then it's going to start cutting material but once it gets to the edge in the center of the tool to the center of the edge it's going to stop but if it stops or starts arcing out it could leave a line right there the surface finish here will be different than how it started over here so what I'm going to do is I'm actually going to have it come off the part until the entire tool has disengaged the material so right here on past

_Signals: camOps:1 · params:1_

### Tip 7 — confidence 0.45

> down looks fine maximum distance that's just saying when you're in the cut and you're moving around what's the maximum y

down looks fine maximum distance that's just saying when you're in the cut and you're moving around what's the maximum you can actually move around in this case it doesn't even come into place so I'm just gonna leave it alone we're coming into lead ends and lead outs and transitions we have a point three radius I'm gonna just leave that alone as far as a vertical lead-in everything looks fine so I'm just gonna hit OK and boom it just made the toolpath so I'm gonna look at the tool path I can see that the tool comes down here it arcs in moves across it's off the part and it arcs up if I wanted

_Signals: toolpath:2_

### Tip 8 — confidence 0.43

> to I can actually go in and make adjustments to the tool path so just to show you how I would do that face mill so let's

to I can actually go in and make adjustments to the tool path so just to show you how I would do that face mill so let's just make that radius a little bit smaller so I right clicked it I'm gonna hit add I'm gonna go back to linking I'm gonna go to the leading radius I'm the hit point zero 50 this is a small little radius boom so then I hit okay and all of a sudden you can see that the radius is much smaller so it just drops down has a slight little radius shoots across the part I could flip the part around comes up it has an arrow this is the direction it's going so it came down came across

_Signals: toolpath:1 · camOps:1_

### Tip 9 — confidence 0.47

> and now it's up so now I'm gonna look at tool number two there's a three quarter inch diameter three flute and mill I ha

and now it's up so now I'm gonna look at tool number two there's a three quarter inch diameter three flute and mill I have a flute length of one inch so that I can actually drop down 750 or 760 just overtake it a little bit and walk around the parts so the cutting flutes the length is actually one inch so when looking at roughing this entire part how can I rough it the fastest meaning I have to cut around the outside I got to cut the cut out and I actually got to cut the pocket there's different level changes so even though this is a simple part with just a few level changes the easiest way

_Signals: toolpath:1 · camOps:2 · howto:1_

### Tip 10 — confidence 0.54

> to do it is actually going up to 3d and hitting adaptive clearing because it sees the entire part and it knows where to 

to do it is actually going up to 3d and hitting adaptive clearing because it sees the entire part and it knows where to go once I establish certain perimeters and fill it all my boxes it'll know exactly where to go and it'll cut the inside pocket the cut out and the outside all at the exact same time so I'm gonna hit adaptive clearing I'm gonna go in and grab my tool we're gonna come in click this bad boy again and we have a 3/8 and mil all right so we're gonna come down 3/8 3/8 3/8 right there hit OK now that our tool is selected and I can see that the coolant is on flood I'm just gonna go

_Signals: toolpath:3 · camOps:1 · howto:1_

### Tip 11 — confidence 0.47

> down and I'm gonna start tabbing through and setting all my speeds and feeds and then I'm going to walk through all the 

down and I'm gonna start tabbing through and setting all my speeds and feeds and then I'm going to walk through all the tabs like we did on the previous tool I'm gonna hit 4,000 my feed rate is gonna be 25 I'm just gonna make my lead-in feeder 825 lead out 25 my ramp I'm gonna put it 15 so I can adjust it 15 and now I'm ready to go when you're looking at your ramp feed rate I know that I'm gonna helical into solid material so I set a different value a different feed rate so that when it helical Xin it goes a little bit slower than its actually feeding now that this looks good I'm gonna go up

_Signals: toolpath:2 · howto:2_

### Tip 12 — confidence 0.52

> to my geometry and adaptive clearing I'm actually gonna leave the machinee boundary as none I can see the yellow line ar

to my geometry and adaptive clearing I'm actually gonna leave the machinee boundary as none I can see the yellow line around here it already knows where the parts at and it knows that it's gonna rough everything possible within those lines so on contours I'm not gonna select anything because it will rough everything possible when I look at my part I have a pocket I have a cutout and I have the outside and I want all of those surfaces to be cut at the exact same time I'm gonna leave rest machining on and that basically is calculating all the material that's already been removed so if I had

_Signals: toolpath:2 · camOps:2 · howto:1_

### Tip 13 — confidence 0.54

> already gone into the pocket and I had left some meat in the corners rest machining would know that there was a larger t

already gone into the pocket and I had left some meat in the corners rest machining would know that there was a larger tool that went in there there was some meat left so it wouldn't worry about roughing the entire pocket it would just drop into the pocket go and actually take out the excess material if it was a smaller tool so that's a genius function right there in this particular case it knows that I baste the top so it's not going to bring my end mill up and do any roughing on the top surface and that's why I care about it so I'm gonna say everything's fine and we go to my Heights model

_Signals: toolpath:3 · camOps:1 · howto:1_

### Tip 14 — confidence 0.42

> going to leave that alone leave that alone leave that alone my optimum load I'm gonna change that it's a 3/8 cutter I'm 

going to leave that alone leave that alone leave that alone my optimum load I'm gonna change that it's a 3/8 cutter I'm going all the way to the bottom so I'm gonna say point 100 thousands on the diameter will be my optimal load minimum cutting radius I'll actually drop that down machine cavities yes you slot clearing it's a special way of clearing slot so I'm not gonna worry about that right now about that right now about that right now direction climb cutting maximum roughing step down that means if I'm dropping down 500 thousands in the pocket I can say don't go more than one hundred

_Signals: toolpath:1 · howto:2_

### Tip 15 — confidence 0.4

> thousandths or two hundred thousandths in this particular case because I'm gonna wrap all the way to the bottom then tak

thousandths or two hundred thousandths in this particular case because I'm gonna wrap all the way to the bottom then take a smaller radial I'm just gonna go straight to the bottom so that I used my entire tool at a half an inch deep and I'm gonna say maximum step-down is 0.8 why did I hit point eight because my depth was 760 and I didn't want to take that in a couple stages I just wanted to take it one shot it knows that my pocket is a half an inch deep and I'm gonna leave material on it so it'll already know how deep to go so I put point eight it's perfect stock to leave I'm just gonna say

_Signals: toolpath:1_

### Tip 16 — confidence 0.69

> faster so on this particular one I'm gonna go 100 inches a minute just saying when you're not cutting but you're still i

faster so on this particular one I'm gonna go 100 inches a minute just saying when you're not cutting but you're still in feedrate mode go a hundred inches a minute instead of 25 lead in radius 0.3 I'm gonna just make it a little bit smaller maybe 150 point 150 wrapping I'm doing a helix 2 degree I'm using a 3/3 tool it can actually it can handle a nice ramp I'm not gonna go too aggressive though we're teaching so I'm just going to put 4 degrees on the ramp angle on the helical ramp diameter helical ramp diameter helical ramp diameter that's the diameter that I'm actually healing down into

_Signals: toolpath:6 · params:3_

### Tip 17 — confidence 0.7

> the pocket so I have a 3/8 tool so Center to Center as this thing ramps down I just want it to be a little bit smaller t

the pocket so I have a 3/8 tool so Center to Center as this thing ramps down I just want it to be a little bit smaller than 3/8 meaning 0.375 so I'm going to say point 350 I'm gonna say minimum is like point 3 everything looks good everything looks good everything looks good so I'm gonna say okay it's calculating the adaptive clearing rough the adaptive clearing rough the adaptive clearing rough classes and there you go all your tool Pat's so basically what we see is that it's gonna drop down over here it's gonna helical in to the pocket it's going to run the entire pocket roughing leaving

_Signals: toolpath:6 · camOps:3 · howto:1_

### Tip 18 — confidence 0.55

> ten thousandths they're just going to come over here it's gonna actually rough the side then it's gonna drop back over h

ten thousandths they're just going to come over here it's gonna actually rough the side then it's gonna drop back over here it's gonna actually profile the entire part and lift up so we can simulate this I'm gonna right-click on this tool path I'm gonna hit simulate you see this box that pops up over here I'm actually gonna say yes I want to see the stalk I want to see the tool path I could make it transparent if I wanted to which makes it transparent but I'm actually going to leave it alone and let's go down here and press play and see that tool path so it's cutting the outside coming around

_Signals: toolpath:3 · camOps:1 · howto:2_

### Tip 19 — confidence 0.51

> the front I'm actually moving it it steps up boom boom now it's gonna drop down I'm gonna speed it up now is just going 

the front I'm actually moving it it steps up boom boom now it's gonna drop down I'm gonna speed it up now is just going to town roughing the entire part Oh looks good all right so we got a lot of confidence now of confidence now of confidence now so we already faced it we did an adaptive tool path which we roughed out the center we roughed out the edge walked around the entire part now we're ready to go I'm gonna close this window go back to the solid model which shows the tool path of the last tool and now I'm gonna come in here I'm actually going to start finishing the part so I'm gonna

_Signals: toolpath:3 · howto:1_

### Tip 20 — confidence 0.54

> come into 2d now I'm gonna drop down and actually just do a 2d contour everything looks good my geometry there's no cont

come into 2d now I'm gonna drop down and actually just do a 2d contour everything looks good my geometry there's no contour selected so I'm just gonna hit down here I'm gonna actually select and you see everything highlighted I'm going around the outside of the part so I'm gonna click this line and I'm ready to go I hit Heights I'm gonna point for reach out point to bead point one model top is zero and the depth of the cut is negative point seven 60 looks good save my passes now I'm doing a finished pass so having at 4/10 is is perfect we're Clym cutting we're doing cutter comp when we do

_Signals: toolpath:2 · camOps:2 · howto:3_

### Tip 21 — confidence 0.42

> cutter comp adding a g-41 to it I'm gonna actually hit wear which is going to allow our post to create the cutter comp e

cutter comp adding a g-41 to it I'm gonna actually hit wear which is going to allow our post to create the cutter comp exactly how we do it where it's center of the tool which is off the part and it does the g-41 or the D value goes around the part comes off so you have the compensation allowance the radius allowance I'm going to say that that's fine make sharp corners know multiple finish passes no feed rate finish feed rate 25 that's what I had it at so I'm gonna just leave that alone I'm not adding any overlapping I'm not adding anything I'm rolling around the corners that's fine I'm gonna

_Signals: camOps:2 · howto:1_

### Tip 22 — confidence 0.72

> I'm gonna hit OK just like I said you can see it drops down right there feeds in walks all the way around the park looks

I'm gonna hit OK just like I said you can see it drops down right there feeds in walks all the way around the park looks good beads out so now what do I have to do so now the the part is perfect - sighs now I've roughed it up finish the outside so now I have to finish this pocket and finish this pocket right here so let's do that by actually creating a 2d pocket so I'm gonna hit pocket my tool is already selected my rpms and feed rates are already selected I'm gonna go to geometry pocket selections so I'm gonna come down here I'm actually gonna go to the bottom of the pocket it'll highlight

_Signals: toolpath:6 · camOps:4_

### Tip 23 — confidence 0.46

> the entire pocket I'm gonna say okay it makes everything blue then I'm machining then I'm going to come down to the cuto

the entire pocket I'm gonna say okay it makes everything blue then I'm machining then I'm going to come down to the cutout and I'm gonna click this guy and it makes everything blue and I'm gonna go on to Heights they don't come up to the heights top I hit point 4.2.1 auto top is zero now the deepest point that I'm actually gonna go down is 0.5 because a pocket and the cutout is actually 0.5 D you see it right up here on the print so on here I'm gonna go negative 0.5 because I don't want it to go 760 their deepest it can go is 0.5 maybe it passes I got on my tolerance I got some nice contours

_Signals: toolpath:2 · howto:1_

### Tip 24 — confidence 0.44

> in here so I'm actually gonna take this down to four tenths down to four tenths down to four tenths I'm climbed milling 

in here so I'm actually gonna take this down to four tenths down to four tenths down to four tenths I'm climbed milling minimum cutting radius is zero I'm not gonna worry about finish passes because I'm finishing the bottom and the sides in this movement right here maximum step over it says 356 maximum step over meaning how far it steps over each time it takes a cut I'm gonna leave it alone at 356 I'm not gonna worry about more spiral machining click allow' step over cus that means like if you're in a radius and and you're stepping over and stepping over you can actually leave a little divot

_Signals: toolpath:1 · camOps:1 · howto:1_

### Tip 25 — confidence 0.4

> that actually sticks up a little cusp so will not be clicking this box smoothing deviation again I'm just going to click

that actually sticks up a little cusp so will not be clicking this box smoothing deviation again I'm just going to click 4/10 it's just so it's nice and beautiful no multiple depths stock to leave I'm finishing it now so I'm gonna unclick that everything looks absolutely perfect I'm gonna click linking as I walk through here everything looks perfect perfect perfect stay down distance 2 inches it really doesn't matter right now remember now everything's been a hard out so I'm just dropping in and I'm basically just radius in in or ramping in to the cut finishing the part and getting out I'm

_Signals: params:1 · howto:2_

### Tip 26 — confidence 0.61

> going to leave 37,000 going to leave 37,000 going to leave 37,000 on the radius my angle I'm just gonna change it to 45 

going to leave 37,000 going to leave 37,000 going to leave 37,000 on the radius my angle I'm just gonna change it to 45 leave 35 my vertical leading radius the same thing I'm gonna leave it alone leave the exit as the same as the lead-in so both boxes are perfect when it comes to ramp I don't need to ramp all the way down because the material is already gone so I'm gonna plunge and it has a ramp clearance height so I'm basically gonna plunge down and then it's gonna go right into my radius we're just gonna go right into the wall we're just gonna make a perfect cut so I'm gonna leave that

_Signals: toolpath:5 · howto:1_

### Tip 27 — confidence 0.48

> alone drill positions on this it doesn't really matter right here I'm gonna click okay and boom there's a finish pass al

alone drill positions on this it doesn't really matter right here I'm gonna click okay and boom there's a finish pass all right guys so we just finished tool to the three-eighths and milk the three-eighths and milk the three-eighths and milk now we're gonna sham per the edges just break that edge so it's not sharp nobody's getting cut and then we're gonna use the same quarter-inch sham per mil tool 3 and we're going to spot each hole that we're gonna drill in thread we're gonna go to D to D sham fer I'm gonna go select gonna go select gonna go select tool number three tool number three tool

_Signals: camOps:3 · howto:4_

### Tip 28 — confidence 0.59

> number three we're going with a quarter-inch sham per mil 4000 rpms with a drop down here 25 inches a minute nice and sa

number three we're going with a quarter-inch sham per mil 4000 rpms with a drop down here 25 inches a minute nice and safe 25 inches a minute 25 inches a minute 25 inches a minute I'm going to hit a geometry I'm gonna select the outside I'm going to select the inside for our contour selections so I'm going to climb on the outside drop in here my arrows they're going in the right direction everything looks good I'm gonna go over here to the heights I'm gonna hit model top I'm just gonna go through and do all of them model top I'm at point 4 retract I've got a point to feed point 1 0 0 because

_Signals: toolpath:1 · params:5 · howto:4_

### Tip 29 — confidence 0.45

> that's pretty easy is I can actually come down here actually duplicate it duplicate sit the tool path and then I just co

that's pretty easy is I can actually come down here actually duplicate it duplicate sit the tool path and then I just come over here and edit the tool path and then when I come over here everything is exactly the same same same I can hit geometry boom I get rid of these two I can just hit this guy down here just a nice little shortcut right so now come over here to Heights everything is exactly the same come over here to passes I'm gonna leave everything the same except on the bottom I don't want to hit here so the tool we're using the bottom of this tool so the tool diameter is actually

_Signals: toolpath:2_

### Tip 30 — confidence 0.4

> show you something if you look at select same diameter and click this guy it automatically hits all the same diameters a

show you something if you look at select same diameter and click this guy it automatically hits all the same diameters and then you hit optimize order and actually start here and go the shortest route right there so everything looks absolutely perfect it Heights I'm gonna keep model top so on the clearance I'm going to keep it at point four point two point one zero but how deep are we going so we have a 45 a 90 degree included angle as we go down if I go 50 thousandths it's gonna open up to a hundred thousands diameter if I go down a hundred thousandths it'll open up too if I go down a

_Signals: params:1 · howto:2_

### Tip 31 — confidence 0.41

> hundred thousandths it'll open up to a two and a thousands diameter so I have a 1032 thread that I'll be putting in each

hundred thousandths it'll open up to a two and a thousands diameter so I have a 1032 thread that I'll be putting in each one of these holes that's point one nine diameter I'm going to add about a 10% chamfer on the outside of it so the lead for the thread is what we're creating right now so I'm gonna add say point plus point zero 20 it's like 19,000 would be but I'm just gonna put like 20 divided by 2 equals 105 so point 105 so we make our depth right here negative point 1 0 5 then you go up to our cycle we're gonna we're gonna keep it right here we're just gonna go drill because I just want

_Signals: camOps:2_

### Tip 32 — confidence 0.58

> to like drill in and wrap it out I'm gonna press okay alright so now that we spotted each hole to make way for the drill

to like drill in and wrap it out I'm gonna press okay alright so now that we spotted each hole to make way for the drill so the drill goes in nice and straight we're actually going to program the drill it's tool number 4 on your setup sheet your setup sheet your setup sheet it's a 177 drill which is the pre drill size board to thread so I'm gonna come back up to drill I'm gonna select my tool we're going to a 177 drill we're gonna okay it put it at 4,000 rpms I'm just gonna feed in at 15 inches a minute with my drill my retrack trait is 40 select faces we're already there I'm going to grab

_Signals: camOps:9 · params:2 · howto:2_

### Tip 33 — confidence 0.45

> this guy right here select same as diameter go back to my Heights Model top so point four point two one now how deep do 

this guy right here select same as diameter go back to my Heights Model top so point four point two one now how deep do we go so the model top we're actually going to offset so the thread it calls out for a thread that's point three eighty deep every tap actually has a lead a good way to measure that lead would be going on a comparator actually standing it up zooming it and looking at where the full thread diameter starts and then you can see that diameter right there to the tip of the tap that distance is your lead before your thread actually starts so I need to drill with a point one seven

_Signals: camOps:3 · howto:1_

### Tip 34 — confidence 0.42

> seven drilled deeper than I tap to make way for that lead right there I'm gonna go to hundred thousandths thousandths th

seven drilled deeper than I tap to make way for that lead right there I'm gonna go to hundred thousandths thousandths thousandths deeper so instead of 380 I'm gonna go negative 0.5 eighty all right so now we're coming to the cycle we're actually gonna come up here we're gonna go down we're gonna hit deep drilling full retrack that means the drills going to drop inside engage the material come out get the chip out allow coolant to get into the hole and then drill again come out cooling goes in chip comes out drills boom boom deeper and deeper I'm just gonna leave 50 thousandths you can

_Signals: camOps:2 · howto:1_

### Tip 35 — confidence 0.5

> actually reduce your pecks actually reduce your pecks actually reduce your pecks so if you go 50 thousands the next one 

actually reduce your pecks actually reduce your pecks actually reduce your pecks so if you go 50 thousands the next one you could go 40 or 30 but I'm not gonna do that I'm gonna keep that at zero my minimum my minimum right here is gonna be point zero five exactly the same I could dwell at the bottom and let it sit for a second but I'm not going to do that either that either that either and boom last tool we have is a 1032 roll tap roll tap roll tap it's a right-handed tap basically going in clockwise creating the thread and coming back out when actually here drill alright and for our fifth

_Signals: camOps:5_

### Tip 36 — confidence 0.48

> and last tool we're gonna drop down right here in this right hand tap right here point 192 this guy is a 1032 roll tap o

and last tool we're gonna drop down right here in this right hand tap right here point 192 this guy is a 1032 roll tap or form town but when you jump over to the rocket which is the lathe series we're gonna have all cut taps so you're gonna learn about both types of taps use them both through the two series all right so we got it let's go ahead and click it boom there's my tool I'm gonna keep it at 1000 rpms I'm gonna come up to the geometry select selected faces I'm going to do the exact same thing I did before when I click down here I'm gonna say same as diameter that I already selected hit

_Signals: camOps:2 · params:1 · howto:4_

### Tip 37 — confidence 0.43

> that I'm gonna go to my Heights right here I'm gonna change all these to model top retrack I'm gonna keep it the same po

that I'm gonna go to my Heights right here I'm gonna change all these to model top retrack I'm gonna keep it the same point two feet high point one the top height is zero we're gonna say bottom height we drilled at 580 I'm going to tap at 480 so I'm going to go negative two point four eight go up to my cycle it says tapping I'm actually going to come down there and click right hand tapping so boom there we go the program is done go right up here actually simulate the entire part okay so let's go through all the movements so I'm gonna come over here I'm actually gonna turn transparency off

_Signals: camOps:2 · howto:2_

### Tip 38 — confidence 0.57

> move this around right here I'm gonna hit and go we're facing the top I'm gonna speed it up just a little bit so that's 

move this around right here I'm gonna hit and go we're facing the top I'm gonna speed it up just a little bit so that's tool one tool two three a 10 mil going around chops on the side does the cutout and boom boom boom we're roughing it leaving ten thousandths heal it clean in down into the pocket now we are roughing the pocket leaving ten thousands on the bottom leaving ten thousands on the sides we're going to town right here everything's looking perfect now we already know that we're expecting that same tool to come over into a finish boom there's a finish there's a finish there's a finish

_Signals: toolpath:2 · camOps:4_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-hTxaDxr5-Ik-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/hTxaDxr5-Ik.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].