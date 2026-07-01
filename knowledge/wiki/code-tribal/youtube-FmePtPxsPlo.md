---
title: "Topography - Representing topological geometry - tutorial 2 of 3"
domain: general
source: youtube
videoId: FmePtPxsPlo
url: https://www.youtube.com/watch?v=FmePtPxsPlo
channel: "Karl Daubmann"
duration_s: 2091
tribal_entries: 17
chunks_scanned: 45
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Topography - Representing topological geometry - tutorial 2 of 3

**Channel:** [Karl Daubmann](https://www.youtube.com/watch?v=FmePtPxsPlo)
**Duration:** 34m 51s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 17 of 45 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.51

> so let's pick up so let's pick up from where we started with our patch surface we have a randomly created patch surface 

so let's pick up so let's pick up from where we started with our patch surface we have a randomly created patch surface that we're going to treat as a topography as a topography as a topography hopefully i've had a chance to play with the different seed values the different seed values the different seed values see what that creates let's look at a couple of different ways that we can operate on this surface as a way to deal with its representation so the first and most obvious one is contour so i'm going to double click and search search search for contour and we are going to take a contour

_Signals: toolpath:3 · howto:1_

### Tip 2 — confidence 0.6

> contour contour from a b rep a b rep in grasshopper stands for a boundary representation representation representation w

contour contour from a b rep a b rep in grasshopper stands for a boundary representation representation representation which is a surface and so we're going to contour contour contour a b rep let's look at the inputs that it needs it needs a it needs a it needs a b rep or a mesh to contour this will be our patch surface our patch surface our patch surface it needs a contour start point this is defined as zero zero zero depending on what you did with your with your with your domain for your z value you may want to increase these increase these increase these because if you have a point or if

_Signals: toolpath:7_

### Tip 3 — confidence 0.62

> you have part of your surface that's coming down like it is in mind and if that's below that point it won't contour it s

you have part of your surface that's coming down like it is in mind and if that's below that point it won't contour it so what you can do is just move your start move your start move your start and then domain for the z up and then we can make sure that we can just use this simple this simple this simple default as the origin point for our contour line contour line contour line and so that start point is set 0 0 0 we can change that if we need to later contour direction is 0 0 and 1 and so that's in the z direction so that's also the default that's also the default that's also the default all

_Signals: toolpath:5 · howto:2_

### Tip 4 — confidence 0.6

> we need to set is a slider for our distance and so i'll set this 0 less than 5 less than 10 and we'll plug this in to th

we need to set is a slider for our distance and so i'll set this 0 less than 5 less than 10 and we'll plug this in to the d we can see that we just got some initial contour lines contour lines contour lines if we turn this down and get to be more like one foot contour lines this is beginning to look more like a topography that looks great so let's let's deal with representation a little bit and so let's see because i don't because i want to control what this looks like and i want to hide that point let me build my own and so that's probably the plane the plane where we where we where we or

_Signals: toolpath:4 · camOps:1 · howto:2_

### Tip 5 — confidence 0.42

> contour start point so let's just build our own point build our own point build our own point and so we can do that by c

contour start point so let's just build our own point build our own point build our own point and so we can do that by constructing a point plug that in for p now we can hide it right click and hide that point point point so the other thing that we can do is to start using some of our custom so under display preview there's custom preview we can do two things with this custom preview we can see it has the jagged edge there's nothing nothing nothing that comes out from the custom preview and then we can use a swatch which is a color swatch and so let me set this to maybe a greenish color

_Signals: toolpath:1 · howto:2_

### Tip 6 — confidence 0.6

> except we'll plug this in for material override and then i'll turn the patch surface patch surface patch surface to have

except we'll plug this in for material override and then i'll turn the patch surface patch surface patch surface to have that as a color i can hide the patch surface now because i have that preview as preview as preview as as an output and then i'll also color the contour lines so if i copy my preview and swatch and then set the contour lines for that geometry and hide the contour so now i've got a topography with contour lines so i hope that makes sense go back change your seed values let's see if that continues to work so now we have a representation of that so that's one type of

_Signals: toolpath:4 · camOps:1 · howto:2_

### Tip 7 — confidence 0.45

> representation type of representation type of representation that i wanted to cover so that's contour lines so what we c

representation type of representation type of representation that i wanted to cover so that's contour lines so what we can do is pull all of this down all of this down all of this down and group it and we can name it contour and for now let's just we can hide the preview hide the preview hide the preview of both of those and if we want to come back to it and this is something that i that we'll continue to work on this semester semester semester is that what's amazing about uh these digital technologies is that it can have multiple multiple multiple and simultaneous different types of

_Signals: toolpath:2_

### Tip 8 — confidence 0.47

> representation associated with it representation associated with it representation associated with it and so we can cont

representation associated with it representation associated with it representation associated with it and so we can continue to have the contours running in the background but we can have a couple of other representations that come with this so the next thing that i want to do is i want to build i want to make it so that we could say we could say we could say 3d print this as a base model and so what i'll do is i'll come back i'll turn on i'll turn on i'll turn on the patch and when i when i the way that i want to approach this is i want to extract i want to extract i want to extract the

_Signals: camOps:4_

### Tip 9 — confidence 0.52

> join together to join together to join it'll be our edges holding down shift our boundary and then our our our patch sur

join together to join together to join it'll be our edges holding down shift our boundary and then our our our patch surface and here's our join at the end so what we have now we have now we have now is a solid object it's completely closed and what we could do now is to um to um to um let's see this is something that could be 3d printed be 3d printed be 3d printed and so this is a kind of simple thing now to come back now to come back now to come back to and and allow this to work we could turn back on our contour lines that are just on that surface so we get a sense for that a sense for

_Signals: toolpath:1 · camOps:4_

### Tip 10 — confidence 0.51

> that a sense for that we could also contour this in multiple directions you could rather than contouring it contouring i

that a sense for that we could also contour this in multiple directions you could rather than contouring it contouring it contouring it from bottom to top we could contour it left to right left to right left to right we could start to cut sections in it that way but this is the second representation and maybe what i'll do is i'll just grab my preview so ctrl c ctrl v and let's make a preview we can hide the join and we'll turn on the preview we can hide our patch again so now we have something we could 3d print this we can have a representation of something that has a little bit more mass to

_Signals: toolpath:2 · camOps:2_

### Tip 11 — confidence 0.4

> to leverage these tools tools tools to give us some additional information as we're making design decisions something is

to leverage these tools tools tools to give us some additional information as we're making design decisions something is color coded it tells us something's wrong it gives us a dimension dimension dimension it can give us other things through the color coding color coding color coding so let's let's hide so let's let's hide so let's let's hide that preview and we can hide the contour lines for now again we can come back to any of these and let's come back to our patch surface as i do that as i do that as i do that when i group this together and let's just name this solid site so let's move

_Signals: toolpath:1_

### Tip 12 — confidence 0.41

> this this smaller grid on there and so if we want to increase those we can if we want to decrease it we can turn it down

this this smaller grid on there and so if we want to increase those we can if we want to decrease it we can turn it down so something where there's a high enough resolution of our of our surface patches there we'll turn off or we'll hide our patch so we just have that now so now the next tool that we're going to use is that that that we're going to use area and it sounds like a strange tool to use but area does a couple of things for us it has geometry that comes in so we can feed this in and you can see it just it just it just added a point at the centroid of each of those those those those

_Signals: camOps:2_

### Tip 13 — confidence 0.42

> is going to be the z by right clicking that point we can change the color i just want to do maybe i want to flip-flop th

is going to be the z by right clicking that point we can change the color i just want to do maybe i want to flip-flop these what i want to have is that maybe the we'll move from one color that's low so maybe we'll set maybe we'll set maybe we'll set a low color to be blue and let's turn off a couple things while we're here we're here we're here we can hide these so this is giving us now a third representation representation representation type that gives us the z value so let's say that say that say that the altitude mattered where we were within the topography within the topography within

_Signals: camOps:1 · howto:4_

### Tip 14 — confidence 0.46

> and then as we go back and change our seed values and and these right now those um the values of um the values of um the

and then as we go back and change our seed values and and these right now those um the values of um the values of um the values of that diffuse color are always changing because remember the points are moving and so this is taking the boundaries of the min the min the min and the max we could set these values let's say to give it slightly different values let's set let's set let's set um let's disconnect um let's disconnect um let's disconnect the low value and let's see what happens when we set it to zero and so it's just kind of blue down here when it's set to zero because zero if we come

_Signals: safety:1 · howto:7_

### Tip 15 — confidence 0.43

> all the way back to where our solid model was and so but this will be a when it's if it's always going from zero and alw

all the way back to where our solid model was and so but this will be a when it's if it's always going from zero and always going to the max we could also also also change this slightly of having that as an absolute value that this will be this will be this will be consistent except for at the top but we could also change could also change could also change that let's see we'll disconnect it will set the upper limit to 40.

_Signals: safety:2 · howto:5_

### Tip 16 — confidence 0.46

> which is maybe in this in this range already so maybe that needs to raise we'll set it to 70 this time and we'll see wha

which is maybe in this in this range already so maybe that needs to raise we'll set it to 70 this time and we'll see what see what see what i have the happens time setting those numbers with my mouse so now we're giving a sense that we're in the mid-range because of that but i don't mind the relative nature of these so that the min and the max of our surface are always going to change and so the minimum point is always going to be blue the maximum point will always be red so now as we change our seed values so those highest peaks are going to be red red red and the lowest values are going to

_Signals: safety:3 · howto:3_

### Tip 17 — confidence 0.47

> is the other representation so we can take this contour it 3d print it do anything we want but here's a simple way if yo

is the other representation so we can take this contour it 3d print it do anything we want but here's a simple way if you wanted to show let's say for show let's say for show let's say for for studio you want needed to have a number of different number of different number of different options to share with your professor or a number of different options to be able to show to show to show to a colleague to a colleague to a colleague you can output these and the only thing that i would that i would that i would maybe i don't want to say caution you with this with this with this is that you

_Signals: toolpath:1 · camOps:1 · safety:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-FmePtPxsPlo-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/FmePtPxsPlo.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].