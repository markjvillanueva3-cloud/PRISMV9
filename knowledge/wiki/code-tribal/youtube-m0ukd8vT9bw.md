---
title: "Make This Part On Day One – Haas Automation Tip of the Day"
domain: general
source: youtube
videoId: m0ukd8vT9bw
url: https://www.youtube.com/watch?v=m0ukd8vT9bw
channel: "Haas Automation, Inc."
duration_s: 1754
tribal_entries: 22
chunks_scanned: 50
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Make This Part On Day One – Haas Automation Tip of the Day

**Channel:** [Haas Automation, Inc.](https://www.youtube.com/watch?v=m0ukd8vT9bw)
**Duration:** 29m 14s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 22 of 50 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.44

> we're gonna make make make and it'll make a great addition for your toolbox as well toolbox as well toolbox as well the 

we're gonna make make make and it'll make a great addition for your toolbox as well toolbox as well toolbox as well the through hole on my part is 3 8 inch diameter because diameter because diameter because the shank on my indicator is 3 8 of an inch inch inch now the shaft on your indicator might be different different different so you'll just use a different size drill and you might want to adjust the size of the steps size of the steps size of the steps on the adapter to fit your collets and that's the beauty of this you can change everything on this part you can change the entire shape

_Signals: camOps:1 · params:1 · howto:3_

### Tip 2 — confidence 0.51

> and make your own part we're going to make this part out of three inch diameter stock three inch diameter stock three in

and make your own part we're going to make this part out of three inch diameter stock three inch diameter stock three inch diameter stock cut to three inches long 76.2 millimeters millimeters millimeters we're going to turn the first side and drill it and that's going to be our first operation operation 10 first operation operation 10 first operation operation 10 then we'll flip the part over turn the back side up back side up back side up 20 and then we'll take the part over to our tm our tm our tm our tool room mill and we drill and tap it for a set screw here's the print that we're going

_Signals: camOps:6 · howto:1_

### Tip 3 — confidence 0.42

> to be using and it describes all of our lengths and diameters and we can also use it to describe use it to describe use 

to be using and it describes all of our lengths and diameters and we can also use it to describe use it to describe use it to describe how our lathe moves this point here is 0.5 inches 12.7 millimeters from zero our center line but we would never call this point call this point call this point x point five or x twelve point seven the tool tool tool at this position is at x one inch because it creates a one inch diameter at that position at that position at that position this is a lathe and all of our x values are in are in are in diameter now let's take this over to the lathe on all haas

_Signals: params:1 · safety:1_

### Tip 4 — confidence 0.41

> lathes our z plus is away from the spindle and our z our z our z minus is towards it x minus moves are towards our spind

lathes our z plus is away from the spindle and our z our z our z minus is towards it x minus moves are towards our spindle center line center line center line and x plus moves are away from our center line center line center line now here are the tools that we will be mounting in our turret an od turning tool a spot drill and a drill when i'm setting off long drills or reams i may reams i may reams i may indicate along the length of a ground shaft first shaft first shaft first making sure that the holder is straight before fully tightening it down the lathe needs to know our exact tool and

_Signals: camOps:2_

### Tip 5 — confidence 0.45

> part locations and part locations and part locations and these are our tool offsets and our work offsets work offsets wo

part locations and part locations and part locations and these are our tool offsets and our work offsets work offsets work offsets now to set our tool offsets we will start by using an start by using an start by using an indicator to find the x center of our drill holders drill holders drill holders now once we have found center front to back back back we will highlight the tool offset for that tool that tool that tool press the x diameter measure button and enter enter enter 0 for our diameter because we're at x 0.

_Signals: camOps:3 · howto:1_

### Tip 6 — confidence 0.4

> we can then load up our stock and tighten up that chuck tighten up that chuck tighten up that chuck now remember we're k

we can then load up our stock and tighten up that chuck tighten up that chuck tighten up that chuck now remember we're kind of pretending that it's our first day here and if it really was our first day uh we'd be telling you to never ever walk away ever walk away ever walk away with your t-handle left in the chuck really bad idea really bad idea really bad idea it's not safe and everybody in the shop will make fun of you on to our turning tool now to set the x tool offset for our turning tool we will skim the outside diameter of our part jog straight away in the z positive direction direction

_Signals: safety:1 · howto:1_

### Tip 7 — confidence 0.4

> direction and then measure our part diameter with our tool offset highlighted our tool offset highlighted our tool offse

direction and then measure our part diameter with our tool offset highlighted our tool offset highlighted our tool offset highlighted we will press x diameter measure and enter the diameter value we just measured to set the z tool offset for our turning tool tool tool we will skim the z face of our part and then move straight away in the x axis with our tool offset still highlighted highlighted highlighted we will press the z face measure button we now have a we now have a we now have a clean z face to set all of our tool z offsets up against we will jog our drill up to the face of our part

_Signals: camOps:1 · howto:2_

### Tip 8 — confidence 0.44

> as we slide a shim or a paper between the two the two the two continuing to slowly jog the tool towards the face towards

as we slide a shim or a paper between the two the two the two continuing to slowly jog the tool towards the face towards the face towards the face until the shim drags with the tool offset offset offset highlighted for that drill we're going to press the z to press the z to press the z face measure button and that's it we've set the tool set the tool set the tool length offs at the z for tool two we can also subtract the thickness of any shim that we might have used we'll repeat this process for tool three our other drill for this first operation we're going to be using work offset be using

_Signals: camOps:2 · howto:3_

### Tip 9 — confidence 0.4

> made a complete video a complete video a complete video on how to manually set our tool and work offsets and we will lin

made a complete video a complete video a complete video on how to manually set our tool and work offsets and we will link to that video in the description with our tools and our work offsets our work offsets our work offsets set we can move on to the heart of this video which is programming our part at the control to write our program we'll need some numbers from our print we'll consolidate all of our x and z locations locations locations to make things easier to read and now our x our x our x z values are looking like something we can enter right into the control to create a create a create

_Signals: howto:5_

### Tip 10 — confidence 0.4

> 3

3.1 and z 0.1 now something cool happened when we entered these values entered these values entered these values the control automatically filled in our z start position for us now that is our contour start position now this is one of the most important lathe tips that i can give you whether you are using dps you are using dps you are using dps or programming by hand if you are getting getting getting alarms when using a roughing cycle look right there look at your rapid point and look at your profile start position and make sure that they share the same z value position position position now

_Signals: toolpath:1_

### Tip 11 — confidence 0.53

> would end up with a nib or a pip on our part our part our part and it wouldn't fully clean up which would cause a drill 

would end up with a nib or a pip on our part our part our part and it wouldn't fully clean up which would cause a drill to walk or it would just leave a pip this is one reason we should know exactly what insert radius we are using before we even start programming even start programming even start programming now from here on we're going to start entering in those xz locations from our print print print adding rows for each new line segment this start x and z position is the first point of our point of our point of our contour x minus contour x minus contour x minus z 0.062 1 the start of our

_Signals: toolpath:3 · camOps:1_

### Tip 12 — confidence 0.67

> lead in to create the second point in our contour contour contour we will add a new row and select linear feed motion x 

lead in to create the second point in our contour contour contour we will add a new row and select linear feed motion x minus 0.062 x minus 0.062 x minus 0.062 z zero it filled in the angle for us automatically here automatically here automatically here we will leave chamfer and round at zero because we don't need any chamfer or fill it chamfer or fill it chamfer or fill it at this intersection we'll add another row row row now our third point lands at x 1.0 and z zero and we do want a chamfer at this corner so we'll enter 0.02 under chamfer that's our chamfer size size size we'll add another

_Signals: toolpath:3 · camOps:7 · howto:2_

### Tip 13 — confidence 0.58

> row the next point entering x1 z minus 0

row the next point entering x1 z minus 0.285 no chamfer here new row and we will work our way through our contour entering each contour entering each contour entering each xz point as a new row a new position in shape creator that is it our last line segment our lead line segment our lead line segment our lead out and we are done now we can always go back in back in back in and adjust those end points or add line segments if we need to and we can also add in chamfers or radiuses radiuses radiuses in fact that's the way i usually use my shape creator shape creator shape creator i plot all of

_Signals: toolpath:3 · camOps:1 · safety:1 · howto:1_

### Tip 14 — confidence 0.41

> going to ask for a shape and it says press enter says press enter says press enter to select your predefined shape file 

going to ask for a shape and it says press enter says press enter says press enter to select your predefined shape file and how convenient we've got one all ready for the task ready for the task ready for the task it defaults to the active tool and the turret but we can change that if we would like would like would like now if the tool we have chosen still has an offset of zero an offset of zero an offset of zero the template is going to warn us to go set our tool offset set our tool offset set our tool offset no tool offset present please set tool offset to continue offset to continue offset

_Signals: howto:6_

### Tip 15 — confidence 0.49

> next we have our surface speed and for that information we're going to go to the products page for the inserts that we'r

next we have our surface speed and for that information we're going to go to the products page for the inserts that we're using we're using we're using these charts give us a reasonable starting depth of cut starting depth of cut starting depth of cut feed rate and surface speed now we'll enter 1601 enter 1601 enter 1601 now that'll give us a really high rpm but we will never but we will never but we will never get there because of the max rpm value that we just set for safety more feed and speed videos to come flood coolant yes please stock diameter 3 inches and the control got that from our

_Signals: params:1 · safety:3 · howto:3_

### Tip 16 — confidence 0.45

> from our shape creator file already for us for us for us nice stock removal cycle we will choose 71 for 71 for 71 for od

from our shape creator file already for us for us for us nice stock removal cycle we will choose 71 for 71 for 71 for od roughing tool nose comp we will just leave this on great topic but for another video but for another video but for another video doc depth of cut will set to .055 inches or 1.5 millimeters or 1.5 millimeters or 1.5 millimeters and we got that information from our feed and speed chart feed and speed chart feed and speed chart and x finish stock z finish stock we're gonna leave those gonna leave those gonna leave those at ten thousand three thousand that's the allowance that

_Signals: camOps:2 · params:1 · howto:1_

### Tip 17 — confidence 0.45

> we're leaving for our finish pass finish pass finish pass feed rate we're going to set this to 0

we're leaving for our finish pass finish pass finish pass feed rate we're going to set this to 0.016 0.016 0.016 16 000 of an inch per revolution and we might have to come back to this value and bump it up a little bit i might go to 0.02 to 0.02 to 0.02 to break up those long stringy chips xz rapid points those rapid points those rapid points those also came in with our shape creator file we already filled in that information and retract home both x and z my template already defaults to no for retract home retract home retract home x and z and you will want to make sure you answer no to these

_Signals: camOps:3 · howto:1_

### Tip 18 — confidence 0.47

> with real cutting tools we want to add in our finish cycle finish cycle finish cycle and those drilling operations for o

with real cutting tools we want to add in our finish cycle finish cycle finish cycle and those drilling operations for our finishing cycle we're going to go right back into back into back into our vps template pressing the edit key now we're going to go up to our stock removal cycle removal cycle removal cycle except this time we're not going to choose 71 for roughing choose 71 for roughing choose 71 for roughing we're going to choose zero for finish the question's changed a little bit and we're going to enter a new lower feed rate for this finished cycle and generate that code i'll press f4

_Signals: camOps:4_

### Tip 19 — confidence 0.55

> turning tool t down arrow again there's my finish pass t101 that's good t down arrow t202 is my center drill my spot dri

turning tool t down arrow again there's my finish pass t101 that's good t down arrow t202 is my center drill my spot drill spot drill spot drill and that is in fact where i've put it in the turret the turret the turret and finally t303 and finally t303 and finally t303 is my long drill everything matches up well we've got our program our tools are all set we know they match our program but as your friend as someone who really wants to see you succeed we've got to talk about collision avoidance avoidance avoidance a good setup person will make sure that our tools don't bump our tools don't

_Signals: camOps:6 · safety:1 · howto:1_

### Tip 20 — confidence 0.41

> offsets and correct the issue before we proceed proceed proceed but in this case we've stopped that far in front of our 

offsets and correct the issue before we proceed proceed proceed but in this case we've stopped that far in front of our part our numbers look reasonable so we'll continue continue continue we'll single block through the first few passes of this passes of this passes of this roughing cycle then we can probably turn single block off single block off single block off the cycle looks safe we might turn on option stop we talked about this before the option stop button the option stop button the option stop button that's going to cause the machine to stop every time there's an m01 in the program

_Signals: camOps:2_

### Tip 21 — confidence 0.51

> flip it over and repeat this entire process on the second side of the part creating a program double checking our tool c

flip it over and repeat this entire process on the second side of the part creating a program double checking our tool change positions tool change positions tool change positions and for this second operation we will choose and use choose and use choose and use g55 in our templates now running a second operation second operation second operation g55 is explained in the linked lathe offset video that we referred to to finish up this part we're going to take it over to the tm mill and we'll drill and tap it for a set screw that was our tl part walkthrough i hope you feel a bit more familiar

_Signals: camOps:4 · howto:4_

### Tip 22 — confidence 0.42

> haas mill or lathe really does not have that zero return return return pop-up menu we can still safely start things in o

haas mill or lathe really does not have that zero return return return pop-up menu we can still safely start things in order things in order things in order if we use the zero return single function instead of the power up key if we need to jog this turret out of the way before the machine's been honed we can turn on setting 53 jog without zero return this allows us to jog to jog to jog to that safe tool change position it is a good time to mention our bonus content and if you follow this link right here and it's also in the description it'll take you to the bonus content page for all of our

_Signals: camOps:2 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-m0ukd8vT9bw-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/m0ukd8vT9bw.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].