---
title: "Fanuc 6T setup G50 tutorial.  Ikegai AX20 CNC lathe."
domain: lathe
source: youtube
videoId: aX-I548Gy2E
url: https://www.youtube.com/watch?v=aX-I548Gy2E
channel: "Carl Crawford"
duration_s: 4730
tribal_entries: 49
chunks_scanned: 98
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Fanuc 6T setup G50 tutorial.  Ikegai AX20 CNC lathe.

**Channel:** [Carl Crawford](https://www.youtube.com/watch?v=aX-I548Gy2E)
**Duration:** 78m 50s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 49 of 98 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.51

> else to use and also those are individual per Tool offsets uh not a global everything offset so uh usually on these mach

else to use and also those are individual per Tool offsets uh not a global everything offset so uh usually on these machines you set them up using what's called a G50 uh G50 uh G50 uh grid shift or some people will call it a G50 reference point reset and it's really not that hard to do you just have to get your head wrapped around how it's different uh different uh different uh [Music] [Music] [Music] 1982 they didn't have a lot of memory uh so there are things that they just didn't Implement because they were expensive because they didn't have much memory memory memory in this machine here

_Signals: gcode:4 · howto:1_

### Tip 2 — confidence 0.41

> and down all your addresses numbers addresses numbers addresses numbers uh and then some editing keys so we're in the po

and down all your addresses numbers addresses numbers addresses numbers uh and then some editing keys so we're in the position screen and by using page up and down we can go between all the different screens in the position so you've got your absolute your or your incremental your absolute and then your 100 screen there 100 screen there 100 screen there to reset the machine uh to the uh to do a zero return a zero return a zero return into rapid into rapid into rapid I turn it down to a low speed and then I move the machine off of the limit switch so I move it in in Z and in x now I turn the

_Signals: camOps:2_

### Tip 3 — confidence 0.51

> we're all zeroed out and our LEDs are on for zero return return return what we are making today is this is this is this 

we're all zeroed out and our LEDs are on for zero return return return what we are making today is this is this is this a simple part a simple part a simple part super simple so we've got some inch and a half bar stock in the lathe and uh to do this part we're going to use uh three four tools essentially we're going to do a turn and face with uh our cnmg 80 degree Tool uh which we'll call our reference Tool uh then we're going to do a drill operation a drill operation a drill operation and then we're going to do a parting operation we're going to part off and then we will push a bar puller

_Signals: camOps:4 · params:1 · howto:1_

### Tip 4 — confidence 0.5

> chuck of the chuck of the chuck and number one that's my first operation cnmg positive rate it's in tool station one one

chuck of the chuck of the chuck and number one that's my first operation cnmg positive rate it's in tool station one one one and so that's what I've got here operation one cnmg turn and face turn station one insert station one insert station one insert cnmg432 cnmg432 cnmg432 if I search our next operation step drill so drill 406 and that is in turn station six and I'm actually also physically checking what turret station I'm in I'm in I'm in so my first operation so my first operation so my first operation turret station one correct turret station six for drill correct cut off towards

_Signals: camOps:6_

### Tip 5 — confidence 0.44

> but this time I've got the drill in a different station we would have to go in and modify this and modify this and modif

but this time I've got the drill in a different station we would have to go in and modify this and modify this and modify this and anywhere else that there's a tool number number number but in this case I don't really move my tools around all that much when I do big drills they're in in T6 uh tool number one is usually my cnmg turn and face cut off in toolstation 5 and then my bar puller is in tool station four four four now some of these I've already got my X offset written in offset written in offset written in why is it that I have my ex off offset already figured out how do I know that

_Signals: camOps:2 · howto:3_

### Tip 6 — confidence 0.44

> add 250 000 approximately to that and we're going to do 1

add 250 000 approximately to that and we're going to do 1.5 so we're going to bring out our Z zero to 1.5 that's how far we're going to pull this going to pull this going to pull this but since we're going to do a cut off here there's this is a rough cut here we're going to add 30 thousands to that so we have a little meat to cut off so we're going to set calipers to 1.530 calipers to 1.530 calipers to 1.530 [Music] is established with our first tool a zero on the part we're going to do that in Z and then we're also going to do it on X now we're starting to get into talking about G50 and

_Signals: camOps:1 · gcode:1 · howto:1_

### Tip 7 — confidence 0.44

> being able to set our coordinate system so to do this let's change over to our number one tool so this machine that's ei

being able to set our coordinate system so to do this let's change over to our number one tool so this machine that's either handle jog or rapid and then we turn our entry knob to to to um um um turret and we turn that to Turret station one this has got a weird setup here they have what they call their entry knob this is cooling on cooling off spindle on spindle off high and low range uh which this machine only has one gear and spindle and then you so you set that all up and you press the entry button and then the turret will index so we've brought that around to Tool number one which we're

_Signals: camOps:2 · howto:3_

### Tip 8 — confidence 0.4

> going to use as our reference Tool uh so what we need to do is bring that tool in touch it off on on Z actually we're go

going to use as our reference Tool uh so what we need to do is bring that tool in touch it off on on Z actually we're going to make a little cut uh so we're going to go to MDI mode command command command um and we'll do g97 inputs inputs inputs spindle 650 let's do spindle 650 and then we're going to do M3 input so we've got these three words in there g97 so we'll do an RPM we'll do an RPM we'll do an RPM spindle RPM 650 start and forward [Music] and now the spindle is reasonably close we're going to move to handle mode Z all over the position so you can see that it's going to take a little

_Signals: gcode:1_

### Tip 9 — confidence 0.4

> bit more than that thank you thank you now we're going to take a little cut okay we're going to go back in MDI and we're

bit more than that thank you thank you now we're going to take a little cut okay we're going to go back in MDI and we're going to do M5 [Music] [Music] [Music] just because you won't be able to hear me with that spindle going okay so what have we done you've gone in with the number one tool and we've faced off slightly our bar off slightly our bar off slightly our bar so what we faced off here you just face this up that is z zero so with this tool we are establishing where our Z zero is now how do we how do we how do we do that we go to our position page position page position page and and

_Signals: gcode:1_

### Tip 10 — confidence 0.42

> dummy check I don't get the tape measure out when I do it but in my mind I'm doing the dummy check Okay so so so that's 

dummy check I don't get the tape measure out when I do it but in my mind I'm doing the dummy check Okay so so so that's where that number goes this tool is now ready to be entered into our program so we could for instance go into our program our program our program and here on our G50 right there right there right there when I send it from the computer it's got x00 got x00 got x00 but I could put this number in right there there there but we've got a bunch more tools to do so let's set up another Tool uh we'll set up these four tools and then we'll look at the program look at the program look

_Signals: gcode:1 · howto:2_

### Tip 11 — confidence 0.5

> at the program our second tool is a drill so we need to bring that up bring that up bring that up so we're going to go i

at the program our second tool is a drill so we need to bring that up bring that up bring that up so we're going to go into handle handle jogger rapid jogger rapid jogger rapid go to our entry knob our drill is its station six operate [Music] [Music] [Music] I'm gonna bring the drill around now the drill now the drill now the drill we already know what our X is because that's one of our pods that we know the center line of the pod in X so we just need to do Z need to do Z need to do Z so I want you to think about for a second here is our Z number going to be larger or smaller than this 13.

_Signals: camOps:6_

### Tip 12 — confidence 0.5

> okay think about that for a minute is our Z going to be larger and smaller remember these numbers here that that are goi

okay think about that for a minute is our Z going to be larger and smaller remember these numbers here that that are going to be entered for our x50 or G50 G50 G50 those numbers represent the tip of the tool tool tool to the part so think think in your mind is that going to be a bigger or smaller number okay so we're going to go into wrap it here and move this tool in a little bit closer a little bit closer a little bit closer because we are not going to do X for this Center working tool our concentric tool tool tool all we have to do is in z now because we are drilling a through hole hole

_Signals: gcode:3_

### Tip 13 — confidence 0.42

> distance that's established now we're going to go back into MDI and do our g28 input u0w or u0w0 start or u0w0 start or 

distance that's established now we're going to go back into MDI and do our g28 input u0w or u0w0 start or u0w0 start or u0w0 start watch our numbers here this is going to take us back home you don't really care what the absolute is here care about the relative which is where we set our zero so that W number right there the number we need to set up in our setup book 9.0804 okay notice that's a smaller number number number let's dummy check that let's dummy check that let's dummy check that that's nine inches there you go that's our nine inches because that number that G50 number that we're

_Signals: gcode:1 · howto:2_

### Tip 14 — confidence 0.4

> machine surface that machine surface that machine surface we know that we are pretty much at X 1

machine surface that machine surface that machine surface we know that we are pretty much at X 1.486 right now 1.486 right now 1.486 right now so to figure out to get that to a G50 number that we can use gonna go to that axis origin now we're going to take ourselves going to take ourselves going to take ourselves off the surface of the park X plus we're going to go Z out where we get it away from the away from the material and now we're going to make this we're going to bring that axis down to negative 1.486 negative 1.486 [Music] okay there we go so now stool tip is along the spindle Center

_Signals: gcode:1_

### Tip 15 — confidence 0.41

> it's about 13 and that's about 13 as well in diameter six and a half inches like that one more tool puller let's do that

it's about 13 and that's about 13 as well in diameter six and a half inches like that one more tool puller let's do that polar is in station four handle jogger rapid entry button to a four four four [Music] [Music] [Music] depending on your machine Builder this this is all going to be different okay so now we're going to go and wrap it and bring that puller over now because this puller is a concentric working tool working tool working tool I already know what my X is it's 18.8900 so really all we have to do here is in z once again like our drill and it was because our drill was only uh going

_Signals: camOps:2_

### Tip 16 — confidence 0.5

> now accurate we don't care about that because we already know the center line of that pot that is accurate for this tool

now accurate we don't care about that because we already know the center line of that pot that is accurate for this tool and our work piece so we're going back to MDI g28 input u0 input w0 input start position see that's going up and that's going to be our number 12.4193 from W our incremental companion accent active access access accent active access access accent active access access to Z so there's our completed setup sheet okay this information now goes into the program screen let's talk a little bit about G50 little bit about G50 little bit about G50 so now we're going to go into edit

_Signals: gcode:3_

### Tip 17 — confidence 0.4

> machine to do is go back home go back to your zero return that's a very safe thing to do and you will see that in all of

machine to do is go back home go back to your zero return that's a very safe thing to do and you will see that in all of my Preparatory steps okay next thing is I'm telling the machine is G50 reset your coordinate system and I'm going to tell you where to reset your coordinate system and that is where we enter this number here so we're going to go and highlight that first work and we're going to say X team point 1904 okay and I make sure it drives and then we hit alter then we hit alter then we hit alter and it will substitute in that X now we go to the Z and we say Z 13.39 68 68 alter okay

_Signals: gcode:1_

### Tip 18 — confidence 0.56

> instate any offsets then our next step is g96 go into a constant surface footage speed mode uh we want spindle speed 550

instate any offsets then our next step is g96 go into a constant surface footage speed mode uh we want spindle speed 550 surface feet per minute m03 turn on the turn on the Chuck in a forward Direction next line G50 or why is there a G50 again G50 is used for two things in these machines remember what I said about memory there ain't much so they've reused G50 G50 is also valid with an s word after it okay word after it okay word after it okay and what you're telling it here is G50 s 3000 spindle speed 3000 we are telling it a maximum spindle speed even though we're in g96 mode and we're

_Signals: camOps:2 · gcode:6_

### Tip 19 — confidence 0.41

> giving it a surface feet per minute surface feet per minute surface feet per minute we are telling it in a g50s that a m

giving it a surface feet per minute surface feet per minute surface feet per minute we are telling it in a g50s that a maximum maximum maximum RPM limit of 3000 RPM so as the spindle approaches zero it's not going to go to 6000 or whatever this machine will do okay next command then is a rapid so now we're getting ready to do some work rapid to x 1.6 which is a tiny bit above the OD of our part rapid to x 1.06 zero so you're asking it to come right there to come right there to come right there and turn the coolant on and then our next line is start Machining down the face at this feed rate

_Signals: camOps:1 · params:1_

### Tip 20 — confidence 0.4

> it home to send it home I am going to change how I do this a little bit I should probably not on in state state state a 

it home to send it home I am going to change how I do this a little bit I should probably not on in state state state a geometry offset like this because this can cause the axis to jump because when you uninstate it like that with that zero zero it will jump a little bit it can it'll Jump by that amount that you have in your offset table so so so really this should be done during a return move okay return move okay return move okay um but as I said I don't put geometry offsets in my offset page it's never been an issue but some people that want to use geometry offsets to use geometry offsets

_Signals: safety:1 · howto:1_

### Tip 21 — confidence 0.41

> to use geometry offsets excuse me wear offsets in here you may need to program a slight bit different different differen

to use geometry offsets excuse me wear offsets in here you may need to program a slight bit different different different now we're to our drill so so so once again we're going to come down here and enter our numbers and enter our numbers and enter our numbers so 18.8900 alter 18.8900 alter Z Z Z nine point nine point nine point o eight o four alter okay there we go now we're going to use and the other thing I check is I check to make sure that our tool numbers match the worst thing you can do let me point this out let's say this drill the program was written that it was in tool number six

_Signals: camOps:2_

### Tip 22 — confidence 0.56

> but let's say that I had something else in 206 and I put this drill in tool pocket four pocket four pocket four and I we

but let's say that I had something else in 206 and I put this drill in tool pocket four pocket four pocket four and I went down here and I changed this I said okay well I'm going to run it in four four four t0404 alter right it's great right now it's gonna bring up that tool machine machine machine machine machine machine machine machine machine uh oh what happens there I forgot to change that change that change that t0600 to 0400 t0600 to 0400 t0600 to 0400 what is it going to do when it gets right here right here right here that machine while being one hundred thousandths away from the

_Signals: toolpath:3 · camOps:1 · howto:3_

### Tip 23 — confidence 0.4

> thousandths away from the thousandths away from the the face of the of the material in in z is now going to do what it i

thousandths away from the thousandths away from the the face of the of the material in in z is now going to do what it is now going to do a tool change and it will crash I cannot stress this enough enough enough this machine does what you tell it to do if you tell this machine to punch itself in the face it will punch itself in the face and it will scare the crap out of you and possibly damage your 1982 machine that you can't really get parts for so for so for so you must be extremely diligent when you are changing tools from a proven program and the way I do it if I was going to do this this

_Signals: safety:1 · howto:1_

### Tip 24 — confidence 0.43

> this I would do that change and I would do a t search next right because you can scan through with your eye and miss som

this I would do that change and I would do a t search next right because you can scan through with your eye and miss something you would press T and then you go next it's taking you to that next one we could now change that to t040404 so we're going to go back up here and change this before I make my machine punch itself in the face foreign foreign foreign so we've entered that now we're going to do a number search all right so we number and then search down it's going to show us our next tool cut off tool we're going to go back to our G50 X team team team .3067 alter .3067 alter .3067 alter

_Signals: gcode:1 · howto:3_

### Tip 25 — confidence 0.5

> this is why you really need geometry offsets and not doing this G50 business doing this G50 business doing this G50 busi

this is why you really need geometry offsets and not doing this G50 business doing this G50 business doing this G50 business right because now if we if we decide that one of these uh numbers is slightly off we need to compensate for it we have two places in the program that we need to enter that I get that that's that's a valid reason for work offsets geometry offsets uh and if this was a more modern machine trust me I would not be using G50 but G50 but G50 but it is what it is so we got a second piece cut off so we're going to do this again for cutoff but the kind of parts that I make that I

_Signals: gcode:6_

### Tip 26 — confidence 0.41

> make that I make oh shoot I got that wrong yeah I made it mad the kind of pieces that I make are not complicated are not

make that I make oh shoot I got that wrong yeah I made it mad the kind of pieces that I make are not complicated are not complicated are not complicated I'm not doing hard tool steel in this we're going to cut off so a lot of times my numbers don't really change because you're not really wearing a bunch of stuff out doing 100 pieces in 6061 aluminum right okay now we're to the bar puller so here we've got our G50 and I actually still had that X in there um um um z12 0.4193 altered okay so now I hit reset and I go back in and I go through every one of these one last time and I just put my eyes

_Signals: gcode:1 · howto:1_

### Tip 27 — confidence 0.42

> my position numbers uh I go in this screen here and what I usually watch is this distance to go okay very handy feature 

my position numbers uh I go in this screen here and what I usually watch is this distance to go okay very handy feature feature feature so let's so let's so let's set up set up set up to uh to prove this program out one step at a time and I'll kind of show you uh I won't really be able to show you in the machine so much machine so much machine so much because uh I do have coolant set up but um um um well maybe we'll turn the cooling off we could probably do that could probably do that could probably do that it's time to prove the program how are we going to do that we are going to do that

_Signals: camOps:1 · howto:4_

### Tip 28 — confidence 0.41

> we're in edit mode still reset we're at the beginning of our program of our program of our program we're going to turn o

we're in edit mode still reset we're at the beginning of our program of our program of our program we're going to turn our rapid speed all the way down to low we're also going to turn on single block mode mode mode so what this is going to do is every time we press cycle start it is going to go down a new line of program what I do in my head in my head in my head and I know what all these things mean when they come up here and you need to as well as well as well every time I press the button and it does a step I look at the next line or two and I say in my head do I know what the machine is

_Signals: camOps:2_

### Tip 29 — confidence 0.45

> reasonably look like the amount that I think it has to go there's your dummy check again if this is coming down here and

reasonably look like the amount that I think it has to go there's your dummy check again if this is coming down here and you're down to a a z 10 inches to go and you're right here off the surface of the part you need in your head to start saying wait a second saying wait a second saying wait a second we don't have 10 inches to go there's only two inches to go feed hold feed hold feed hold stop stop stop okay you can always press feed hold regain your control of the situation analyze if that number matches what you got going on in the machine and press cycle start there's very few machines

_Signals: params:2 · safety:1_

### Tip 30 — confidence 0.45

> now we're going to reset the coordinate system coordinate system coordinate system now if we go back to the position now

now we're going to reset the coordinate system coordinate system coordinate system now if we go back to the position now oh next line oh next line okay now we just reset the coordinate system it just executed that line so now so now so now there's our absolute there's our absolute there's our absolute we just with that G50 reset our absolute coordinate system coordinate system coordinate system 13.19 13.39 13.19 13.39 13.19 13.39 that was just that line right there when we executed that G50 line all we did in the machine the machine the machine was reset our absolute coordinate system okay

_Signals: gcode:2_

### Tip 31 — confidence 0.48

> going to turn it into position mode and you can watch as it comes in and we're going to watch together we're still in lo

going to turn it into position mode and you can watch as it comes in and we're going to watch together we're still in low right right right so here here goes so here here goes so here here goes there goes our spindle right set our Max here we're going to start moving moving moving [Music] [Music] [Music] distance to go in Z 12 inches that looks reasonable doesn't it yeah looks good for feeling sporting let's turn it 25 percent percent percent okay whoa stuff's going on now whoa whoa whoa whoa three inches like feet hole hold on I'm not quite sure we have 3.4 inches to go in Z does that look

_Signals: camOps:2 · params:2 · howto:1_

### Tip 32 — confidence 0.45

> reasonable look reasonable look reasonable I think it does cycle start again to be real low here okay all right two inch

reasonable look reasonable look reasonable I think it does cycle start again to be real low here okay all right two inches to go inches to go inches to go looks about two inches right good hover on that button hover on that button hover on that button that looks good we're right where we need to be so now I'm going to turn this up turn off single block and let it run the rest of that program I'm going to turn single block on again as it goes back to the back okay what that lets me do is recollect my thoughts change some stuff around again before we start running in single block now I'm going

_Signals: camOps:3 · howto:1_

### Tip 33 — confidence 0.5

> to have to close the door now because the next one is a drill and we got to run cool it for that drill so that drill so 

to have to close the door now because the next one is a drill and we got to run cool it for that drill so that drill so that drill so here we go we're going to do the same thing though memory single block it just changed the tool we're changing our max speed and here we're going to go towards zx0z.1 zx0z.1 zx0z.1 back to position let's watch that distance to go distance to go distance to go [Music] [Music] [Music] I'm watching through the window and I'm looking at that Z number okay it looks good we're in place single block off let it have some speed finish that okay it's going back home I

_Signals: camOps:5_

### Tip 34 — confidence 0.44

> turned single block on single block on single block on okay it's back up at home now and it's waiting for us to press cy

turned single block on single block on single block on okay it's back up at home now and it's waiting for us to press cycle start again okay and we got a hole in our part so cut off same thing it's going to run coolant let's close the door [Music] [Music] okay 13 inches to go in Z I'm gonna watch through the window looks good let's let it do its thing [Music] as it's going back home I turn single block on block on block on [Music] [Music] [Music] okay now it's going to bring up our turn and face tool again to make our second part our first part is already dropped [Applause] [Applause] [Music]

_Signals: camOps:2 · params:1_

### Tip 35 — confidence 0.47

> [Music] [Music] okay it's going back home okay so the next thing's kind of cool we can leave the door open for this next

[Music] [Music] okay it's going back home okay so the next thing's kind of cool we can leave the door open for this next we've got this tool called a bar puller and really it's just some springy fingers so let's single block that okay we just reset our our coordinate system M12 on this machine means the next time you do a tool change do it backwards this machine is not smart enough to figure out the fastest way to the tool the tool the tool this tool is one below the one we just used so I put the M12 in so we don't have to watch it go around the whole way [Music] [Music] [Music] okay so now

_Signals: gcode:2 · howto:2_

### Tip 36 — confidence 0.47

> we're gonna go to x0 Z negative 1

we're gonna go to x0 Z negative 1.224 because this has been cut off so let's put ourselves in position and let her go and let her go and let her go okay so once again I'm really watching that Z 12 inches yeah we're about 12 inches let's turn it up a little bit nine inches eight seven six okay I'm getting a little scared three two all right turn it back down two inches that's pretty reasonable right okay about one inch to go let's hover on that feed hole feed hole feed hole and it looks like it's right there doesn't it okay so now you can see we've got this little bit of room there so what's

_Signals: camOps:2 · params:2_

### Tip 37 — confidence 0.45

> let's not run this into the Chuck right let's go look right let's go look right let's go look what's the next thing it's

let's not run this into the Chuck right let's go look right let's go look right let's go look what's the next thing it's gonna do well we're gonna put it into g98 which means allow it to move without the spindle moving and we're going to go another another another 200 250 000 in we're going to be we're actually going to be pretty close here so oh yeah see how close we are there it's pretty close but like I said I've run this program before this program before this program before and then and then and then M21 open the chuck G4 which is a pause and now move the part out part out part out at

_Signals: gcode:2_

### Tip 38 — confidence 0.5

> that feed rate at that feed rate at that feed rate M22 close the Chuck M22 close the Chuck M22 close the Chuck a little 

that feed rate at that feed rate at that feed rate M22 close the Chuck M22 close the Chuck M22 close the Chuck a little pause a little pause a little pause because on this machine because on this machine because on this machine you tell the chuck to close there's not actually a actually a actually a there is a Chuck clamp but as soon as you tell it to close it considers it clamped so we give it this pause to let it to let it uh make sure it's closed okay so now g99 call out the thing and then we're going to tell it to go home she goes she goes okay so what did we get for our efforts right and

_Signals: gcode:3_

### Tip 39 — confidence 0.41

> now now we're still in automatic mode okay so even though the program's pretty much done program's pretty much done prog

now now we're still in automatic mode okay so even though the program's pretty much done program's pretty much done program's pretty much done I turn it into edit and I reset it edit and reset it and then when I'm playing with the machine in here I am not in automatic mode I'm in edit mode right mode right mode right turn that single block off [Music] [Music] [Music] so that's what we got for our efforts right a couple two couple a couple bushings that bushings that bushings that low tolerance uh low tolerance uh low tolerance uh low tolerance deals here right so if I look at my drawing over

_Signals: camOps:2_

### Tip 40 — confidence 0.41

> there I want them to be about half an inch thick that is uh definitely close enough I'm not going and changing anything 

there I want them to be about half an inch thick that is uh definitely close enough I'm not going and changing anything for that this is not even a critical Dimension um um um so yeah that's pretty good so the one thing I do look at on these parts parts parts is um is the chamfer here one of these is done by the turn and face tool the other one is done by the cutoff tool so that one was done by the cutoff tool looks pretty good looks pretty good looks pretty good um so um so um so because this is really just a you know two and a half Dimension part I'm not doing tool nose radius compensation

_Signals: camOps:2_

### Tip 41 — confidence 0.47

> on this it's baked into the program you know how to how to do that 45 degree knockoff I just didn't feel like it was nec

on this it's baked into the program you know how to how to do that 45 degree knockoff I just didn't feel like it was necessary to do that so so these are good to go right this is we can just hit go on this go on this go on this so so so what I wanted to show you as a bonus as a bonus as a bonus I gotta I gotta do a lot of these [Music] [Music] [Music] particular part there we need to run that we need to run that um um um 80 times right okay so we got to run that 80 times a drawing that this takes 1.304 inches of material total started with a 48 inch long bar so that was a 48 inch long bar

_Signals: params:4_

### Tip 42 — confidence 0.44

> that was in there okay in there okay in there okay we have to leave ourselves a margin of safety what what we're what we

that was in there okay in there okay in there okay we have to leave ourselves a margin of safety what what we're what we're working towards here is doing this automatic right automatic right automatic right so we need a little margin of safety for what's stuck in the chuck so let's say that out of our 48 inches we're going to take out two and a half inches all right so we've got 45 and a half inches of bar to work with and then what did it take to make this so 1.304 inches of material 1.304 inches of material we can safely run this 34.9 times okay 34.9 times okay 34.9 times okay so so so 34.9

_Signals: params:3_

### Tip 43 — confidence 0.46

> right we got single block off we've got our feed rate at a hundred and we're in edit mode we're at the top of our progra

right we got single block off we've got our feed rate at a hundred and we're in edit mode we're at the top of our program reset turn it to memory close the door right close the door right close the door right cycle start cycle start cycle start so now if you're in program mode it will just show you the program as you run it [Music] all right all right watch it step through watch it step through watch it step through if you go to position mode you can watch each tool run each tool run each tool run [Music] [Music] [Music] see boom that was our G50 right there for the drill that just knocked

_Signals: camOps:2 · gcode:1_

### Tip 44 — confidence 0.51

> the G50 [Music] [Music] [Music] we're drilling the hole right now through the whole thing [Music] [Music] okay so what's

the G50 [Music] [Music] [Music] we're drilling the hole right now through the whole thing [Music] [Music] okay so what's going to go back and you do boom there's our G50 that was the G50 command that changed our coordinate system our coordinate system our coordinate system [Music] cut off tool cut off tool [Music] they're just bringing up our turning face again face again face again second piece come in and come in and machine down machine down machine down [Music] [Music] [Music] up over watch that G50 change here boom there's our G50 again for cut off foreign foreign foreign so the other

_Signals: gcode:5 · howto:1_

### Tip 45 — confidence 0.41

> thing you can watch command showing you the commands it's running page down page down page down this shows you actual sp

thing you can watch command showing you the commands it's running page down page down page down this shows you actual speed of the spindle spindle spindle maximum spindle speed that it's set and this L word remember that L Word that L word set how many times the program ran we sold it 32 times right right right it's just about to finish running the first set of the program watch that L Word watch that L Word watch that L Word okay so with this screen if I'm running automatic operation I'm usually watching this screen right here [Music] [Music] if you don't want to burn your CRT out all you

_Signals: camOps:1 · howto:3_

### Tip 46 — confidence 0.4

> have to do press the button press the button press the button [Music] and cancel it'll turn the screen off that way you 

have to do press the button press the button press the button [Music] and cancel it'll turn the screen off that way you don't burn your CRT in you want to see it again press program or press offset any other press and hold cancel press and hold cancel press and hold cancel [Music] [Music] [Music] yeah there you go well I hope you enjoyed watching how I set up my Ike guy lathe with the FANUC 6t control uh there's more than one way to set that up uh coordinate system wise and uh one method's not necessarily any worse than the other worse than the other worse than the other the biggest reason I

_Signals: camOps:1 · howto:2_

### Tip 47 — confidence 0.4

> that you would G50 off of but you really got to understand you have to head your head completely wrapped around the coor

that you would G50 off of but you really got to understand you have to head your head completely wrapped around the coordinate system and how that works and what what can happen is uh let's say you had to stop a program uh mid-tool and something wasn't going right you had a broken insert or coolant nozzle was in the right place and so you stop and do the steps you need to correct that situation then you go into to re-run the program if your program uh start and stop kind of operations aren't 100 percent percent percent you know up to uh standards then um you can get yourself in a situation

_Signals: gcode:1_

### Tip 48 — confidence 0.42

> okay I'm it's not a speed demon to begin with right this machine is not doing 2 000 an inch Rapids okay so so so um um u

okay I'm it's not a speed demon to begin with right this machine is not doing 2 000 an inch Rapids okay so so so um um um so for me a little five seconds more of tool change time for tool is perfectly acceptable so uh but if of course if you have really got your head wrapped around that coordinate system by all means um you know do a tool change closer to the Chuck it's just the danger goes up so that's up to you um but that that's how I set it up with g50s and uh I should probably do another video talking about the the program Preparatory blocks that I that I use that kind of the setup part

_Signals: safety:1 · howto:3_

### Tip 49 — confidence 0.42

> of the program at the top of every of every you know tool I'm going to run and the one at the bottom and I probably shou

of the program at the top of every of every you know tool I'm going to run and the one at the bottom and I probably should change that a little bit because uh the way I in state the offset the like t0101 I should probably change where that instates and the same thing with how it goes out I should probably outstate that in a different way so that if I wanted to use wear off sets you know I could because the way I've got it now I don't really ever use the offset page if I run a program and my diameter is a little bit off for instance I just go back in in my G50 line you know g50x whatever and I

_Signals: gcode:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-aX-I548Gy2E-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/aX-I548Gy2E.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].