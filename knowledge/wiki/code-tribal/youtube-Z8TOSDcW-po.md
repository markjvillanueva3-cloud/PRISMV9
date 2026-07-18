---
title: "Solidworks CAM Tutorial: Adding Tool Paths (3)"
domain: cam
source: youtube
videoId: Z8TOSDcW-po
url: https://www.youtube.com/watch?v=Z8TOSDcW-po
channel: "Professor Cameron"
duration_s: 1479
tribal_entries: 18
chunks_scanned: 29
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Solidworks CAM Tutorial: Adding Tool Paths (3)

**Channel:** [Professor Cameron](https://www.youtube.com/watch?v=Z8TOSDcW-po)
**Duration:** 24m 39s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 18 of 29 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.42

> we're just gonna start out by drawing that outside rectangular profile we're gonna come up here grab our Center rectangl

we're just gonna start out by drawing that outside rectangular profile we're gonna come up here grab our Center rectangle tool put it right at the origin and dried out a square and we're gonna dimension this to a length of 7.75 and a height of 4 0.75 and then once we have that our sketch is defined we can extrude this now we're going to go ahead and extrude this to a height of two point one five two point one five and that's going to come back and be important a little bit later so we can go ahead and select okay once we have that we can create that rectangular pocket now we're gonna do the

_Signals: toolpath:1 · howto:2_

### Tip 2 — confidence 0.47

> start this essentially like we started it last week we're gonna go to our SolidWorks cam tab and then just work our way 

start this essentially like we started it last week we're gonna go to our SolidWorks cam tab and then just work our way left to right we're going to start by defining the Machine and we're going to use a mill in inches and select okay we are going to set our coordinate system we are going to do heart bounding box vertex and we're gonna select this front right corner this is where we're gonna zero our part in our in our mill we're gonna set our axes we're gonna set this to x-axis x-axis x-axis on this front line right here where it already is and we're gonna set our y-axis to this line right

_Signals: camOps:2 · howto:6_

### Tip 3 — confidence 0.42

> here on the side and that looks pretty good our X positive direction is this way our Y positive direction is this way an

here on the side and that looks pretty good our X positive direction is this way our Y positive direction is this way and our Z positive direction is straight up and that's how our mill is set up so that's how we want to set this up so that looks good we can go ahead and select okay alright like that next we're gonna go to stock I'm an attorney stock I'm an attorney stock I'm an attorney now last week what we did is we just chose a piece of stock that was the same size as our part right so in this case it would be 0.75 by two point one five by four point seven five however when you go to buy

_Signals: camOps:1 · howto:4_

### Tip 4 — confidence 0.43

> and what it does is it recognizes this rectangular pocket here as the machinable feature we're gonna generate the operat

and what it does is it recognizes this rectangular pocket here as the machinable feature we're gonna generate the operation plan generate tool paths we're gonna come back and edit these values in a little bit and there we go we have our in this case three tool paths so let's go ahead and simulate this let's see how this looks before we go ahead and start editing any of these values so what its gonna start out with first is a three-quarter inch a 10mm and it's just going to come in here and and and clear out the bulk of this material and we can fast-forward through this and it's down to the

_Signals: toolpath:1 · params:1_

### Tip 5 — confidence 0.48

> hundred thousands to this that is actually interfering now with this tool holder and this is gonna essentially ruin our 

hundred thousands to this that is actually interfering now with this tool holder and this is gonna essentially ruin our part for us and at the very least it's gonna damage our tooling so what we're gonna do is we'll let this run through and you know we cleaned out our pocket for us but like I said it damaged this upside surface now the way we're gonna fix this is by actually cutting off this excess material we have to cut that off anyways and to do that we're gonna use a face mill so what we can do is to add in another milling operation we're gonna go to set up and mill set up now in our case

_Signals: toolpath:1 · camOps:2 · howto:2_

### Tip 6 — confidence 0.54

> we want to mill the face of this so we're gonna select right here for a features face and then we're going to select thi

we want to mill the face of this so we're gonna select right here for a features face and then we're going to select this top surface just like we did the first time we did it and we can select okay and you can see what it did is it put in a face feature for the top of this part we can go ahead and extract machinable features and generate machinable features and generate machinable features and generate operations plan again make sure we update this generate tool path and you'll see what it does is it creates a new tool path for that face mill feature so we have our original three tool paths

_Signals: toolpath:2 · camOps:2 · howto:3_

### Tip 7 — confidence 0.56

> from before our roughing mill our contour mill and then it added in a new mill part set up with a new face mill and this

from before our roughing mill our contour mill and then it added in a new mill part set up with a new face mill and this is good because what it's going to do to do to do is we'll step through this here run through mill this all out just like it did before and then come through here with a face mill to clean off that one thousandth of an inch I'm sorry a hundred thousandth of an inch from before now you'll notice what it's doing is it's putting that face mill operation at the end now we don't want this because from before we still have that issue where that quarter inch face mill or that

_Signals: toolpath:1 · camOps:8 · howto:1_

### Tip 8 — confidence 0.57

> quarter inch end mill is crashing into our part and like I said it's gonna damage our part but it's also gonna damage ou

quarter inch end mill is crashing into our part and like I said it's gonna damage our part but it's also gonna damage our tooling and we don't want that so what we're gonna do let's see right here coming up in just a second second second yep right here right it's still crashing our in our in our set up so what we're gonna do is before we mill this pocket out we're gonna put this face mill operation in and all we're gonna do is just reorder how we have this set up so to do that what we're gonna do is take our two setups here no parts set up one and mill parts set up - we're just gonna drag

_Signals: toolpath:1 · camOps:4 · howto:5_

### Tip 9 — confidence 0.54

> mill parts set up on underneath alright so it should be grouped - and then group one now when we simulate our tool path 

mill parts set up on underneath alright so it should be grouped - and then group one now when we simulate our tool path it should come in here with that 2-inch face mill mill off the top of this and then after that it will come in with the in our case three quarter inch cutters perfect and then when we jump to the end here let's slow this down now when we jump to the end here it's going to cut this and then when it gets to the bottom right that's where it crashed before there we go when we look at this we have just enough clearance room in here for this cutter to cut and also not crash into

_Signals: toolpath:1 · camOps:3 · safety:1 · howto:1_

### Tip 10 — confidence 0.46

> and this looks good so this is gonna run for us and perfect we end up with our finished piece and we end up with our cor

and this looks good so this is gonna run for us and perfect we end up with our finished piece and we end up with our corners cut to that radius that we specify because we use the smaller diameter tooling and we have our surface our top of our surface faced off so now all we have to do is come back in here and edit the values to the appropriate feeds and speeds for our part so in our case we're gonna start with our two-inch face mill so we're gonna right-click on face mill edit definition and here we go our tool it's a two inch five flute face mill now in our case this is a carbide tool so

_Signals: camOps:3 · howto:2_

### Tip 11 — confidence 0.42

> that's going to affect our feeds and speeds when we go to our feeds and speeds to have speeds to have speeds to have sel

that's going to affect our feeds and speeds when we go to our feeds and speeds to have speeds to have speeds to have select defined by operation now if we recall back from that calculating spindle speed chart our rpm is 4v / D we we simplify 12v over PI D so 4 times our surface speed now we're using carbide tooling and a little bit um so our surface speed is quite a bit higher 600 surface feet per minute divided by the diameter of the tool which is 2 inches that's going to give us an RPM of 1200 rpm of 1200 now our feed right now theoretically we can alter this feed rate to match our

_Signals: params:2 · howto:1_

### Tip 12 — confidence 0.47

> calculated feed rate which if we do it comes out to 12 feet per minute or we can typically go slower generally the slowe

calculated feed rate which if we do it comes out to 12 feet per minute or we can typically go slower generally the slower you machine the better your surface finish will come out come out come out come out specifically with face milling when I do a lot of face milling I prefer to do it around the 4 inches per minute mark I find that gives me a good surface finish in aluminum but for our case for our calculations were gonna go with 12 inches per minute we can leave our z feed rate at 5 and our bleed and feed rate at 0.75 these will be fine values for us for facing we're gonna leave all of this

_Signals: camOps:2 · params:2_

### Tip 13 — confidence 0.49

> here the same and then what we're gonna do is we're just gonna make sure that our first cut amount and max count amount 

here the same and then what we're gonna do is we're just gonna make sure that our first cut amount and max count amount are set to 50 thousandths of an inch we don't want to be cutting super deep with a face mill and then we can go to NC plan and make sure both of these values are top of stock and then we can click OK and that looks pretty good good good so because this is one hundred thousandths thick and our cut depth is fifty thousand so it should do two passes which we can see from our tool path here that it's doing now we can jump down here to our mill part set up one group and what it's

_Signals: toolpath:1 · camOps:2 · howto:3_

### Tip 14 — confidence 0.56

> giving us is two roughing operations one for the main body and then one for the corner cleanup and then the contour mill

giving us is two roughing operations one for the main body and then one for the corner cleanup and then the contour milling is where it actually gets inning cuts those corners to the perfect radius we can actually cut out this second rough mill operation this one that just comes in and touches up the corners we can delete that what we can do is we can edit these two values here so we'll start with rough mill one we're going to edit definition and for this we're gonna go back and use the same high speed steel tool that we've been using our half-inch diameter to flew ten mill so we're gonna go

_Signals: toolpath:1 · camOps:5 · howto:1_

### Tip 15 — confidence 0.44

> to tool tool tool we're gonna go to tool crib and we're gonna select half inch to flute and mill and select yes for our 

to tool tool tool we're gonna go to tool crib and we're gonna select half inch to flute and mill and select yes for our feeds and speeds we're gonna go to defined by operation and our spindle speed is exactly the same as it was in our last tutorial it's gonna be twenty four hundred and our feed rate is going to be ten we can go to roughing for our allowance we're actually going to leave that ten thousandth allowance because we're going in with our quarter inch end mill and that's gonna clean that up if we were just doing this in one pass like we did last week we would set this to zero for

_Signals: camOps:2 · howto:3_

### Tip 16 — confidence 0.5

> then we can go ahead and click OK and that looks good and then finally we can come in here with our contour mill this is

then we can go ahead and click OK and that looks good and then finally we can come in here with our contour mill this is gonna be our quarter inch end mill we can edit definition on this our tool it's a quarter inch to flute and mill and that's fine we're gonna leave this as is for feeds and speeds again defined by operation now if we were call back from our speed calculations our spindle speed is a pretty much direct correlation to our diameter now since our diameter is half the size of our half-inch diameter all right our cutting speed is gonna be twice as high so we're gonna go to 4,800

_Signals: toolpath:1 · camOps:3 · howto:1_

### Tip 17 — confidence 0.58

> rpm that's moving quite quick our feed right we are going to set this to 10 and contour what we're going to do is we're 

rpm that's moving quite quick our feed right we are going to set this to 10 and contour what we're going to do is we're going to come over here and just like we did before we're gonna change our first and maxcut amounts to 50 thousands and see plain top of stock and that's it we're gonna click OK and then what we can do is we can't go ahead and generate toolpath again toolpath again toolpath again and simulate this and we'll see how this looks should start off with our facing operation and should do two passes for this and that's looking pretty good that's gonna cut our stock down to our

_Signals: toolpath:4 · howto:3_

### Tip 18 — confidence 0.47

> final size and then after it does this it should come in with the half inch end mill and that looks pretty good I'm gonn

final size and then after it does this it should come in with the half inch end mill and that looks pretty good I'm gonna speed this up here because it's gonna take quite a lot of passes with that half inch end mill now the only reason we're using our half inch end mill for this is just because this is a common tool that we have in the when workshop if we had access to three quarter inch or in this case even probably one inch diameter Carter's we would definitely use that for time sake savings and then it should come in here with our quarter inch end mill and come in and clean out the sides

_Signals: camOps:4_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-Z8TOSDcW-po-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/Z8TOSDcW-po.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].