---
title: "Mazak CNC Lathe Mazatrol Programming tutorial"
domain: lathe
source: youtube
videoId: EPkvGVNoV98
url: https://www.youtube.com/watch?v=EPkvGVNoV98
channel: "CNC CADCAM"
duration_s: 4251
tribal_entries: 49
chunks_scanned: 79
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Mazak CNC Lathe Mazatrol Programming tutorial

**Channel:** [CNC CADCAM](https://www.youtube.com/watch?v=EPkvGVNoV98)
**Duration:** 70m 51s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 49 of 79 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.42

> number 21 so go back to program push work number push work number push work number workpiece number 21 input workpiece n

number 21 so go back to program push work number push work number push work number workpiece number 21 input workpiece number 21 input workpiece number 21 input couldn't find it in the memory so it's asking if this is a new program push the program button program button program button and now it's asking us Mesa troll or eia program we're going to choose a mesotrol program program program work piece material this part is made out of aluminum so we're going to select aluminum and a work piece Max outer diameter of work piece is 3.2 inches inches inches 3.25 inches the inner diameter is zero

_Signals: params:2 · howto:1_

### Tip 2 — confidence 0.53

> the work piece length is three inches long long long Max spindle limit this is the G50 for the entire program I don't wa

the work piece length is three inches long long long Max spindle limit this is the G50 for the entire program I don't want to run the Chuck past 2000 RPM so I'm going to type in 2000 and hit input finish allowance on X this is the stock that's left by the roughing tools so the Finish tools can clean it up I'm going to leave ten thousandths on the diameter so .01 input finish allowance on Z is going to be be be 5000.005 input stock removal of work face I'm not going to have any stock removal I'm going to skim the part manually and set the Z zero on this program program program down arrow down

_Signals: camOps:3 · params:1 · gcode:1 · howto:1_

### Tip 3 — confidence 0.44

> arrow down arrow first thing we're going to do is turn on the coolant and that's 99 of the time what we're going to do f

arrow down arrow first thing we're going to do is turn on the coolant and that's 99 of the time what we're going to do for the first operation so push the three arrows another menu comes up push M code and push coolant on and then down arrow so now we're have another choice of icons the first thing we're going to do let's program this part and it's bar stock so we're going to select the bar option and we're going to select bar out the first one the ones that are highlighted highlighted highlighted change the way the roughing tool and finish tool approaches the part on the highlighted ones the

_Signals: camOps:2 · howto:3_

### Tip 4 — confidence 0.43

> tool is fed down into it and feeds across the ones that are not highlighted are open Geometry and the tool Rapids down a

tool is fed down into it and feeds across the ones that are not highlighted are open Geometry and the tool Rapids down and feeds across so we're going to select the open Geometry Geometry Geometry cutting point on X is going to be our stock diameter of 3.25 and what we're talking about is this is the shape we're going to be programming The Cutting point is here at the outside diameter and the face of the part with medicine troll we always program from the face and work in toward the chuck all right all right all right surface speed for rough cut this is what the roughing tools are going to

_Signals: camOps:1 · safety:1 · howto:1_

### Tip 5 — confidence 0.51

> use Arrow over surface speed for finish cut FV and finish velocity this is the fee speed for the Finish tools feed rate 

use Arrow over surface speed for finish cut FV and finish velocity this is the fee speed for the Finish tools feed rate for revolution for rough cut revolution for rough cut revolution for rough cut and the last one is the depth of cut and if we Arrow over to the first one this Auto button pops up if we push it it auto populates the feeds and speeds from bar out and with aluminum as our stock Arrow over Arrow over Arrow over gear number this is the machine's transmission if we leave gear number zero the machine will automatically select the correct gear when it's roughing and finishing the

_Signals: camOps:6 · howto:1_

### Tip 6 — confidence 0.44

> part as it is this machine only has one gear anyway so this field is really not used on this machine on this machine on 

part as it is this machine only has one gear anyway so this field is really not used on this machine on this machine on this machine roughing tool number roughing tool number roughing tool number this is the tool we're going to use to rough the part if we push tool data we're going to use tool four which is a general out general out general out and it is a 95 degree angle 80 degree insert go back to program go back to program or offset number one on this machine foreign foreign foreign it has two different offsets offset column number one and offset column number two number two number two if

_Signals: camOps:1 · params:2_

### Tip 7 — confidence 0.43

> either the convex or the concave radius when we're when we're when we're calculating the end point in this first example

either the convex or the concave radius when we're when we're when we're calculating the end point in this first example we're gonna create this horizontal line right here we're going to give it a twenty thousands Corner break at the front of the line the line the line foreign .02 input the final point on x is going to be two inches in diameter the final point on Z is going to be 700 thousands from the face final corner final corner right here is unspecified so we're going to leave it blank and use the tools radius to create that corner surface finish roughness this is the surface finish that

_Signals: camOps:2 · howto:2_

### Tip 8 — confidence 0.53

> is left by the finish tool on this machine we specify a surface roughness and based on the inserts radius it'll calculat

is left by the finish tool on this machine we specify a surface roughness and based on the inserts radius it'll calculate the correct it'll calculate the required surface finish that we want a number seven is slightly better than a 32 finish so that's what I usually select for uh 31 000 radius insert the feed rate will be rate will be rate will be .0039 inches per Revolution the next field is asking us for necking for an undercut and we're not going to do that Arrow over the next area is asking us for an M coat we've already turned on the coolant throughout the program so we don't need the M

_Signals: camOps:3 · params:1 · safety:1 · howto:2_

### Tip 9 — confidence 0.41

> the starting point on X and the starting point on Z is right where we left off with the horizontal line with the horizon

the starting point on X and the starting point on Z is right where we left off with the horizontal line with the horizontal line with the horizontal line now if we push continue it'll Auto populate these two Fields down into the starting point so push continue now the final point on X for the taper [Music] [Music] [Music] is going to be 2.5 inches the final point on Z is going to be 1.3 inches foreign Corner we're not going to have anything there there there and then surface finishes seven down arrow right button figure check and now we can see what we had previously and we can see the angle

_Signals: params:2_

### Tip 10 — confidence 0.5

> created up there now go back to the program program program go to go to go to we need to create this next horizontal lin

created up there now go back to the program program program go to go to go to we need to create this next horizontal line line line so we're gonna go linear doesn't have a starting corner on it 2.5 inches is where we left off and it's 1.75 inches back from the face surface finish is seven surface finish is seven right button figure check right button figure check right button figure check so now we see the program change each time we've looked at it if we let's go back to the program and we need to break the corner up here another 20 thousandths and in order to do that we need to create a

_Signals: camOps:2 · params:2 · howto:3_

### Tip 11 — confidence 0.41

> horizontal line line line that's at least twenty thousandths long past the previous Z so we go linear 0

horizontal line line line that's at least twenty thousandths long past the previous Z so we go linear 0.02 input this is going to be our stock size 3.25 input the final point on Z is going to be twenty thousandths plus two thousandths so the insert rolls over the chamfer otherwise it leaves a little sharp edge on the chamber so that Dimension is going to be 1.772 input 1.772 input 1.772 input it's our finish of seven down arrow shape end shape end shape end and then we're in we're done with the program so n right button figure check so now so now so now if we want to redraw it we push scale

_Signals: camOps:2_

### Tip 12 — confidence 0.48

> like 0

like 0.5 you foot like 0.5 you foot like 0.5 you foot and now we can see the corner chamfers on the part on the part on the part like to really blow it up we're gonna change the scale one more time scale move the white cursor box over to the chamfer chamfer chamfer and then type in point one on this machine point one is the lowest scale that it goes to that it goes to that it goes to and now we can see the chamfer clearly on the part on the part on the part however the rest of the part is off the screen so we need to shrink the scale back down and re-center the screen so scale one input so

_Signals: camOps:4 · howto:1_

### Tip 13 — confidence 0.45

> scale one input so scale one input move the arrow over and I'll go back to 0

scale one input so scale one input move the arrow over and I'll go back to 0.6 input 0.6 input 0.6 input so now we have the image so so so let's go and look at the tool Path store is lit up so it's going to keep this scale for us it's a left button program program program check program program program check program program program check and check continue not done roughing it now the finished pass is coming up and you see it rolled the insert over the top now if you look closely there's a gap between the purple geometry and the white tool path the reason for that is because the white line is

_Signals: toolpath:2_

### Tip 14 — confidence 0.41

> the tool up close to the part the part the part we're going to turn on the spindle we're going to give it about a thousa

the tool up close to the part the part the part we're going to turn on the spindle we're going to give it about a thousand RPM I'm over here we're going to skim the face of the part faced off faced off you can back the X off but leave the Z right where it's at now we got to set the work shift all right now that we've skimmed the work the work face now we need to set the the the now we need to set the zero so push the left button go to program program file program file program file and arrow down to work number 21 Z offset teach Z offset teach Z offset teach zero input now we go to the left

_Signals: camOps:1 · howto:3_

### Tip 15 — confidence 0.51

> so let's go to program work number 22 input input input and couldn't find it and it's asking if it's a new program if it

so let's go to program work number 22 input input input and couldn't find it and it's asking if it's a new program if it is push the program button program button program button mesotrol or eia again we're always going with mazatrol work piece material this is aluminum is aluminum is aluminum Max outer diameter work pieces the same as the previous program as the previous program as the previous program 3.25 inches the ID is zero we don't have a hole in the stock the work piece length this part's longer at 4.5 inches long at 4.5 inches long at 4.5 inches long Max spindle RPM limit Max spindle

_Signals: params:4 · safety:1_

### Tip 16 — confidence 0.71

> RPM limit Max spindle RPM limit this is the G50 for the entire program you don't want to run the Chuck past 2000 RPM 200

RPM limit Max spindle RPM limit this is the G50 for the entire program you don't want to run the Chuck past 2000 RPM 2000 RPM 2000 RPM finish allowance on X this is going to be the Finish allowance with roughing tools leave for the finishers I'm going to select ten thousandths which is ten thousandths on the diameter for x and then .003 thousandths on Z because I'm going to be roughing the tool tool tool with a 55 degree diamond and I want to leave less stock to the 35 degree Diamond to finish Diamond to finish Diamond to finish stock removal of work face I'm going to say 0.1 or 100

_Signals: camOps:5 · params:5 · gcode:1 · howto:1_

### Tip 17 — confidence 0.55

> process if we want to kick the feed rate up and type in a number 

process if we want to kick the feed rate up and type in a number .012 input .012 input .012 input so now we have 12 000 speed rate for the rough rough rough we got to be very careful not to type in 0.120 as a hundred and twenty thousands per rev the machine will not catch that mistake and it will crash the insert into the part into the part into the part been there done that a couple times so be careful with changing the feed rates we're going to rough it with tool number four four four input offset always on this machine offset number one offset number one offset number one we're not going

_Signals: camOps:4 · safety:2_

### Tip 18 — confidence 0.44

> to have a finish tool because it's a sphere and we're going to finish that with the 35 degree Diamond so down arrow so d

to have a finish tool because it's a sphere and we're going to finish that with the 35 degree Diamond so down arrow so down arrow so down arrow starting point on X is the stock diameter 3.25 input the starting point on Z at the edge process programs to the right of zero so we're going to program starting from a hundred thousands the work face the work face the work face final point on x final point on x final point on x final point on Z are both zero and because we have fifty thousand steps to cut it's going to take two passes to clean off that face clean off that face clean off that face

_Signals: camOps:2 · params:1_

### Tip 19 — confidence 0.44

> down arrow down arrow down arrow now we're going to start programming fear and the rest of this part so we again startin

down arrow down arrow down arrow now we're going to start programming fear and the rest of this part so we again starting with our stock and it's an open Geometry so we're going to go with how to go with how to go with how even though this area is closed we're not starting right here we're starting over here the tools can wrap it down and feed into it feed into it feed into it cutting point on X again it's going to be 3.25 our stock size cutting point on Z is zero and then we're going to do Auto for the roughing and finish cuts roughing and finish cuts roughing and finish cuts [Music] [Music]

_Signals: camOps:3_

### Tip 20 — confidence 0.46

> [Music] the roughing tool number the roughing tool number the roughing tool number in this program we're going to select

[Music] the roughing tool number the roughing tool number the roughing tool number in this program we're going to select a 55 degree Diamond which is tool number one one one and then offset one and then we're also going to select a 35 degree diamond for the Finish tool however we're going to show you a to show you a to show you a reason why this can't be done in this process but I'll get to that in a minute so we're going to put it in tool two offset one offset one offset one so now the first thing we're going to do is we need to program a convex radius for this ball shape for this ball shape

_Signals: camOps:1 · params:2 · howto:2_

### Tip 21 — confidence 0.47

> Machining it's a diameter of 2

Machining it's a diameter of 2.5 inches half of that half of that half of that is 1.25 inches radius 1.25 and then a surface finish again of seven we forgot to put a question mark in here so put a question mark because we don't know the end point down arrow down arrow down arrow and then we're going to calculate the center of that center of that center of that radians so push Center Arc Center X it's centered on the work piece around x0 so X is zero Arc Center Z is the distance from the end of the part to the center line of that radius that radius that radius is 1.25 inches intersect position

_Signals: camOps:1 · params:3_

### Tip 22 — confidence 0.53

> hundred thousands and the diameter is 1

hundred thousands and the diameter is 1.8 inches so linear 0.1 push this button and it changes the hundred thousandths chamfer into a hundred thousandths radius hundred thousandths radius hundred thousandths radius 1.8 inches 1.8 inches 1.8 inches the final point on Z is going to be 3.25 inches from the front of the part and it has a corner radius of 200 thousandths at the bottom of the line 3.25 3.25 3.25 and radius 0.2 input and radius 0.2 input and radius 0.2 input surface roughness is seven surface roughness is seven surface roughness is seven down arrow down arrow down arrow right button

_Signals: camOps:1 · params:5_

### Tip 23 — confidence 0.42

> finger check right button finger check right button finger check and now the program came across it we need to break the

finger check right button finger check right button finger check and now the program came across it we need to break the corner at the top of the part so we're not done programming just yet just yet just yet so let's go back to the program we need to create another horizontal line here one hundred thousandths long so we say linear so we say linear so we say linear 0.1 for the chamfer size this is going to be our stock diameter 3.25 inches and then we need to make the final point on Z final point on Z final point on Z 3.25 plus the hundred thousandths plus two thousandths to roll the insert up

_Signals: camOps:1 · params:1 · howto:1_

### Tip 24 — confidence 0.41

> over the chamfer otherwise it leaves a little sharp edge on the chamfer so so so 3

over the chamfer otherwise it leaves a little sharp edge on the chamfer so so so 3.352 3.352 3.5 3.5 2 input surface finishes seven down arrow shape in in in and then we're end with the program right button figure check right button figure check right button figure check and we're going to zoom in on the top half of this part so we're going to say scale move the arrows toward the center of the screen would be and then put a smaller value in here like one and now we're programming from you can see the graphics from the center line up again again this geometry we're not going to be able to

_Signals: camOps:2_

### Tip 25 — confidence 0.56

> rough out the entire geometry with the 55 degree Diamond because this end of the ball is steeper than 30 degrees but let

rough out the entire geometry with the 55 degree Diamond because this end of the ball is steeper than 30 degrees but let's show that right now so let's go to Left button let's go to program program check program check program check and then check continue so the first tool so the first tool rough some roughs the part off here's the 55 degree diamond roughing the nose of the part [Music] [Music] [Music] and now it switches to Tool two which is a 35 degree diamond and the part's done however right here it leaves some area that's not cut an uncut area even though the 35 degree Diamond can get in

_Signals: camOps:2 · params:5_

### Tip 26 — confidence 0.43

> there get in there get in there the 55 cannot and the finishing tool will only cut an extra ten thousandths on X and thr

there get in there get in there the 55 cannot and the finishing tool will only cut an extra ten thousandths on X and three thousandths on Z of whatever the roughing tool left even though the Finish tool can come down into it down into it down into it we're going to zoom this area up scale [Music] [Music] we're going to center it up a little closer closer closer [Music] [Music] [Music] shape all right let's run the tool path again go to check continue so right now the tools are off the screen screen screen and we gotta wait a bit until it starts roughing down the back side of the ball all

_Signals: toolpath:1 · camOps:1_

### Tip 27 — confidence 0.41

> right there's the roughing pass and there's the Finish pass taking off that ten thousands and three thousandths on Z but

right there's the roughing pass and there's the Finish pass taking off that ten thousands and three thousandths on Z but you see the Gap that's shown here the distance from the center line of the inserts radius to the part is larger here than it is over here and that means the tool could not come down and cut it so in order to correct that we're going to separate the roughing and finishing tools on a different process so go to program so go to program so go to program come down here come down here come down here go into edit mode go into edit mode go into edit mode Arrow over to the Finish

_Signals: camOps:2_

### Tip 28 — confidence 0.49

> tool and we're going to put zeros in there to delete the Finish tool copy copy the bar out roughing process down on its 

tool and we're going to put zeros in there to delete the Finish tool copy copy the bar out roughing process down on its own line so we're going to push the right menu button we're going to go process copy process copy process copy two two that's the program we're working on process number three on process number three on process number three and we just copied the process down so now we need to Arrow over delete the roughing tool roughing tool roughing tool and add a finish to it and now we're going to rerun the part and show you the change so program check we're going to erase the tool path

_Signals: toolpath:1 · camOps:2 · howto:3_

### Tip 29 — confidence 0.5

> and then check continue and again it's roughing the nose of the part that we can't see on the screen right now all right

and then check continue and again it's roughing the nose of the part that we can't see on the screen right now all right here's the 55 degree Diamond making its roughing passes making its roughing passes making its roughing passes and the 35 degree Diamond does have the clearance clearance clearance and that's what the 55 Diamond could not do so it's taken extra stock here on a finish pass so that's how to override the machine override the machine override the machine to to to to allow it to do this but I didn't want to rough the whole part out of the 35 degree diamond degree diamond degree

_Signals: camOps:2 · params:3_

### Tip 30 — confidence 0.4

> diamond I wanted to rough it out with the 55 and then this little then this little then this little uncut area was not a

diamond I wanted to rough it out with the 55 and then this little then this little then this little uncut area was not a big chip load on the finishing tool so that's what I wanted to do there wanted to do there wanted to do there all right so let's Zoom this out scale one input one input one input shape shape shape so here's a work piece shape so what we need to do now is set the Z zero of our part so let's go do that now tool four is already called up so let's go over and touch the work face [Music] all right now we need to set our work shift so let's bring the tool over to the face of the

_Signals: camOps:1 · howto:2_

### Tip 31 — confidence 0.56

> at 500 percent so now we're going to see the first two passes with the 80 degree diamond and then here comes the 55 degr

at 500 percent so now we're going to see the first two passes with the 80 degree diamond and then here comes the 55 degree Diamond roughing apart and also in the corner you can see our RPM is maxed out at 2000 RPM for this program program program now it's switched into tool two and now it's finishing the ball and finishing the 1.8 inch diameter and the chamfer the chamfer the chamfer and it's done so let's go to the layout the machine says it's going to take two minutes and 44 seconds to machine this part part part so let's see how close that is now that we're going to machine it for real so

_Signals: camOps:3 · params:4_

### Tip 32 — confidence 0.48

> we're going to go Trace Auto and we did call up the work shift and we did set the Z zero so we are ready to roll and the

we're going to go Trace Auto and we did call up the work shift and we did set the Z zero so we are ready to roll and the part is sticking out long enough from the Jaws so we're not going to hit the Jaws we need to measure that measure that measure that just like a different a regular lathe all right here we go now it's switching to Tool one which is a 55 degree diamond a 55 degree diamond a 55 degree diamond foreign degree Diamond degree Diamond run the Finish pass coming up right here where it takes a little bit extra stocks and what it should have all right we are done time was 2 minutes

_Signals: camOps:1 · params:3 · howto:1_

### Tip 33 — confidence 0.55

> now it's asking us mesotrol or eia and we're going with Maze of troll on this work piece material we're going to choose 

now it's asking us mesotrol or eia and we're going with Maze of troll on this work piece material we're going to choose aluminum choose aluminum choose aluminum maximum outside diameter work piece is 3.25 inches 3.25 inches 3.25 inches minimum diameter work piece is zero it does not have a hole in it work piece length is three inches long Max spindle RPM limit is the G50 for the entire program entire program entire program and I don't want to run the Chuck past 2000 RPM so type in 2000 finish allowance on X this is the stock that the roughers are going to leave for the finishers to clean up

_Signals: camOps:1 · params:4 · gcode:1_

### Tip 34 — confidence 0.41

> I'm going to leave ten thousandths on the diameter so type in 

I'm going to leave ten thousandths on the diameter so type in .01 finish allowance on Z is five thousandths thousandths thousandths and the stock removal of the workface this is how much we're facing off the end of the part end of the part end of the part in this case a hundred thousand foot now the first process we're going to do is turn on the coolant for that we need to push these three arrows arrows arrows go over here to M code and then cool it on and then down arrow and then down arrow and then down arrow so now the next thing we're going to do is face off the excess stock on our part

_Signals: camOps:2_

### Tip 35 — confidence 0.45

> so we're going to push Edge and then again and then again and then again the surface speed for rough cut finish cut and 

so we're going to push Edge and then again and then again and then again the surface speed for rough cut finish cut and depth of cut we can set automatically by pushing this button roughing tool number we're going to use tool four which is our cnmg offset one offset one offset one finish tool is tool four offset one starting point on X is going to be our stock size of 3.25 input starting point on Z is going to be the hundred thousandths point one thousandths point one thousandths point one final point on X and final point on Z are both zero are both zero are both zero surface roughness we're

_Signals: camOps:3 · howto:1_

### Tip 36 — confidence 0.41

> so I usually choose that so down arrow so we Face the ends of the part off so now what we need to do is describe this OD

so I usually choose that so down arrow so we Face the ends of the part off so now what we need to do is describe this OD line right here that starts at two inches and it has a hundred thousandths chamfer at the front of it of it of it so we're Machining bar stock we're on the we're on the we're on the open Geometry on the outside cutting point on X is 3.25 cutting point on Z is zero surface speed for rough cut again the auto comes up auto comes up auto comes up push that if you wish to override it you can do that can do that can do that roughing tool number we're going to stay with tool four

_Signals: camOps:2_

### Tip 37 — confidence 0.44

> program we're not done with it yet so let's go back to program we need to make one more linear line and that's in order 

program we're not done with it yet so let's go back to program we need to make one more linear line and that's in order to chamfer this part right here so go linear so go linear starting corner is a hundred thousandths final point on X is going to be our stock diameter of 3.25 stock diameter of 3.25 stock diameter of 3.25 final point on Z is going to be 1.75 plus the hundred thousandths chamfer plus two thousandths to roll the insert over the top of the radius if we don't do that it leaves a little tiny Burr there there there so so so 1.852 is our finish length surface roughness is seven down

_Signals: camOps:3_

### Tip 38 — confidence 0.47

> menu that comes up but there's not a drill on the first menu so we push the three arrows here's the drill here's the dri

menu that comes up but there's not a drill on the first menu so we push the three arrows here's the drill here's the drill here's the drill push that push that push that and the drilling type has four different selections zero Drilling selections zero Drilling selections zero Drilling feeds in and Feeds out at the same feed rate and it's useless on this machine number one packing number one packing number one packing feeds in and then Rapids out to the start to the start to the start Rapids back in feeds a little more Rapids back out as a chip clear number two packing number two packing

_Signals: camOps:4_

### Tip 39 — confidence 0.44

> offset one offset one offset one starting point on Z is going to be the front of the part front of the part front of the

offset one offset one offset one starting point on Z is going to be the front of the part front of the part front of the part the final point on Z is going to be this whole depth of 1.57 and that goes to the end of the hole end of the hole end of the hole on this older machine it does not compensate compensate compensate for the drill Point angle the newer machines machines machines will go down to the major diameter of the drill past the drill point on this one it does not one it does not one it does not so type in 1.57 input down arrow and then right button figure check and now we've got a

_Signals: camOps:3_

### Tip 40 — confidence 0.5

> hole punched in the part again you can see there is no angle shown shown shown on the hole on the hole on the hole go ba

hole punched in the part again you can see there is no angle shown shown shown on the hole on the hole on the hole go back to program go back to program go back to program so now what we need to do is describe this this this bore size bore size bore size the bore it's a 900 000 Spore with the one hundred thousands chamfer at the front of it so again we're using bar stock in this time and it's still open Geometry Geometry Geometry cutting point on X is going to be our drill diameter 0.69 drill diameter 0.69 drill diameter 0.69 cutting point on Z is zero again surface speed for roughing we push

_Signals: camOps:8_

### Tip 41 — confidence 0.41

> Auto and it auto populates our feeds and speeds for us speeds for us speeds for us roughing tool number is tool 12 offse

Auto and it auto populates our feeds and speeds for us speeds for us speeds for us roughing tool number is tool 12 offset one one one finish tool is tool 12 offset one so the next thing we're going to do is the linear the linear the linear starting quarter is a hundred thousandths thousandths thousandths final point on X is 900 the final point on Z is going to be 1.3 inches and the final corner I forgot to put on the print is a 50 000 radius at the bottom of the hole so push radius 0.05 input 0.05 input 0.05 input surface roughness is seven surface roughness is seven surface roughness is

_Signals: camOps:1 · params:1_

### Tip 42 — confidence 0.47

> seven down arrow down arrow down arrow and now let's chamfer the hole going into the drill so go linear let's give it a 

seven down arrow down arrow down arrow and now let's chamfer the hole going into the drill so go linear let's give it a twenty thousandths chamfer 0.69 for the hole size and then we gotta go this Dimension 1.3 plus 20 thousandths plus two thousandths to roll that insert over the chamfer so 1.322 input 1.322 input 1.322 input seven down arrow shape in and then end and then end I haven't touched on the end process in the machine yet but this is very powerful when you need to do multiple parts multiple parts multiple parts or switch between programs and Etc it's very useful for bar pulley on

_Signals: camOps:4_

### Tip 43 — confidence 0.55

> this process we just need to push and and leave everything zero leave everything zero leave everything zero so let's go 

this process we just need to push and and leave everything zero leave everything zero leave everything zero so let's go to the right button figure check and there's our board and there's our board so now let's look at the tool path so left button so left button so left button go to program that gets us out of edit mode push check mode push check mode push check and then check continue and then check continue and then check continue so what it's going to do is it's going to rough the face to rough the face to rough the face and it's going to finish the face and it's going to rough the OD tool

_Signals: toolpath:1 · camOps:5_

### Tip 44 — confidence 0.47

> path that race to erase what the graphics graphics graphics here's the finished OD pass now it's going to drill the hole

path that race to erase what the graphics graphics graphics here's the finished OD pass now it's going to drill the hole in the center full path of race full path of race and now it's finishing the board so this is how it's programmed but this is really not how I want to run this part I would like to rough out the part and then run the Finish tools so I'll show you how to do that now so go to layout go to layout go to layout and if you notice it's got R1 which is the coolant the coolant the coolant R2 R2 R2 is The Edge process this is the roughing process process process and then the Finish

_Signals: camOps:4_

### Tip 45 — confidence 0.45

> process and so on Down the Line now if we push rough priority on this screen screen screen and then push the input butto

process and so on Down the Line now if we push rough priority on this screen screen screen and then push the input button notice how it reorganizes notice how it reorganizes notice how it reorganizes all roughing processes up front and then finish processes at the end and and and this is fine for how it's programmed but to eliminate one tool change I want to move this finish bar in process above bar in process above bar in process above the finished turning process the finished turning process the finished turning process so to do that move your arrows down and it's going to insert a line

_Signals: camOps:3 · howto:1_

### Tip 46 — confidence 0.51

> roughing it with tool 12 finishing the tool 12 and then come back with the cool forward to finish the face and finish th

roughing it with tool 12 finishing the tool 12 and then come back with the cool forward to finish the face and finish the OD the OD the OD D you got to be careful on this screen because you can actually put the Finish tools above the roughing tools and crash the part the part the part so when you play with the layout you got to be wary of that issue the newer machines have a protection against that on this one because you're doing it manually it'll allow you to do that so let's go back to the program check cool path of race cool path of race cool path of race and then check continue finish the

_Signals: camOps:4 · safety:1_

### Tip 47 — confidence 0.53

> board finish the board finish the face and now finish the OD of the profile and it's done it's done it's done so now fro

board finish the board finish the face and now finish the OD of the profile and it's done it's done it's done so now from here so now from here so now from here what we need to do is set the workship so we're going to come over and set the Z zero for this program [Music] [Music] all right we're ready to set the work ship so come over here to manual and let's turn the spindle on the 300 RPM [Music] [Music] all right we're touching the face and we easily cut off a hundred thousands so stop the spindle come over here and go to program go to program file go to program file go to program file

_Signals: camOps:4 · params:1 · howto:3_

### Tip 48 — confidence 0.41

> so let's go to the trace screen so left button Trace button Trace button Trace and now we can see our turning tool just 

so let's go to the trace screen so left button Trace button Trace button Trace and now we can see our turning tool just like it is on the part so now what we need to do is go to auto turn on the coolant in Auto not in manual manual manual and then let's sit cycle start and run this part all right all right [Music] [Music] [Music] now comes the drill bring up the boring bar [Applause] all right done roughing it now it's the finished pass of the boring bar [Music] [Music] so right now it's cutting a little bit of air of air of air before it cuts the part in later videos I'll show you how to I'll

_Signals: camOps:2_

### Tip 49 — confidence 0.44

> so now what we need to do is go back and let's go to the program program to the layout screen to the layout screen to th

so now what we need to do is go back and let's go to the program program to the layout screen to the layout screen to the layout screen and we want to run the last process the F3 the Finish three process process process so what we're going to do is going to push this button down here single process the position the position and it's asking us which process do you want to run want to run want to run we're going to push finish three input three input three input and then we're gonna and then we're gonna and then we're gonna we can do the same thing on the trace screen so finish three input so

_Signals: camOps:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-EPkvGVNoV98-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/EPkvGVNoV98.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].