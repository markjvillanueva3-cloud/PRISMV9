---
title: "Solidworks CAM Tutorial: Basic Contour (1)"
domain: cam
source: youtube
videoId: jlhjrMKiZfo
url: https://www.youtube.com/watch?v=jlhjrMKiZfo
channel: "Professor Cameron"
duration_s: 1470
tribal_entries: 20
chunks_scanned: 26
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Solidworks CAM Tutorial: Basic Contour (1)

**Channel:** [Professor Cameron](https://www.youtube.com/watch?v=jlhjrMKiZfo)
**Duration:** 24m 30s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 20 of 26 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.49

> combining this peripheral milling with pocket milling and then we'll just build slowly until our machining more and more

combining this peripheral milling with pocket milling and then we'll just build slowly until our machining more and more complex pieces let's go ahead and first start with modeling this shape here to do that what we're going to do is we're going to create a new part file so we can select new part file and just like we always do whenever we create a new part file as we set our units and we're gonna be working in inches for this now to start this off we're gonna go ahead and model this rectangular base so we're gonna go ahead on our top plane create a new sketch we're gonna grab our Center

_Signals: toolpath:1 · safety:1 · howto:5_

### Tip 2 — confidence 0.45

> right at the origin and go out to the side and draw a slot roughly that size we're going to dimension from Center Point 

right at the origin and go out to the side and draw a slot roughly that size we're going to dimension from Center Point to Center Point at 4 inches and we're going to dimension the radius here to 0.75 and then we can go ahead and extrude this up half of an inch as well right like that now once we start doing this and by that I mean start generating tool paths what you're gonna have to do is start paying attention to how you're creating your 3d models it's very easy in SolidWorks in SolidWorks in SolidWorks to create 3d models that are difficult or impossible to manufacture we're gonna touch

_Signals: camOps:2 · params:1 · howto:1_

### Tip 3 — confidence 0.45

> gonna start with define machine and what we're doing is we're just telling it that we're gonna mill on a traditional mil

gonna start with define machine and what we're doing is we're just telling it that we're gonna mill on a traditional milling machine and what that will do is that will pop up with the default tool crib or our default tool table now in future videos we're gonna go through and actually create our own tool table but for now just getting the hang of this this default tool table world will work just fine for us next what we're gonna do is we're gonna set our coordinate system this is when we load our part into the mill where we would set our zero that's what we're setting right now so we can

_Signals: camOps:2 · howto:4_

### Tip 4 — confidence 0.4

> coordinate system we are gonna select part bounding box vertex what that's gonna do is it's gonna create this box around

coordinate system we are gonna select part bounding box vertex what that's gonna do is it's gonna create this box around our part that's gonna simulate our Ross stock our part is our finished part this box popping up here is our raw piece of stock what we're gonna do is we're gonna select this corner right here this front top right hand corner and what we want to do is if we notice this triad here we want to set this to how our milling machine is set up so we would have our X along this axis our Y along this axis along this axis along this axis and our Z going straight up and down to alter

_Signals: howto:5_

### Tip 5 — confidence 0.43

> that what we're going to do is we're going to select this x axis right here and just click on an edge that is in the dir

that what we're going to do is we're going to select this x axis right here and just click on an edge that is in the direction of that x axis so we're going to select this front edge here next we're going to select the same thing for our y axis and we're gonna choose this edge right here so that's painting our positive X in this direction our positive Y in this direction and our positive Z going straight up which is what we want so what we can do is select ok now once we have that set up what we're gonna do is we're gonna define our stock size for this we're gonna go to stock manager and you

_Signals: howto:8_

### Tip 6 — confidence 0.4

> can see once again it's creating that same box now what it defaults to is the minimum stock size that you would need to 

can see once again it's creating that same box now what it defaults to is the minimum stock size that you would need to create this piece in our case it's giving us a piece of stock that's six inches long one inch tall and two inches thick that might not always be the case a lot of times your stocks of times your stocks of times your stocks is going to be the stock that you have on hand and there are ways you can edit this year particularly when we start doing more complex parts our minimum stock size might not correlate to a standard stock size that you can buy for McMaster or another

_Signals: safety:1 · howto:1_

### Tip 7 — confidence 0.41

> material supplier so we can alter that here and we'll do that in future videos but for now we're just gonna stick with t

material supplier so we can alter that here and we'll do that in future videos but for now we're just gonna stick with the minimum so once we have our stock defined we can select ok so we've defined machine our coordinate system and our stock manager what we're gonna do is select setup mill setup now what we're doing is we're telling our computer here how the part will be oriented in our vise and what we want to do for this is just select this top surface what that's doing is it's telling SolidWorks that we're gonna be milling straight down and you can see this arrow here imagine that's how

_Signals: camOps:1 · howto:3_

### Tip 8 — confidence 0.42

> your cutter is coming in to your part so we want to tell it that our stock is going to be oriented like this or our part

your cutter is coming in to your part so we want to tell it that our stock is going to be oriented like this or our part is going to be oriented like this we can select ok next we're going to move to extract machinable features what this is gonna do is it's gonna analyze our part and pull out all of the features that it feels needs to be machined based on our stock setting you can see here it identified this area here as an open pocket so this is what SolidWorks are what cam works is going to go ahead and machine out it's not gonna do anything to the bottom because that's already the size of

_Signals: toolpath:1 · howto:2_

### Tip 9 — confidence 0.78

> the stock next we're gonna select generate operation plan literally all we're doing is just moving left to right right r

the stock next we're gonna select generate operation plan literally all we're doing is just moving left to right right right all of these buttons here and you can see what it did is it took that machinable feature and turned it into a rough mil and a contour mil now what SolidWorks is doing is it's generating a rough mill which is going to remove the bulk of the material and then it's coming in afterwards with a contour mill contour mill is going to cut it to final shape now we can see this briefly if we select generate tool path and simulate tool path what this is gonna do is it's gonna

_Signals: toolpath:5 · camOps:5 · howto:3_

### Tip 10 — confidence 0.65

> generate the tool path based on the rough and contour mill features and then we're just simulating this going through no

generate the tool path based on the rough and contour mill features and then we're just simulating this going through now unfortunately unfortunately through now unfortunately unfortunately through now unfortunately unfortunately it's not quite that simple we're gonna have to alter this and do a few other steps to this and we can speed this up and we have our finished piece now like I said we're gonna have to do some things to this what we're gonna do is instead of doing a rough mill and a contour mill for the sake of this tutorial we're just gonna cut this out in one pass so we're just gonna

_Signals: toolpath:3 · camOps:5_

### Tip 11 — confidence 0.68

> delete this contour mill you do that we can just right click and delete yes and then you can hide that from your recycli

delete this contour mill you do that we can just right click and delete yes and then you can hide that from your recycling bin if you want to so what we're left with is just this rough mill now if we run this tool path again you'll see it cuts it more or less to the same shape however if we zoom in here do you see how it's left with this green perimeter and then we have our solid piece this green is material that's left behind because when it does that rough mill it doesn't cut it quite to final shape to final shape to final shape final shape is cut too in the contour me love a finish pass so

_Signals: toolpath:3 · camOps:6 · howto:3_

### Tip 12 — confidence 0.55

> what we have to do is go back into this rough mill and edit some of the parameters in there so that it cuts it to the fi

what we have to do is go back into this rough mill and edit some of the parameters in there so that it cuts it to the final shape so what we're going to do is we're going to come in here where it says rough melt and right click and select edit definition what we're going to do first is we're going to change the tool that we use to cut this with right now I believe it's using a 3/8 flat end mill what we're going to do is we're going to change it to a tool that we're a little more familiar with which is our half-inch - flute end mill we're gonna select that from our tool crib and we can hit

_Signals: camOps:5 · howto:5_

### Tip 13 — confidence 0.41

> select and then if it asked you to replace the tool holder also click yes so what that's gonna do is it's gonna replace 

select and then if it asked you to replace the tool holder also click yes so what that's gonna do is it's gonna replace that with our two flute and half-inch two-fluid end mill now in this case it happens to be carbide the cutters that we're familiar with our high speed steel when we go ahead and create our own tool table will update this but for what we're doing right now it doesn't actually matter and I'll show you why in the next step what our our tool material is so when we go to the next tab here feeds and speeds by default it's defining the feeds and speeds based off the pre-programmed

_Signals: camOps:1 · howto:3_

### Tip 14 — confidence 0.4

> steel tooling cutting aluminum is 300 so 4 times 300 divided by the diameter of our cutter which in our case is a half-i

steel tooling cutting aluminum is 300 so 4 times 300 divided by the diameter of our cutter which in our case is a half-inch that's going to give us a cutting speed of 2400 rpm so we can go back and we can set our spindle speed to 2400 next for feed rate this is how fast the machine is moving the cutter through our part the formula for that is feed rate in inches per tooth times your cutter speed times the number of teeth on the cutter our feed rate in inches per tooth that's a setting typically set by the tool manufacturer and for our tooling it is tooling it is tooling it is mm mm of an inch

_Signals: params:1 · howto:2_

### Tip 15 — confidence 0.45

> per tooth times our spindle speed of 2400 and our Carters have two teeth it's a two flute and mill so if we take mm time

per tooth times our spindle speed of 2400 and our Carters have two teeth it's a two flute and mill so if we take mm times 12 2400 times 2 that's going to give us a feed rate of nine point six inches per minute for simplicity we're just gonna round this up to 10 inches per minute so what we can do is we can set our XY feed rate feed rate feed rate 2:10 now it also has settings here for Z feed rate this is how fast the cutter is going to be fed in the Z direction or straight down this has a preset parameter here of 25% so what we can do is turn that off for Z and lead in feed rate lead and feed

_Signals: camOps:2 · params:1 · howto:1_

### Tip 16 — confidence 0.41

> rate is when it first comes into our part and Z feed rate is the speed cutting down Z feed right I typically like to use

rate is when it first comes into our part and Z feed rate is the speed cutting down Z feed right I typically like to use a value of 2 and lead in feed rate you can leave that at 5 inches per minute these values here of 25% and 50% those are perfectly fine values if you want to you can leave them turned on or if you want to manually adjust those you can do it that way as well so once we have our feed rate set what we have to do is go to roughing now before it was leaving an area around our part that it didn't quite cut that is the allowance right here that's set to 10,000 so it was leaving an

_Signals: params:1 · howto:3_

### Tip 17 — confidence 0.42

> area of 10,000 extra on our pardon we want this to cut it all in one pass so we're going to set this to 0 step over is h

area of 10,000 extra on our pardon we want this to cut it all in one pass so we're going to set this to 0 step over is how much the cutter moves over on subsequent passes how much offset there is in our case that's not an issue because it's gonna take only one pass we'll adjust that in future tutorials but for now we can leave that to 40% for cutting method we have the option of climb milling or can engine milling in general climb milling is going to give us a better surface finish so we're gonna leave that set to climb and now under depth parameters we have some values we need a set in here

_Signals: camOps:1 · howto:4_

### Tip 18 — confidence 0.41

> particularly first cut amount and Max cut amount we're going to turn off the percentage values here so that we're dealin

particularly first cut amount and Max cut amount we're going to turn off the percentage values here so that we're dealing with the depth in inches rather than percentages now for our machines we're able to cut 50 thousandths at a time so what we're gonna do is we're gonna set our first cut amount to 50 thousands and we're also gonna set our max cut amount to 50 thousands under NC what I like to do in here rapid plane just make sure that's set to top of stock that is the height at which the cutter is moving rapidly across our part one inch over stock for this inju for this command is fine and

_Signals: camOps:1 · howto:3_

### Tip 19 — confidence 0.47

> then clearance plane I'm also going to set this to top of stock and that height of 100,000 once we've done that we can g

then clearance plane I'm also going to set this to top of stock and that height of 100,000 once we've done that we can go ahead and select ok and you can see it's gone ahead and regenerated our tool path with those updated values with our updated feed rate and with that updated depth of cut this has a height of 1/2 of an inch so we should have 10 different cutting operations here because each cut is at 50 thousands so what we can do is we can go ahead and simulate this tool path this slider right here is the cutting speed and this is gonna simulate our cutter coming through and removing this

_Signals: toolpath:2 · howto:2_

### Tip 20 — confidence 0.4

> material now for the sake of our video I'm just going to speed this up a little bit and you'll see is removed all of the

material now for the sake of our video I'm just going to speed this up a little bit and you'll see is removed all of the excess material from the side you'll still see some on the ends here particularly on radius this is a remnant because of how SolidWorks calculates corners you'll see it sort of tessellate sit into straight lines rather than a continuous arc in reality this will cut it to the correct depth on that height this is just an artifact of SolidWorks tessellating that arc and that is the basics of generating a outside contour feature now when we do this SolidWorks gives us

_Signals: toolpath:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-jlhjrMKiZfo-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/jlhjrMKiZfo.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].