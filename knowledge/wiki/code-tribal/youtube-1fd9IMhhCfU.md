---
title: "CATIA V5 Beginner Tutorial - Surface Design / GSD (Part 4)"
domain: cad
source: youtube
videoId: 1fd9IMhhCfU
url: https://www.youtube.com/watch?v=1fd9IMhhCfU
channel: "CAD Masterclass"
duration_s: 2828
tribal_entries: 30
chunks_scanned: 47
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# CATIA V5 Beginner Tutorial - Surface Design / GSD (Part 4)

**Channel:** [CAD Masterclass](https://www.youtube.com/watch?v=1fd9IMhhCfU)
**Duration:** 47m 8s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 30 of 47 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> where you will uh put your input geometry uh like wireframe or even surfaces this would be the most likely in in this ca

where you will uh put your input geometry uh like wireframe or even surfaces this would be the most likely in in this case uh it would be the most likely origin of this surface uh considering we are designing this from scratch and without context I'm I'm I'm drawing this uh myself but uh for this is for a part like this you would probably receive this from somewhere some someplace else then you have your construction set in the construction set in the construction set in the construction set you most likely need to put uh a subset with features and for each feature you would create another

_Signals: howto:5_

### Tip 2 — confidence 0.41

> geometrical set as you can see here I have one set from the bottom surface uh and I have renamed this one for the top su

geometrical set as you can see here I have one set from the bottom surface uh and I have renamed this one for the top surface rename this as well one for the side and one for the other other other side uh we have this reinforcement here as a different set and this uh set for the holes after this the holes after this the set I have another set where all of this comes comes comes together we assemble all of these sets that we have individually built we only now at the end of the of our of our tree do we assemble them together we start joining them and creating the final our final part after we

_Signals: howto:6_

### Tip 3 — confidence 0.41

> part we go to part we go to part we go to part hit okay enable hybrid design now we design now we design now we start uh

part we go to part we go to part we go to part hit okay enable hybrid design now we design now we design now we start uh organizing our structure here insert geometrical insert geometrical insert geometrical set input this will actually be empty for now we have our construction set and inside our construction set we will have a subset have a subset have a subset named features inside the feature features inside the feature set we'll begin with it doesn't matter right now we will just rename it later we have this final assembly stuff and then I don't like this order so we will right click the

_Signals: howto:6_

### Tip 4 — confidence 0.43

> that we made a little mistake here and we've put our our sketch and ex Extrusion uh in the wrong uh geometrical set that

that we made a little mistake here and we've put our our sketch and ex Extrusion uh in the wrong uh geometrical set that's not a problem we can uh select them both with control right click and change geometrical set change it to this you click no to put it inside and then hit okay right I did not explain this uh well but let's just delete this the way you create uh kind of like the equivalent of a pad in surfaces is with surfaces is with surfaces is with extrude extrude takes a sketch and extrud extrudes it along the direction when you select a sketch it'll automatically automatically

_Signals: howto:10_

### Tip 5 — confidence 0.46

> automatically um select the normal to sketch option which in this case it's the y z plane and you then select the length

automatically um select the normal to sketch option which in this case it's the y z plane and you then select the length go One Direction and the other and click okay and then you have your surface again put it in the wrong tree in order to to to create all these surfaces uh where you want them you need to right click and Define in work object now it is always a good idea to have like a have like a have like a join a join is uh usually used to join multiple surfac multiple surfac multiple surfac but here we can use it uh like um like a three structuring uh feature you just hit join and create

_Signals: safety:1 · howto:7_

### Tip 6 — confidence 0.43

> and select this you could join multiple surfaces together here but now we just use it to join one and then we create a j

and select this you could join multiple surfaces together here but now we just use it to join one and then we create a join and we know that this join is basically the output of the output of the output of the set right so we can even rename if we want to like bottom want to like bottom want to like bottom surface and then we use this as a bottom surface so every time we we we can change uh something here uh we change in the sketch we can add features we can add a lot of stuff uh but then we will edit this bottom surface and then we will will will remove this like that and we will select

_Signals: howto:8_

### Tip 7 — confidence 0.41

> something else and the part will just automat automatically update good now that we created our bottom surface we need t

something else and the part will just automat automatically update good now that we created our bottom surface we need to create our top surface we create another surface we create another surface we create another set we name it top surface surface weate we make weate we make weate we make plane or better yet no we create a sketch on this sketch on this sketch on this plane like that plane like that plane like that and then we have a line which we constrain to be a certain distance from distance from distance from this 60 seems color these color these differently and continue with the other

_Signals: howto:6_

### Tip 8 — confidence 0.44

> surfaces now now that we have our top surfaces the top surface and bottom surface we need to connect them somehow so we 

surfaces now now that we have our top surfaces the top surface and bottom surface we need to connect them somehow so we click this again insert the geometrical geometrical geometrical set click no to be inside and we name it side let's say L for left and then we create a line like create a line like this which we constrain to be be be 40 guess 40 is too much 30 mm away away right now this line we need to basically have it angled like this we could do an extrude uh but uh then we would need to create another line to to get the get the get the direction what we could do is a sweep but first if

_Signals: params:1 · howto:6_

### Tip 9 — confidence 0.47

> we want to sweep this uh this uh this uh line first it would be I think a very good idea to project this line on this su

we want to sweep this uh this uh this uh line first it would be I think a very good idea to project this line on this surface so we know where the starting point is it would it will allow us to to control the surface uh control the surface uh control the surface uh better so in order to do that there is a command called command called command called project projection you click on the projected element and on the support in this case a normal projection would be fine after this we need to create an angled surface surface we do this by using the sweep using the sweep using the sweep command in

_Signals: toolpath:2 · howto:2_

### Tip 10 — confidence 0.4

> the sweep command you need to select your profile type which matches uh your input uh wireframe the best for us it's a l

the sweep command you need to select your profile type which matches uh your input uh wireframe the best for us it's a line like this here on subtype the most by far the most common one is with reference surface now what this does is you select the the line the guide curve and you select the reference surface and after this you can select an angle like this and this will sweep will sweep will sweep this will basically create a sweep according to to this according to to this according to to this line with the line with the line with the 80 uh degrees relation to your base surface now our

_Signals: howto:5_

### Tip 11 — confidence 0.46

> draft direction as the Z component and we don't need to click the project we can take the sketch directly our guive curv

draft direction as the Z component and we don't need to click the project we can take the sketch directly our guive curve is the sketch and our draft angle is the Z and we can go ahead and delete the projection good now this uh this uh wall here had kind of like a break in it it was wasn't all one surface so we need to create the other one we could do it in the sketch like the sketch like the sketch like this and uh just create a a different line here and line here and line here and then do then do then do this but we will not do that this and this and then we will sweep then we will sweep

_Signals: toolpath:1 · howto:6_

### Tip 12 — confidence 0.58

> then we will sweep this again with the D direction is it good now we have our two sweeps what we need to do is create a 

then we will sweep this again with the D direction is it good now we have our two sweeps what we need to do is create a radius between them you can do that very easily in uh in surfaces with this one shape fillet command so if you click this little arrow you see you have the edge fillet which works kind of like the one uh in the body part body design where you click edges and you also have shape fillet where you can fillet where you can fillet where you can select your two surfaces that you want to fill it you select the first support you select the second you select the second you select the

_Signals: camOps:5 · howto:9_

### Tip 13 — confidence 0.44

> second support and you need to look straight on like this and you can see that you want your fillet to be here that mean

second support and you need to look straight on like this and you can see that you want your fillet to be here that means this one should be should have this direction which is good because it goes like this but this one here uh this is not the good direction you want this to be in this inside as this inside as this inside as well so you click this to have the good uh the good directions for a and you can see it creates a radius here this is 1 mm but so we need it to be a lot larger than that let's say 20 and click wall now what's left to do in our in our final geometrical set we need to join

_Signals: camOps:1 · params:1 · howto:3_

### Tip 14 — confidence 0.42

> we need to join we need to join these join these these join these these join these together so the way we do that is by 

we need to join we need to join these join these these join these these join these together so the way we do that is by going here into this Set uh and using the shape fill it again we take this left wall we take the top surface we make sure the the the directions are in like directions are in like directions are in like this this time we put 6 mm radius and hit okay hit okay hit okay good this looks very good this looks very good this looks very well now we take this fillet that we just did make sure this is in make sure this direction is in otherwise this is what happens when one of the

_Signals: camOps:1 · params:1 · howto:1_

### Tip 15 — confidence 0.43

> this uh radius here or it has something to do with this fillet pointing into the other one here which it doesn't really 

this uh radius here or it has something to do with this fillet pointing into the other one here which it doesn't really like so first thing you you you do is try to do the same thing but change the extremities here to minimum and you see that doesn't work either for some reason either for some reason either for some reason right if that fails we need to to change this geometry a little bit here so first thing first we need to do is change this to this to zero because we said this at the beginning of the video that this is not really that important and we also can do this change this something

_Signals: camOps:1 · howto:5_

### Tip 16 — confidence 0.4

> like this something like that and we need a small radius here so this way when it tries to to to create a fillet here it

like this something like that and we need a small radius here so this way when it tries to to to create a fillet here it's not pointing towards the other towards the other towards the other fil around here so it does have its Quirk quirks Kaa uh and you probably need to learn all these uh essentially debugging methods there you debugging methods there you debugging methods there you go so I don't know if you can tell by now but this looks exactly like you want it to look like this is actually perfect this is the first step in which you create like the the base surface from which you will cut

_Signals: camOps:1 · howto:2_

### Tip 17 — confidence 0.43

> your part so after you have this in the feature tree or whever you want you create another geometrical create another ge

your part so after you have this in the feature tree or whever you want you create another geometrical create another geometrical create another geometrical set and you call this trim this set will contain the trim for your for your for your part part part [Music] um better yet we can actually have the holes holes for this hole there's a very easy way to do it you can just create a point just create a point just create a point usually this point is in the middle you want to keep it here in the middle just move it a little bit further up in up in up in X somewhere up to here let's say maybe a

_Signals: howto:8_

### Tip 18 — confidence 0.41

> little closer to the surface it doesn't have to be perfect just close to the surface after this you can create a line yo

little closer to the surface it doesn't have to be perfect just close to the surface after this you can create a line you can choose this surface here that you have already created which is basically the final surface but untrimmed and without holes create a line you the line definition is normal to surface you create the surface you select the surface you select the point and this needs to be very long then you create an element called intersect intersect creates uh wire frame at the intersection of two elements in this case between a line and a and a surface it's going to be a point but

_Signals: howto:6_

### Tip 19 — confidence 0.42

> this can be a curve as well so you have this and on this uh line you can actually create a sweep this is where we extrud

this can be a curve as well so you have this and on this uh line you can actually create a sweep this is where we extrude the circle uh uh along a line but using sweep you don't need to actually create a circle you can go here Circle Circle Circle Center where is Center where is Center where is it uh you can select Center and radius you select this as the center and let's say 4 mm as the radius and creates a cylinder basically this will'll use to cut our part later on now going back to the trim in the trim you can basically split the trim as you did uh the other features if you want if not

_Signals: params:1 · howto:4_

### Tip 20 — confidence 0.48

> it's perfect perfectly fine to do it however you you feel like it it all depends on on how much time you you want to spe

it's perfect perfectly fine to do it however you you feel like it it all depends on on how much time you you want to spend on want to spend on want to spend on this sorry I clicked something wrong uh we we will create a new geometrical set call it it it the trim sketch and then we need to do something like we constrain this to be like 30 that's too much too much too much 15 20 mm this point needs to be like 5 mm away this this is 140 that's not right 145 no 100 50 looks about the correct angle this can be as low as 5 mm or even less and we have one side of the trim now we create another set

_Signals: params:3 · howto:4_

### Tip 21 — confidence 0.45

> to be 10 mm this is going to be 10 be 10 be 10 mm and then this is going to be 10 mm as well see this is going to look a

to be 10 mm this is going to be 10 be 10 be 10 mm and then this is going to be 10 mm as well see this is going to look a little different what uh we have initially draw this is going to be five this is going to be five as well this it doesn't like the fact that this is not a construction no looks like I didn't make it a construction construction construction you can go here to user edges and click this uh point that you have projected and make this a construction Point like that good now you have this feature here and you can combine these two shapes uh I can show you a different way to

_Signals: params:3 · howto:1_

### Tip 22 — confidence 0.42

> combine them now it is with the trim command you select one of the the shapes you select the other one you can select mo

combine them now it is with the trim command you select one of the the shapes you select the other one you can select more of these and it will just trim them all and you can already see that it basically cut through these uh through this middle part here and it made a combination of the shape and you hit hit hit okay and now because you have a sharp corner here sharp edge you can use the edge fileld command which works exactly as the one in body you select the edges select the value and hit okay okay okay good good good now you insert another geometrical set and here you need to define the

_Signals: howto:7_

### Tip 23 — confidence 0.43

> other the other areas by the way just to make it uh a little bit easier you can change the color of this uh of this set 

other the other areas by the way just to make it uh a little bit easier you can change the color of this uh of this set the surfaces in the set so you can see a little bit better so now you can actually use the surfaces that you already have and create an offset from offset from offset from them so you can select this uh this purple surface here and create an offset the way you do that is with the offset command you just hit on the surface click on the surface select the direction and select the value and you can see that we have very very large issues because it doesn't like to be offset it

_Signals: howto:9_

### Tip 24 — confidence 0.48

> this much which is kind of a problem to be honest I did not expect to to experience uh this many problems on the first p

this much which is kind of a problem to be honest I did not expect to to experience uh this many problems on the first part what you need to do in order to fix this is to basically cut away some of these uh some of these excess surfes that you don't really need how do we do that well we select this edge here and we make a parallel curve we have this option where you click this select the curve you want to parallel and the support which is this surface and you go with this all the way up to here maybe a little maybe a little more if you can get away with it okay then you use the split command

_Signals: toolpath:2 · howto:3_

### Tip 25 — confidence 0.46

> where you select the base surface you want to split and select the parallel line and now you have a you have a split of 

where you select the base surface you want to split and select the parallel line and now you have a you have a split of this surface and of this surface and of this surface and then you should be able to easily offset this 35 mm just the way you wanted it one sorry for the other side you go to the sweep and you offset the again and we see that we have actually for forgot to about the the bottom trim here to make uh to make this Extrusion good after this you go ahead and make another geometrical set here which is the trim which is the trim which is the trim result and you result and you result

_Signals: toolpath:1 · params:1 · howto:3_

### Tip 26 — confidence 0.43

> and you basically combine all these uh surfaces like this with the this with the with the fillet the shape filet command

and you basically combine all these uh surfaces like this with the this with the with the fillet the shape filet command that we already learned about now we go ahead and go into our final uh final assembly geometrical set and then we split this with our trim this with our trim result result result and we also need to select this this this sweep you can see this uh trims it the wrong way you can just select this the sweep and click on other side hit side hit side hit okay and this is your final part what you need to do now is go to part design and select this option Sur [Music] [Music]

_Signals: camOps:1 · howto:5_

### Tip 27 — confidence 0.42

> feature tree you insert another geometrical insert another geometrical insert another geometrical set you name it set yo

feature tree you insert another geometrical insert another geometrical insert another geometrical set you name it set you name it set you name it uh per B you can hide the part body so it doesn't cause any any doesn't cause any any doesn't cause any any confusions here the burbick will be basically based on this surface and on this one but you don't want to use the final surface as as an input you always want to want to want to use the latest input from each feature which is this which is this which is this one and this one you already have this line here but again you don't want to use it

_Signals: safety:1 · howto:3_

### Tip 28 — confidence 0.43

> unnecessary I'll hide the unnecessary Parts on this one you then create two new points one is going to be on this uh lin

unnecessary I'll hide the unnecessary Parts on this one you then create two new points one is going to be on this uh line and it's going to use this point as a reference let's say 8 millimet sounds about fair and on this one you do the same thing maybe 5 mm for this one then you create a new line through these two these two these two points which will be the the direction of our of our newly rib newly created rib you take another point a plane through this uh tangent into this curve it doesn't matter where you put it and then you create a surfaces create a surfaces create a circle 6 circle 6

_Signals: params:1 · howto:5_

### Tip 29 — confidence 0.43

> circle 6 mm or mm or mm or five you constrain the circle to the to one of the points you create two lines like this you 

circle 6 mm or mm or mm or five you constrain the circle to the to one of the points you create two lines like this you make sure they're tangent to the circle you put a maybe 60° angle on them you can change that later make sure you have an axis here to allow for Symmetry and then go to the quick trim tool and delete this tool and delete this tool and delete this you can extend this a little bit like that and there you that and there you go this is go this is go this is beautiful maybe it's a little too much we need to to move this uh make it a bit a bit a bit smaller smaller smaller now you

_Signals: params:1 · howto:5_

### Tip 30 — confidence 0.4

> need to now need to find your untrimmed surface which is this one what you need to do is insert this uh this uh bird Bak

need to now need to find your untrimmed surface which is this one what you need to do is insert this uh this uh bird Bak um before you trim it you need to insert it in the tree somewhere here so the way you do that is by using by toggling this one which is insert mode and this will basically create another uh another operation in between this one and the next one so you insert one so you insert one so you insert it you click on shape fill it this one support one needs to be the first uh the unre surface and the support to is the new new rib you can put 5 mm as a radius and you see that you

_Signals: params:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-1fd9IMhhCfU-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/1fd9IMhhCfU.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].