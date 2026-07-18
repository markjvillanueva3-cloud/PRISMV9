---
title: "CNC Cutting with Fusion 360: A Step-by-Step Tutorial"
domain: cad
source: youtube
videoId: lXSVlk3FqHc
url: https://www.youtube.com/watch?v=lXSVlk3FqHc
channel: "What Make Art"
duration_s: 780
tribal_entries: 18
chunks_scanned: 20
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# CNC Cutting with Fusion 360: A Step-by-Step Tutorial

**Channel:** [What Make Art](https://www.youtube.com/watch?v=lXSVlk3FqHc)
**Duration:** 13m 0s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 18 of 20 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.41

> path the CNC is only following numbers made of the G-Code exported in the postprocess of fusion 360 so we're going to st

path the CNC is only following numbers made of the G-Code exported in the postprocess of fusion 360 so we're going to study how do we create these tool paths so we cut out the proper thing with our CNC machine here I have the shape in plywood that we want to cut out this demonstr Ates some typical cuts that you're going to make with a CNC machine here in the middle we have a pocket cut that doesn't go all the way through but it has an organic organic organic shape then we also have a slot that goes all the way through like a DAT cut with a table saw this is a very common cut in CNC and then

_Signals: toolpath:1 · howto:1_

### Tip 2 — confidence 0.44

> of course we'll need to make a contour cut that cuts all the way around the outside of the plywood once you have everyth

of course we'll need to make a contour cut that cuts all the way around the outside of the plywood once you have everything in your model and your design the way you want we need to switch workspaces so go up to the top left and select manufacturer workspace here in the manufacturer workspace it looks the same except now we have different options and we can create a stock or material that we're going to cut our part from in order to do that we're going to click setup and then new setup Fusion is asking us some questions it wants to know how the model is oriented so we need to set the work

_Signals: toolpath:1 · howto:4_

### Tip 3 — confidence 0.42

> coordinate system and we also need to set the Box Point this is the zero point that the CNC machine will use to start cu

coordinate system and we also need to set the Box Point this is the zero point that the CNC machine will use to start cutting for these basic operations when we definitely have a square object we can select under orientation select z-axis plane and z-axis plane and z-axis plane and x-axis now I can either select a plane or an edge for the z-axis and then I can select the x-axis right here if I want to flip the z-axis I can so now the z- is pointing up and then I just need to select the Box Point so right now it says stock box point so I need to select it and for this first cut because we're

_Signals: howto:7_

### Tip 4 — confidence 0.41

> going to cut the pocket Cuts first I want to select this box point at the top left over here so now this is the z-axis g

going to cut the pocket Cuts first I want to select this box point at the top left over here so now this is the z-axis going up the Y AIS going this way the x- axis going this way and this is where the zero point will be on the CNC machine in the setup we need to go to stock for this we're going to use a fixed size box and for this box we'll type in 12 in 12 in and 75 now we have stock that is larger than our object and then we need to offset from the left and then offset from the Y and we want to offset 1.25 in this gives us enough material that we can use hold downs and other equipment and

_Signals: toolpath:1 · howto:1_

### Tip 5 — confidence 0.43

> we don't have to worry about the shop pot running into those parts often you will not have a symmetrical object so you'l

we don't have to worry about the shop pot running into those parts often you will not have a symmetrical object so you'll have to use this offset to make sure your object fits with inside the stock once the stock is set up then we can select postprocess and right now it just has it just has it just has one1 but what we can do is type Z Top this will be the prefix for any program that we name and that way we know that the Z is at the top for this program then we can select okay over here it says setup three I'll also rename this to pocket cuts and now I need to make a new cut the first thing

_Signals: toolpath:1 · howto:3_

### Tip 6 — confidence 0.67

> to do is to select 2D 2D select 2D 2D select 2D 2D pocket on this page it's going to ask for a tool so I'll select tool 

to do is to select 2D 2D select 2D 2D select 2D 2D pocket on this page it's going to ask for a tool so I'll select tool I'm going to select the quarter-inch flat End Mill if you want to know how to make this tool you can watch the video Linked In the the the description once I have my tool selected it brings in all the feeds and speeds that I need so I don't need to do anything here then I go to the geometry tab tab by clicking geometry and I need to select this face so if I select this face it knows that this is going to be the pocket that I'm going to cut out then I'm going to go to Heights

_Signals: toolpath:2 · camOps:7 · howto:7_

### Tip 7 — confidence 0.46

> for the pocket cut we want to go the bottom height to be the selected Contour then the passes this is one of the most im

for the pocket cut we want to go the bottom height to be the selected Contour then the passes this is one of the most important things we need to make sure that our passes are correct if we were trying to fit apart we could have stock to leave be negative but right now I'm just going to uncheck it if you're trying to get a specific fit and tolerance this is the proper way to do it you can have negative stock value or a positive stock value we definitely need to check multiple depths and we need to have our maximum roughing step down of1 125 and then we want to select use even step use even

_Signals: toolpath:2 · howto:1_

### Tip 8 — confidence 0.66

> step use even step Downs then we can go to linking and for our ramp instead of Helix we'll select plunge that should be 

step use even step Downs then we can go to linking and for our ramp instead of Helix we'll select plunge that should be everything we need we can press okay Fusion 360 will now calculate the tool path that you can see right here you can see how it's going to go around and be in that tool path if you want to watch the tool path select it then click simulate you can click play to watch the simulation or you can just click all the way to the end and see if it's going to cut out the part that you expect we'll exit the simulation and we'll click on our setup now we have a pocket cut that's going

_Signals: toolpath:7 · howto:6_

### Tip 9 — confidence 0.63

> to cut this one out just like we want to save time I can rightclick on this and I can duplicate it now this is duplicate

to cut this one out just like we want to save time I can rightclick on this and I can duplicate it now this is duplicated and this is my second pocket so if I rightclick and I edit it now I just need to change the geometry for this one I don't need it so I'm going to delete all the pocket selections and this time now I need to select this pocket everything else will be the same so I can just press okay now for the pocket Cuts I can select the entire thing select simulate click click click play I can change the speed of the simulation and this is exactly what I expect these are the two cuts

_Signals: toolpath:4 · howto:9_

### Tip 10 — confidence 0.45

> that I'm going to cut first before the Contour cut that goes all the way around the outside of the part these will be ze

that I'm going to cut first before the Contour cut that goes all the way around the outside of the part these will be zeroed from the top of the stock that way their depths are as accurate as possible if we Z from the bottom then we will have variations in the thickness of the stock and the material that won't give us the most accurate Cuts so now I'm going to exit the simulation now we need to make a new setup so that we can Zero from the bottom the most accurate way to do this is to duplicate your previous setup so I'm going to right click on the setup and click and click and click

_Signals: toolpath:1 · howto:5_

### Tip 11 — confidence 0.52

> duplicate if we look here it says pocket Cuts I want to go ahead and delete this one and delete this one I want to renam

duplicate if we look here it says pocket Cuts I want to go ahead and delete this one and delete this one I want to rename this setup as contour and then I want to rightclick and and edit the most important thing is to change the Box Point so I'm going to click Box Point and then I want to click the bottom here so if you look down at the bottom we are now zeroing the z-axis from the bottom of the stock material this is basically the bed of our CNC machine everything else is exactly the same we don't need to change it if you change the stock size then all your cuts are not going to line up

_Signals: toolpath:2 · howto:7_

### Tip 12 — confidence 0.7

> under postprocess go ahead and click the name and type Z bottom or zbot and then select zbot and then select zbot and th

under postprocess go ahead and click the name and type Z bottom or zbot and then select zbot and then select zbot and then select okay the last thing we need to do is make a contour cut so we can go to 2D 2D Contour Fusion 360 will have already selected the quarter-inch flat End Mill but go ahead and double check to make sure you have the right tools selected then for geometry we're going to go ahead and select this bottom Edge so we can just click the edge and now it's going to go all the way around something that is different than using pocket Cuts is when you make a contour cut it's

_Signals: toolpath:4 · camOps:3 · howto:6_

### Tip 13 — confidence 0.42

> they're really easy to remove with a router router router later there are two options of setting tabs you can either set

they're really easy to remove with a router router router later there are two options of setting tabs you can either set by distance and here we have them every 2 in which would be too many tabs we can try 4 in and this gives us a nice set of tabs but sometimes you get a tab right on the edge here and that can be not the best if you position them by the segment here it's going to try to avoid putting tabs right on the corner so if you notice that try the different methods here and if it still doesn't work you can always use manual tabs and you can still add a manual tab like this if I select

_Signals: safety:1 · howto:3_

### Tip 14 — confidence 0.42

> and I click here it's going to add a tab if I need one more so that's usually the best way to go about that I'm going to

and I click here it's going to add a tab if I need one more so that's usually the best way to go about that I'm going to delete that tab by holding shift next I need to click on Heights before we wanted our bottom height to be exactly the height of the selected Contours in a perfect world that would be perfect we would just cut all the way through our 3/4 in plywood and it would magically cut all the material away that's not the way it works generally cuz there's always imperfections so we want to go just a little bit further than the plywood so we're going to type we're going to type we're

_Signals: safety:1 · howto:3_

### Tip 15 — confidence 0.49

> going to type 

going to type .02 then click on passes and once again we need to make sure we have multiple depths we don't want 75 we want .125 which is half the diameter of our bit we can use even step Downs if you needed to make this part fit into something else we could use stock to leave and stock to leave could be a negative number or a positive number depending on how your fit and tolerances work everything under linking should be fine and then we can click okay notice that the tool path will go up over the tab so when we simulate that so I'll go ahead and select the Contour and I'll click simulate

_Signals: toolpath:2 · howto:4_

### Tip 16 — confidence 0.59

> and we start pressing play it goes around but it leaves these tabs that need to be cut out later and you can see how the

and we start pressing play it goes around but it leaves these tabs that need to be cut out later and you can see how the tool path will go up and over for those specific operations once you are sure that everything works for your simulation you can exit the simulation and now it's time to post process time to post process time to post process we'll go ahead and select this entire setup at the top so I can select this setup pocket Cuts then I can click post process up at the top it's the G1 G2 for your post make sure you click shopbot open SVP if you've been doing something else like laser

_Signals: toolpath:2 · gcode:2 · howto:4_

### Tip 17 — confidence 0.46

> cutting you may have a dxf post processor selected here but make sure you select shopbot name number we want to label th

cutting you may have a dxf post processor selected here but make sure you select shopbot name number we want to label this and I'm going to call it Z dtop example example example cut Fusion will save all your programs inside the fusion folder you may want to have a different folder so I'm going to do that I'll select this output folder so I made a folder of posts on my desktop so now I have right under my desktop post very easy to find make sure that you're using inches for the shop but and then click but and then click but and then click post next we need to make a post for the Contour cut

_Signals: toolpath:1 · howto:6_

### Tip 18 — confidence 0.43

> CU remember in between these two operations we're going to change the z-axis of the machine so select Contour then then 

CU remember in between these two operations we're going to change the z-axis of the machine so select Contour then then then postprocess and notice it already changes this to remind you that you're going to Zero from the bottom it will remember where you're saving and then click click click post so here I have my two posts my Contours and my pockets so now I can take this to the shopbot or the CNC machine and use those to cut out my material happy 3D modeling

_Signals: toolpath:1 · camOps:1 · howto:5_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-lXSVlk3FqHc-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/lXSVlk3FqHc.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].