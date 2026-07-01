---
title: "SOLIDWORKS CAM: TOOL CHANGES AND ADDING TOOL PATHS"
domain: cam
source: youtube
videoId: -CJtW6ORjDw
url: https://www.youtube.com/watch?v=-CJtW6ORjDw
channel: "Professor Cameron"
duration_s: 1972
tribal_entries: 32
chunks_scanned: 42
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SOLIDWORKS CAM: TOOL CHANGES AND ADDING TOOL PATHS

**Channel:** [Professor Cameron](https://www.youtube.com/watch?v=-CJtW6ORjDw)
**Duration:** 32m 52s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 32 of 42 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.43

> okay welcome back everyone okay welcome back everyone so now that we've gone ahead and set up our custom tool crib our c

okay welcome back everyone okay welcome back everyone so now that we've gone ahead and set up our custom tool crib our custom tool crib our custom tool crib what we're going to do is we're going to go ahead and use that tool crib to generate generate generate the tool paths to cut out this wrench so we're going to go ahead and start this like we start all of our other models we're going to go ahead and define the machine define the machine define the machine mill inches and we're going to go to tool crib and we're going to make sure we select that new tool index that we just built and we're

_Signals: camOps:1 · howto:5_

### Tip 2 — confidence 0.43

> bounding box vertex but we're going to set it up in our traditional fashion our traditional fashion our traditional fash

bounding box vertex but we're going to set it up in our traditional fashion our traditional fashion our traditional fashion our x-axis is going to go along the x leading edge the x leading edge the x leading edge our y axis is going to go along our y leading edge and just adjust the direction of those so that they are pointing in the proper direction the arrow always points in the positive direction in the positive direction in the positive direction so this looks good all right how we have it like that it like that it like that we can go ahead and select okay next we're going to go we're

_Signals: safety:1 · howto:4_

### Tip 3 — confidence 0.53

> we're going to go to extract machinable features calculates all the features that we have generate operations plan it's 

we're going to go to extract machinable features calculates all the features that we have generate operations plan it's going to use use use the tools from our tool crib to figure out how to cut this generate tool path and then let's go ahead and simulate this and let's see how this looks you can see here what it's doing is it's coming in with a quarter inch end mill to remove the bulk of this now i don't like that like that like that um i don't like using a small end mill for sort of for sort of for sort of bulk material clearance we're going to change this out to our half inch end mill mill

_Signals: toolpath:1 · camOps:4 · howto:1_

### Tip 4 — confidence 0.67

> mill when we go ahead and edit this code but it's running through here afterwards it's going to do it's going to do it's

mill when we go ahead and edit this code but it's running through here afterwards it's going to do it's going to do it's going to do a contour path and again it switches to an even smaller end middle i believe it swaps out to the 3 16 3 16 3 16 end mill there's no need to do this so we're going to go ahead and make that a half inch end mill as well it's going to clean out this center pocket pocket pocket and then it is going to clean out these corners corners corners do a finish pass in here then it's going to address these holes that looks pretty good now there's a few issues with this one

_Signals: toolpath:4 · camOps:4_

### Tip 5 — confidence 0.49

> issues with this one issues with this one we still have some material on the top of this part right because we have to a

issues with this one issues with this one we still have some material on the top of this part right because we have to add a facing operation add a facing operation add a facing operation and the the elephant in the room is it didn't cut out this big hole here so we're going to have to add in an operation for that as well so let's go ahead and start addressing these uh these uh these uh one by one and then we'll add in those missing tool paths so for this rough this rough this rough uh outside contour we're going to edit that that that definition and the first thing we're going to do is we're

_Signals: toolpath:1 · camOps:3_

### Tip 6 — confidence 0.4

> and our z feed rate and lead and feed rate are fine at the 25 and 50 values and 50 values and 50 values for roughing we'

and our z feed rate and lead and feed rate are fine at the 25 and 50 values and 50 values and 50 values for roughing we're actually going to keep in the roughing pass which is what we we we haven't been doing beforehand uh we've been just been just been just using the roughing pass to cut down to size but we're going to keep this in we're going to go ahead and change our cut amounts to 50 thousandths for our clearance planes our rapid plane we're going to change our rapid plane to 0.1 0.1 0.1 for the top of the stock one thing we do want to make sure of is to turn this cnc cutter compensation

_Signals: camOps:1 · howto:2_

### Tip 7 — confidence 0.56

> off we're going to set up an accompanying tool table accompanying tool table accompanying tool table on the mill and the

off we're going to set up an accompanying tool table accompanying tool table accompanying tool table on the mill and the mill is going to handle that compensation for us so we're going to go ahead and turn this off if we leave it on it's going to give us a warning us a warning us a warning when we actually go ahead and try to load this it's going to yell at us so make sure we have our cnc cutter compensation off compensation off compensation off and then we can leave the rest of this oh wow that half inch end mill and that's going to be a little bit better suited to clearing out the bulk of

_Signals: camOps:4 · safety:3 · howto:1_

### Tip 8 — confidence 0.58

> that material material material so let's go ahead and change our contour mill as well mill as well mill as well we're es

that material material material so let's go ahead and change our contour mill as well mill as well mill as well we're essentially going to set it up with the same parameters there's no need for cutting it down with a smaller end mill mill mill and what this is going to do is it's going to reduce the number of tool changes we have to do so we're going to change our cutter to a half inch end mill half inch end mill half inch end mill feeds and speeds are going to be exactly the same as they were in the last operation 2400 and then a feed rate of 10 with 25 and 75 percent values for 75 percent

_Signals: toolpath:1 · camOps:9 · howto:3_

### Tip 9 — confidence 0.42

> values for 75 percent values for z in lieden for contour there's not a whole lot we have to do in here except adjust our

values for 75 percent values for z in lieden for contour there's not a whole lot we have to do in here except adjust our cut amounts to 50 thousandths thousandths thousandths and this is just because this is what our machine can handle if we start putting pushing it more than this we're really going to be stretching the machine stressing the tools stressing the tools stressing the tools just all around not have a good time so we're going to go ahead and set that to fairly conservative 50 thousandths fairly conservative 50 thousandths fairly conservative 50 thousandths and c plane we're going

_Signals: toolpath:1 · howto:2_

### Tip 10 — confidence 0.54

> to change our rapid to 0

to change our rapid to 0.1 rapid to 0.1 rapid to 0.1 and again make sure our cnc compensation is is is turned off so we've got these swapped out now for this rough mill in here for the bulk of this material clearance we can change this to a half inch end mill as well mill as well mill as well there's no need to use the 3 16ths in here here here the half inch end mill will do that in one zip one zip one zip so we're going to go ahead and change this rough mill operation this rough mill operation this rough mill operation we're going to change our tool to the half inch half inch half inch to

_Signals: camOps:12 · howto:4_

### Tip 11 — confidence 0.72

> fluid end mill feeds and speeds are going to be exactly the same as they were in the last two operations we're going to 

fluid end mill feeds and speeds are going to be exactly the same as they were in the last two operations we're going to come in and we're actually going to rough this out or we're going to do a contour pass in this pocket here so we're going to leave some allowance leave some allowance leave some allowance and the reason why we have to do a a contour pass contour pass contour pass in here is because our cutter won't actually fit the half inch end mill won't actually won't actually won't actually fit into these tight radii so we're going to use a smaller end mill to go in and clear those out

_Signals: toolpath:5 · camOps:4_

### Tip 12 — confidence 0.45

> plane for our rapid plane for our rapid plane again cutter compensation turned off and you can see it turned that multi-

plane for our rapid plane for our rapid plane again cutter compensation turned off and you can see it turned that multi-pass into a pretty quick one and done in here now we do have to come in and clean up these corners these corners these corners because we're cutting this with the half inch end mill and these are tighter radii radii radii you can see we can't actually quite reach in there so we're going to come in with this 3 16 inch end mill this rough mill 3.

_Signals: camOps:4 · params:1_

### Tip 13 — confidence 0.4

> the tool we're going to keep we're going to use that 3 16 channel what we're going to do is adjust the speeds and feeds 

the tool we're going to keep we're going to use that 3 16 channel what we're going to do is adjust the speeds and feeds now when we calculate the spindle speed for this this is going to be 4 times 300 divided by 0.1875 and what we notice here is here is here is that's a pretty high rpm now our machines can't actually do that we're limited to about 2 800 rpm max so unfortunately we cannot cut at the optimum rpm but we're going to do the best we can so we're going to set our spindle speed to 2800 our feed rate when we calculate that out 2800 times two times 2800 times two times 2800 times two

_Signals: params:1 · howto:2_

### Tip 14 — confidence 0.47

> just because we're dealing with a smaller cutter we want to cut a little bit more conservatively with that than we would

just because we're dealing with a smaller cutter we want to cut a little bit more conservatively with that than we would with something like a big hunk and half inch end mill um it's a pain when we snap a cutter so we're going to do everything we can to avoid it avoid it avoid it z and lead and feed rates are fine at 25 and 50 for roughing again we're going to leave in some in some in some meat in here because we're going to actually zip around this again with the same cutter in this contour mill but for our cut amounts we're going to set that to 50 thousandths if we were removing

_Signals: toolpath:1 · camOps:2 · howto:1_

### Tip 15 — confidence 0.49

> substantially more material than we are material than we are material than we are i would bump this down even smaller i'

substantially more material than we are material than we are material than we are i would bump this down even smaller i'd bump this down to about 25 thousands right if we didn't change this roughing mill operation here mill operation here mill operation here um to a half inch head mill we would want to bump that down since we're just cleaning up these corners we're not doing a lot of heavy cutting cutting cutting we can cut this at 50 thousands and for our rapid plane we're going to adjust that to 0.1 as well again cutter compensation turned off so we're looking pretty good so far trucking

_Signals: camOps:4 · howto:2_

### Tip 16 — confidence 0.52

> along this contour mill it's going to come in and clean that up we're going to essentially use the same parameters that 

along this contour mill it's going to come in and clean that up we're going to essentially use the same parameters that we did for the last one tool is staying the same but our feeds and speeds are changing and speeds are changing and speeds are changing spindle speed is going to be that 2800 our our our feed rate is going to be eight that looks pretty good contour set our depth of cut to 50 thousands nc plane point one nc plane point one and cnc cutter compensation turned off now we come to the drilling operation what it's going to do is it's going to drill through these holes with a 3 16

_Signals: toolpath:2 · camOps:2 · howto:1_

### Tip 17 — confidence 0.49

> inch diameter drill we actually don't have much we have to edit on this our tool we don't have to change our spindle spe

inch diameter drill we actually don't have much we have to edit on this our tool we don't have to change our spindle speed we can change this it's going to be the same it's going to be 2 800 rpm we're actually going to leave that spindle speed the same spindle speed the same spindle speed the same as our end mills drill hole parameter so when this drills it's not just going to take that drill bit and bury it down in in one continuous pass it's going to do an operation called pecking and that's where it kind of just comes in and pecks it a little bit at a time and that's to help clear out

_Signals: camOps:3 · params:1 · howto:2_

### Tip 18 — confidence 0.6

> chips and to kind of help reduce heat the peck amount heat the peck amount heat the peck amount how deep it goes down ea

chips and to kind of help reduce heat the peck amount heat the peck amount heat the peck amount how deep it goes down each peck is going to be a hundred to be a hundred to be a hundred we can change that we can make that 50 thousands and for our nc plane we're going to change this to 0.1 change this to 0.1 change this to 0.1 and we're going to select ok now let's just see how this all looks up until this point until this point until this point that's looking pretty good that was a little fast let's run through that one more time more time more time it's coming in cleaning up the outside

_Signals: toolpath:4 · howto:5_

### Tip 19 — confidence 0.6

> perimeter with our half inch end mill drilling and counter boring drilling and counter boring so what we have to do now 

perimeter with our half inch end mill drilling and counter boring drilling and counter boring so what we have to do now is adjust this counter bore counter bore counter bore and then we can and then we can and then we can go ahead and add in the facing operation and this milling operation so this contour mail it's going to come in and drill this counter bore it's going to be the same operation as this 3 16 this 3 16 this 3 16 inch mills here we're going to set it up just the same way feeds and speeds are going to be 2 800.

_Signals: toolpath:1 · camOps:6 · params:1 · howto:2_

### Tip 20 — confidence 0.64

> feed rate of eight now in this it's going to [Music] [Music] [Music] not quite be doing a plunge uh a plunge is where it

feed rate of eight now in this it's going to [Music] [Music] [Music] not quite be doing a plunge uh a plunge is where it takes just the the half inch end mill and plunges it into that thick material into that thick material into that thick material it's not quite doing a punch but it's almost doing a plunge almost doing a plunge almost doing a plunge so what we're going to do is we're going to set our z feed rate to come down very slowly especially with these small diameter end mills diameter end mills diameter end mills you you don't really want to be plunging at all but if you do you don't

_Signals: toolpath:5 · camOps:1 · howto:1_

### Tip 21 — confidence 0.45

> want to be plunging quickly so that's coming in at just under an inch a minute which is fine it's not going in deep goin

want to be plunging quickly so that's coming in at just under an inch a minute which is fine it's not going in deep going in deep going in deep so it's not going to add too much time towards us but it is gonna potentially save us from snapping this end mill for contour we're gonna go ahead set this this this to our you know unlike what we've been doing we're cutting in we're cutting in we're cutting in aluminum for this piece we're not going to cut in wax so we do want to be a little bit more conservative in our cuts cuts cuts so this oil looks fine our nc plane we're going to change to 0.1

_Signals: toolpath:1 · camOps:1 · howto:2_

### Tip 22 — confidence 0.53

> add a two and a half axis milling operation milling operation milling operation and we're going to add a rough mill we'r

add a two and a half axis milling operation milling operation milling operation and we're going to add a rough mill we're going to do this with our half inch end mill inch end mill inch end mill and for features we have to create a feature here our end condition our end condition is going to be up to up to face and we're going to select this face here here here so we're drilling to the bottom of this feature with our half inch end mill we're going to select okay and that's going to add that going to add that going to add that roughing mill operation in here so our tool half inch end mill

_Signals: camOps:8 · howto:3_

### Tip 23 — confidence 0.44

> speeds and and and feeds and speeds are going to be the same for all same for all same for all of the other half inch en

speeds and and and feeds and speeds are going to be the same for all same for all same for all of the other half inch end mills now because we are doing a plunge with this we're doing a this we're doing a this we're doing a straight punch with this half inch end mill we're going to mill we're going to mill we're going to slow this z feed right down we're going to slow that down to 1.

_Signals: toolpath:1 · camOps:3_

### Tip 24 — confidence 0.44

> um plunges are pretty hard we try to avoid them when we can if we were doing a lot of these holes we would probably pre-

um plunges are pretty hard we try to avoid them when we can if we were doing a lot of these holes we would probably pre-drill this but because because because we're only doing one we're gonna uh we're gonna live on the wild side here and see what happens and see what happens and see what happens for roughing we can add in a clearance pass to this we're going to cut this right down to stock stock stock right down to uh finish size if this were something like a precision bore that we were pressing a bearing into into into we might want to take a little bit more diligence in this diligence in

_Signals: camOps:3_

### Tip 25 — confidence 0.6

> straight plunge is pretty rough on the tool on the equipment so we're just going to take our time and let it bore this o

straight plunge is pretty rough on the tool on the equipment so we're just going to take our time and let it bore this out this out this out and c-plane is still going to be that 0.1 0.1 0.1 cutter compensation turned off and then let's see if that yep that looks pretty good there we go now all we have left to do is to face this so this is where we're going to add in a new two and a half milling operation and we're going to select face mill to select face mill to select face mill two and a half inch face mill feature create new feature two and a half axis we're going to select this space here

_Signals: toolpath:1 · camOps:6 · howto:5_

### Tip 26 — confidence 0.52

> here with that that that face mill feeds and speeds for the face mill mill mill i'm going to define by operation so that

here with that that that face mill feeds and speeds for the face mill mill mill i'm going to define by operation so that's going to be four times 600 because our face mill has carbide inserts carbide inserts carbide inserts divided by 2.5 so about a thousand rpm our feed rate we're gonna set that to a feed rate of five and then a feed rate of one will be fine for our z feed right the reason we're going so slow for the face mill we're not cutting off a lot of material material material but we want it to uh have a really good surface finish on the top there so that's why we're going so slow

_Signals: camOps:7 · howto:2_

### Tip 27 — confidence 0.66

> with that one one one for facing we're going to do this all in one facing operation so our stepover is not really going 

with that one one one for facing we're going to do this all in one facing operation so our stepover is not really going to be important here we're only cutting off 25 000 off the top top top so our first cut amount and max cut amount are fine where they're at nc plane we're going to set to 0.1 and we can select ok we can generate our tool path tool path tool path and we can simulate this tool path now just like we've seen before our half inch end mill inch end mill inch end mill buzzing that out it's going to zip [Music] and then just buzzing that all clean and that looks perfect that looks

_Signals: toolpath:4 · camOps:3 · howto:2_

### Tip 28 — confidence 0.55

> perfect that looks perfect now before we go ahead and finish this what we want to do is just reorder these slightly righ

perfect that looks perfect now before we go ahead and finish this what we want to do is just reorder these slightly right because it's going to follow this tool change iteration iteration iteration and what we don't want to do is go from our half inch to our 3 16 to a drill back to our 3 16 inch back to our half inch our half inch our half inch so we're going to go ahead and take this rough mill operation here rough mill operation here rough mill operation here and drag this up to be clustered with our other half inches so that way it does all these operations in one go with that one tool we

_Signals: camOps:8 · params:1 · howto:2_

### Tip 29 — confidence 0.54

> don't have to change out tools next we're going to take this drill operation and drag it up underneath those half inches

don't have to change out tools next we're going to take this drill operation and drag it up underneath those half inches come on there we go and then we're going to have our 3 16 combined combined combined then our phase mill so this is going to limit the number of tool changes that we have to do have to do have to do and we can simulate that just to see how that looks this way we're not going back and forth and back and forth with tools it'll do it one and done perfect now let's see what our total tool path time is for this uh total tool path time is gonna be about an hour plus 12 plus two

_Signals: toolpath:2 · camOps:2 · howto:3_

### Tip 30 — confidence 0.72

> so we're looking maybe about an hour and a half two hours for this total cut time now in looking at this this contour th

so we're looking maybe about an hour and a half two hours for this total cut time now in looking at this this contour this outside contour we can outside contour we can outside contour we can in fact speed this up we can edit that definition so 0.1 depth for this contour mill one it's going to be a little bit more aggressive but we're not removing a ton of material so that's just going to save us a few minutes on that the rest of these i would probably leave as they are our drill looks fine i would not adjust the 3 16 any and our face mill we don't have anything to adjust so to adjust so to

_Signals: toolpath:5 · camOps:3 · howto:3_

### Tip 31 — confidence 0.41

> adjust so we saved ourselves about six minutes on this outside contour here we can kind of push that a little bit and th

adjust so we saved ourselves about six minutes on this outside contour here we can kind of push that a little bit and this is just something you get with experience you know just sort of knowing how far you can push these tools and you know if this were a true production environment we could probably push these a little bit further a little bit further a little bit further but uh since we're just learning right now this is an education environment we're not trying to crank these out we're going to leave this as is so what we can do now is we can go ahead and post-process this post-process

_Signals: toolpath:1 · howto:1_

### Tip 32 — confidence 0.5

> this post-process this and we can save this wherever it's convenient for us and we're going to go ahead and run this and

this post-process this and we can save this wherever it's convenient for us and we're going to go ahead and run this and this will finish pretty quickly we got to let that run all the way through and now we can go ahead and send that code right to our mill so if you guys have any questions on this let me know hopefully this all works out for you works out for you works out for you it should and then this way we can just dive right in next week and start cutting these right on the mill so mill so mill so follow along if you guys have any questions leave me a comment send me an email email

_Signals: camOps:5_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath--CJtW6ORjDw-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/-CJtW6ORjDw.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].