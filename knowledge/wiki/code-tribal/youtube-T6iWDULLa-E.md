---
title: "CAMWorks - Groove and Thread on the OD and ID"
domain: cam
source: youtube
videoId: T6iWDULLa-E
url: https://www.youtube.com/watch?v=T6iWDULLa-E
channel: "GoEngineer"
duration_s: 1640
tribal_entries: 23
chunks_scanned: 30
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# CAMWorks - Groove and Thread on the OD and ID

**Channel:** [GoEngineer](https://www.youtube.com/watch?v=T6iWDULLa-E)
**Duration:** 27m 20s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 23 of 30 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.51

> machine we set up the coordinate system stock size and turn setup we extract machinable features and then generate an op

machine we set up the coordinate system stock size and turn setup we extract machinable features and then generate an operation plan and then we generate and simulate tool pass and finally we post process and transfer the resulting file to our NC machine looking at the part in SolidWorks let's kind of generate a rough plan on how we want to machine this part the way I want to machine this part is I want to start machining this side first so this will be lathe operation one I'm going to do a face operation roughing finish I'm going to turn the OD a little bit just just hear this little chamfer

_Signals: camOps:5 · howto:1_

### Tip 2 — confidence 0.5

> I'm going to do a groove operation that's going to be the rough and finish here I'm going to do a drill operation and th

I'm going to do a groove operation that's going to be the rough and finish here I'm going to do a drill operation and then I'm going to do a bore to sighs rough and finish and then I'm going to thread this internal ID and that'll be late operation one again the machine plan all for lathe operation one which we running on a haas st 20 is we're going to do a face operation rough and finish operation rough and finish operation rough and finish we're going to turn the OD we're going to do a groove rough and finish we're expecting a drill operation a bore operation rough and finished and then a

_Signals: camOps:18_

### Tip 3 — confidence 0.5

> thread operation on the ID using the SolidWorks cam works workflow first thing we need to do is define our machine insta

thread operation on the ID using the SolidWorks cam works workflow first thing we need to do is define our machine installers we come to the cam works 2018 on tab and we go to the far left hand side to the define machine icon and we define a machine you'll notice that there's a number of tabs we will start from left right machine we want to change it from a mill machine we're doing a turn part so we'll go to turn single turret let's select that item the next thing I next tab over is a tool crib we want to select the tool crib laundry wrench empty and this this tool crib will get filled up

_Signals: camOps:3 · howto:6_

### Tip 4 — confidence 0.48

> when we do our generate our operation plan and tool path let's go to the post processor we said we wanted to use them th

when we do our generate our operation plan and tool path let's go to the post processor we said we wanted to use them the Haast SC 20 so let's go ahead and select that item posting we want to use start with program number 1 and then because we're in a lathe we want to go to the Chuck feature tab and this changed it from a 4 inch step check and let's move it over to a 8 inch 3-step check and then we'll say ok so we defined the machine what this did is quickly prepare cam works for your CNC machine and tools and then we'll go to the second step which is to set up the coordinate system stock

_Signals: toolpath:1 · params:2 · howto:2_

### Tip 5 — confidence 0.44

> generated operation plan so in SolidWorks again working with the cameras 2018 tab we start with the extract machinable f

generated operation plan so in SolidWorks again working with the cameras 2018 tab we start with the extract machinable features this is as we select these icons him to go through these processes the icon to the right will become available so again as we finish doing the extracting chainable features the extracting chainable features the extracting chainable features generate operational plan available when we process that generally tool path will become available and then simulate to a path and then finally post process so let's go ahead and start with the extract machinable features and

_Signals: toolpath:1 · camOps:1 · howto:1_

### Tip 6 — confidence 0.6

> again go to step four generates england cma tool path let's see what we get again this is from out of oxy trans so Solid

again go to step four generates england cma tool path let's see what we get again this is from out of oxy trans so SolidWorks again we're working with the cam works 2018 cap we go to a generate tool path and as the featured soon the operation tree items with magenta to black means they're at the tool paths so we look at this and let's see how this performs to our poor machining plan to just review our machining planning says we've got a face with roughing finish we wanna turn the OD wand your groov operation rough and finish one to a journal operation a bore rough and finished then thread ID

_Signals: toolpath:2 · camOps:6_

### Tip 7 — confidence 0.43

> okay so we're back in tonight's all works we're gonna go do simulate tool path and we see that did a lot of operations b

okay so we're back in tonight's all works we're gonna go do simulate tool path and we see that did a lot of operations but I'm not sure if it's the what we expected remember we say we'll do this in two operations and get it in one let's see what what the part looks like the simulation to the the actual part model looks like that by showing the difference here and we can see that the bore here is undersized and there's obviously no one thread operation there the groove operation looks good yeah we should split this operation too because this should be cut and it's not and that's why use again

_Signals: toolpath:1 · camOps:1_

### Tip 8 — confidence 0.45

> you see that it's it's undercut by a significant amount so what we'll do is all let's go ahead and exit out of this and 

you see that it's it's undercut by a significant amount so what we'll do is all let's go ahead and exit out of this and let's go back in and this make some Corrections our machining operation plan for late operation one has us I'm doing a bore roughing finish and a thread operation on the ID and that's not happening so let's go back and look at the operations and this makes the changes that we need to to make this part in SolidWorks we're going to work with the cam works operations tree and we'll notice that we have to some of the operations here but we have some extra ones we don't need an

_Signals: camOps:2 · safety:1_

### Tip 9 — confidence 0.57

> internal groove rock or finish or cut off so let's go ahead and remove those through operations or right will select the

internal groove rock or finish or cut off so let's go ahead and remove those through operations or right will select them right-click delete and we also have a problem these items are going back a little too far you turn rough and turn finish you should not be doing that we should only be cutting this little mount here lowest way to make those changes so in the turn rough I will come here I will right click on the turn rough operation edit the definition I'll go to the Advanced tab change the Z limits the Z in from whip to user define and I want to change this so that it actually comes to

_Signals: camOps:9 · howto:7_

### Tip 10 — confidence 0.57

> this point here and you'll see that it's minus seven thousands will say okay and you'll see that they turn the system sa

this point here and you'll see that it's minus seven thousands will say okay and you'll see that they turn the system said well turn rough is not going to do anything because it's there's nothing forward to do so I changed it back to magenta let's go to turn finish and let's change the feature depth is Z depth again we'll go to the Advanced tab changes user to flying select points and this time set it back saying - one inch what we're going to do is we're just going to type in do the math so that we make it point zero zero seven so what we'll do is we'll have it's always sure the can work

_Signals: camOps:5 · safety:1 · howto:3_

### Tip 11 — confidence 0.55

> should work for us or do one minus point zero zero seven and you see they makes the value point zero zero seven and can 

should work for us or do one minus point zero zero seven and you see they makes the value point zero zero seven and can you see it reflected here let's see okay and you see the tool path changes just for that little bit there is no turn rough operation which is expected so then we're gonna come down we have a groove rough on the owed on the OD then grew finish sinner drill and then drill so now we need to add two operations I'll actually see any three operations when you get a more rough and finish and then a thread operation so we've already removed the operations off from the operation one

_Signals: toolpath:1 · camOps:8_

### Tip 12 — confidence 0.52

> that we actually need to do these operations to but listen at what we need to add too late operation one we need a bore 

that we actually need to do these operations to but listen at what we need to add too late operation one we need a bore rough and finish and also need to add a thread operation on the ID but let's go ahead and this adds the boardwalk and finished first in SolidWorks we want to move from the cam works operation straight over to the cam works feature tree and we want to look at the ID feature one drill we want to right click Edit the definition and we want change to strategy from drill to rough finish and you'll see here on the right hand side you added some operations we had the synergy on the

_Signals: camOps:7 · howto:2_

### Tip 13 — confidence 0.51

> drill which we had previously but we added a bore rock and a poor finish operation we also want to make sure we this go 

drill which we had previously but we added a bore rock and a poor finish operation we also want to make sure we this go ahead take a look and see what it gives us we generate is a neutral drill or rough or finish okay so let's go ahead and generate a tool panel for this just control select items and then generate talkback let's get the center drill goes on appropriate depth the drill is also going a little farther than we want the party do they save some for the second operation and the four rough is going to the appropriate depth and the bore finish is going little T for them why it's going

_Signals: camOps:11 · howto:1_

### Tip 14 — confidence 0.42

> all the way through so that's going to correct that this shows that drill operation let's right click on the journal ope

all the way through so that's going to correct that this shows that drill operation let's right click on the journal operation edit definition advance user define and we want to go back to find here user to find select a point and we want to select this point here we want to do the math to make sure it goes back well let's go back - one point four because we wanted leveland living room for our boring bar let me do the math you real quick just a moment sir one point two five three minus one point for you see our total depth is d minus one point four see okay if she gets added in here C okay

_Signals: camOps:1 · howto:4_

### Tip 15 — confidence 0.51

> mostly the drill depth has changed this change the poor rough make sure it's going back the appropriate distance so we'l

mostly the drill depth has changed this change the poor rough make sure it's going back the appropriate distance so we'll right-click any definition change it from whip to user to flying and again we can just add minus 0.3 leave us a hundred thousandths difference again we'll see the number here and this look at the rough in operation that's a little too much difficult difficult difficult let's change that down to 30 mm which is twice on those radius and we want to leave 20,000 and on the radio and we want to leave ten thousands on the axial preview you see the changes here and number of cuts

_Signals: camOps:3 · params:1 · howto:4_

### Tip 16 — confidence 0.43

> increases that's good we'll say okay or finish 24 back this way to change that edit the definition user define and encha

increases that's good we'll say okay or finish 24 back this way to change that edit the definition user define and enchant us again to minus 0.3 and this look at the finished operations and this is too much for cuts we left 20,000 some of previous operation we want to use 20,000 which is a little over twice little over the tool nose radius of 16 tau and we want to do nothing there keep that it's preview of that and you can see again it's changed the amount of cuts and then we all say ok okay so that's how we had the for roughing finish let's take a look at what we need to add next so we we

_Signals: camOps:2 · howto:2_

### Tip 17 — confidence 0.49

> added the boar roughen finish operation now we need to add the thread operation on the ID so let's go ahead and do that 

added the boar roughen finish operation now we need to add the thread operation on the ID so let's go ahead and do that switch over to the solo works in SolidWorks we're going to use the cat works 2018 tab and we're going to go to turn operations and we're going to add turn bore operations and the operation we're going to do is a thread I'm not sure why it's not give it to me try that again here just a moment there we go thread operation we're going to add a thread tool right there and we're gonna create a new feature we went to the features tab now we're going to create a new feature and all

_Signals: camOps:4 · howto:2_

### Tip 18 — confidence 0.49

> we're gonna do is we're gonna grab this you sent here and say okay strategy's not drill its thread and we see here the w

we're gonna do is we're gonna grab this you sent here and say okay strategy's not drill its thread and we see here the wallet tools and we'll say okay and here we see the tool and then again in the feature tree you notice that the thread operation is on magenta you can right-click on that and generate the tool path now we have all the operations that we wanted for length operation one let's go ahead and do a simulate tool path one things I want to mention here is that yet you you can't model your tools so that they are correct in size you'll see the threading operation it just did

_Signals: toolpath:2 · camOps:1 · howto:1_

### Tip 19 — confidence 0.55

> representing quite accurately but but this is the correct tool path so we look here everything else is green let's go ah

representing quite accurately but but this is the correct tool path so we look here everything else is green let's go ahead and save this as a STL so we can use it for our next operation and we do that here say work whip as STL get notice that there's a little guide here that shows you on with a different color me colors me so we finished programming a part for lathe op one for the haas st 20 and now we need to do the lathe op 2 on the kumail be 15 let's take a look at the machining plan again we needed to do a face rough and finish turn OD rough and finish a dural operation a bore finish a

_Signals: toolpath:1 · camOps:7_

### Tip 20 — confidence 0.53

> goo finish and then a thread operation on the OD the work for the workflow for the second operation is the same we got t

goo finish and then a thread operation on the OD the work for the workflow for the second operation is the same we got to define a machine set up a coordinate system stock size turn set up extract machine will features generate an operation plan generating simulate tool paths I've done some of these just to not to be repetitive but let's take a look at what what I've done so far so I've defined the machine turn single turn turn a single turret tool crib we're using tool crib one you don't notice that it's populated with the tools our first operation post processors on Okuma lb 15 and the

_Signals: camOps:5 · howto:3_

### Tip 21 — confidence 0.41

> chuck I changed it to a 10 inch three-step Chuck the coordinate system again I'm using this coordinate system I created 

chuck I changed it to a 10 inch three-step Chuck the coordinate system again I'm using this coordinate system I created in solo works coordinate system using lathe op 2 lathe op 2 lathe op 2 and again you'll notice it here Z in the X direction and then the stock manager again we're using 316 stainless steel instead of using the round bar stock we're actually going to be using the whip STL file that we created and you'll notice it here you'll see that the lathe operation one items are removed the OD grew the thread and you see the turn setup has been created z position the X and you also

_Signals: camOps:1 · params:1_

### Tip 22 — confidence 0.52

> notice that I did the extract machinable features and we have some features listed here but not quite all that we need a

notice that I did the extract machinable features and we have some features listed here but not quite all that we need and before we generate an operation plan let's make some changes here on the feature tree this ID feature drill one this should not just be drill only but it should also be a bore finish so let's go ahead and I'll make that so so we'll right click on this item edit the definition change it from just a drill only to a rough and finish and you'll see that it adds in those operations and I don't believe this bore ruff is going to happen because there's just not enough material

_Signals: camOps:8 · howto:2_

### Tip 23 — confidence 0.55

> but let's see what happens when we generate an operation plan with that okay so we're going to generate an operation pla

but let's see what happens when we generate an operation plan with that okay so we're going to generate an operation plan everything went from magenta to black so let's move over to the operation street and we see we have a number of tools items going here so let's go ahead and generate a tool path okay looks like everything went down even the bore rough and the bore finish there's no rougher for the groove it's just a finished groove but we're missing the OD thread the OD thread the OD thread so let's go ahead and add that here so we'll go to turn operations term bore operations excuse me

_Signals: toolpath:1 · camOps:6_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-T6iWDULLa-E-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/T6iWDULLa-E.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].