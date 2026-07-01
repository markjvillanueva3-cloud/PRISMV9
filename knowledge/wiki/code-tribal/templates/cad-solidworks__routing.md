---
title: "CAD function template — solidworks / routing"
software: solidworks
function: routing
source: video-tribal-aggregation
tip_count: 7
videos_covered: 3
generated_at: 2026-05-27
---

# CAD function template — solidworks / routing

**Software:** `solidworks` · **Function category:** `routing`
**Source:** aggregated from 7 video tribal tips across 3 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <routing> in <solidworks>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 7 by confidence)

### Tip 1 (confidence 0.46)

> Click on options, routing, and make sure the boxes automatically route on drop of flanges connectors and automatically f

Click on options, routing, and make sure the boxes automatically route on drop of flanges connectors and automatically flanges connectors and automatically flanges connectors and automatically route on drop of clips are both checked. Then click okay. Start by placing some clips. Go to the design library, expand routing, and in the electric folder, locate the wire tie clip. Click and drag it onto a side of the mounting plate. A smart mate will automatically make it coincident to the plate. Select 8 mm for the configuration and click okay to accept the mate. Place three more clips as follows.

_Signals: params:1 · howto:8_

_Source: [Unit 6: Routing - Lesson 1: Routing Wires](https://www.youtube.com/watch?v=r-Yc3Ib5JH4) — channel `SOLIDWORKS`_

### Tip 2 (confidence 0.43)

> Now place the second connector and rotate the assembly to place two more on the controller

Now place the second connector and rotate the assembly to place two more on the controller. Click on the connection points of two connectors from different locations and the cable will appear but it is only connected to one terminal on each each each side. Exit the 3D sketch and go to the electrical tab to select route through clip. In the current selection box, first select the cable. Then expand each wire tie from the flying feature manager and select its axis or do that from the graphics area. Once the cable is shown through the clips, click on auto route in the electrical tab.

_Signals: camOps:1 · howto:5_

_Source: [Unit 6: Routing - Lesson 1: Routing Wires](https://www.youtube.com/watch?v=r-Yc3Ib5JH4) — channel `SOLIDWORKS`_

### Tip 3 (confidence 0.42)

> hello this is Bryce hethal and I'm a certified application engineer from certified application engineer from certified a

hello this is Bryce hethal and I'm a certified application engineer from certified application engineer from certified application engineer from goengineer in today's quick tips videos we will talk about using solarworks routing electrical to create cables in the 3D environment as well as creating 2D drawings but before we start doing that we're going to talk about this routing Library manager this comes with the solar Works routing addin and what two modules we'll be looking in today mostly is the routing component Wizard and the cable wire Library wizard so we'll first start off by using the

_Signals: camOps:2 · howto:1_

_Source: [SOLIDWORKS Routing-Electrical - Cables](https://www.youtube.com/watch?v=JESQEXxDnYQ) — channel `GoEngineer`_

### Tip 4 (confidence 0.42)

> close this now there we go so now we'll go ahead and start using our routing component and our cable we just created so

close this now there we go so now we'll go ahead and start using our routing component and our cable we just created so I'll go ahead and go to my routing Library over here the electrical Library grab that connector and go ahead and drop it I'll go a and select my routing template and you'll see it throws me an auto route mode but I'll go a and turn that off real quickly and drop this next connector in here there we go and now you'll notice that we have three stubs because we chose three C points so all I have to do is start by routing between two of these stubs so I'll go from one connector

_Signals: camOps:1 · howto:4_

_Source: [SOLIDWORKS Routing-Electrical - Cables](https://www.youtube.com/watch?v=JESQEXxDnYQ) — channel `GoEngineer`_

### Tip 5 (confidence 0.41)

> point a different 2D schematic pin ID so when I route my cable to it it knows to take this wire from that cable and go t

point a different 2D schematic pin ID so when I route my cable to it it knows to take this wire from that cable and go to that connection point so we'll see that again come up later also you might see that we have a field for how much additional internal wire so when we really route these cables and wires we get really accurate calculations for our wire lengths so there we go I'm going to go ahead and finish this third one up real quickly and we'll label this last schematic pin ID and there we go so you could keep adding more if you had a more pins but we only have a three pin connector so

_Signals: camOps:2_

_Source: [SOLIDWORKS Routing-Electrical - Cables](https://www.youtube.com/watch?v=JESQEXxDnYQ) — channel `GoEngineer`_

### Tip 6 (confidence 0.41)

> selecting the stub on the pcb connector there's no electrical data in here until i edit the wires so i'll do that and se

selecting the stub on the pcb connector there's no electrical data in here until i edit the wires so i'll do that and select a blue wire i can select multiple wires as well i'll assign the data to the spline and exit out of the route now we can see all the components of the route that are saved in the subassembly i'll open it in its own window to create a drawing of it i need to flatten the route and once i do i can make a drawing of it by clicking on these various options this is a nice 2d representation of the harness harness harness going back to the parent assembly i can see a couple of

_Signals: camOps:1 · howto:3_

_Source: [SOLIDWORKS: Electrical Routing Basics](https://www.youtube.com/watch?v=UveKaws3RyE) — channel `Hawk Ridge Systems`_

### Tip 7 (confidence 0.4)

> connectors that i want to run a cable between however i need to create a connector and a custom cable library for it i'l

connectors that i want to run a cable between however i need to create a connector and a custom cable library for it i'll open up the solidworks part i want to use to use to use i need to use the routing library manager to convert this part to something routing recognizes i'll click on the routing component wizard wizard wizard first i'll select the route type electrical in this case next i'll select connectors as the component type hitting next takes me to the next step now it's time to define the c points which are the stubs that we saw in the three pin female connector i need at least one

_Signals: howto:5_

_Source: [SOLIDWORKS: Electrical Routing Basics](https://www.youtube.com/watch?v=UveKaws3RyE) — channel `Hawk Ridge Systems`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `routing` operations in `solidworks`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation