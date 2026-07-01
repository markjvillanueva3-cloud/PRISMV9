---
title: "CAD function template — onshape / sketch-2d"
software: onshape
function: sketch-2d
source: video-tribal-aggregation
tip_count: 6
videos_covered: 4
generated_at: 2026-05-27
---

# CAD function template — onshape / sketch-2d

**Software:** `onshape` · **Function category:** `sketch-2d`
**Source:** aggregated from 6 video tribal tips across 4 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <sketch-2d> in <onshape>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 6 by confidence)

### Tip 1 (confidence 0.44)

> I think my second sketch is going to be well really it won't be a sketch it'll just be a feature I'll just pick this sha

I think my second sketch is going to be well really it won't be a sketch it'll just be a feature I'll just pick this sharp edge that I create in the first feature and create a flange sticking out here at 4 in then for my third feature what I'll do is I will cut away this kind of triangular shape and then I'll finish off the model by creating this final flange here this little smaller rectangular flange that's sticking out adding some fillets and then going through and adding the cuts so as always it's a great idea to kind of come up with a game plan before you get started with one of these

_Signals: camOps:1 · safety:1 · howto:2_

_Source: [Sheet Metal Beginner Tutorial (Angle Bracket)](https://www.youtube.com/watch?v=4rndxiRc0Xc) — channel `Onshape`_

### Tip 2 (confidence 0.43)

> hi everyone I'm Jonathan with PTC education and today I'm going to walk you through what featurescript is and how to get

hi everyone I'm Jonathan with PTC education and today I'm going to walk you through what featurescript is and how to get started with using it to create custom features featurescript is the programming featurescript is the programming language that all of onshape's part Studio features are written in and we can use it to create custom features that can help speed up any repetitive or complex tasks that you might have be that modeling and modifying a part or creating data sets and measurements to get started I'll use the part Studio that our blank document comes with before we dive into Radio Future script I'll first go through importing a custom feature that's already been made there's plenty of examples in the features script documentation that you can find at cad.onship.com FS stock at cad.onship.com FS stock at cad.onship.com FS stock we'll be importing the light and feature and using it to do some weight relief going into the document that has that feature script written in the top left we can see a button that lets us add the custom feature into our toolbar from there we can implement it in any part Studio that we open up directly from our toolbar toolbar toolbar to demonstrate this I'll open up a new document here document here document here and I'll quickly make a cube in the top right you can see that the light and custom feature is available for us to use even with the document containing that custom feature closed now that we've seen how to add a pre-made custom feature let's get started with writing a custom feature of Our Own Our Own Our Own but before we get started with opening a feature Studio One thing to take note of is that you can view the features script that is creating all of the features in a part Studio at any time simply right click on the tab at the bottom The View code option will appear clicking on it will cause a features script pane to open and you can scroll through all of the features script to see how all of the default on-shape features are being used in your part Studio let's start by opening up a feature Studio to do this we go through the same process as adding a part Studio or assembly but this time we click on the feature Studio option in the bottom left left left taking a look at this screen a lot of our options are neatly laid out and self-explanatory along the top we have all the basic options that we might use to create a custom feature such as solids over here on the right in the top left we can see a button labeled new feature labeled new feature labeled new feature and when we click on that the document automatically generates a code block that we can then use to get started with writing our custom feature let's take a closer look at it closer look at it closer look at it the first block at the top is the precondition block here we Define just that all of the information the user might need to input or any other preconditions that are custom featured needs in order to properly execute a simple example would be a user selected option giving them the choice of how large or small to make a dimension to do this we would create an annotation here and populate the fields appropriately all of this syntax and structure can be found in the documentation at cad.onsshape.com fsdoc documentation at cad.onsshape.com fsdoc documentation at cad.onsshape.com fsdoc as mentioned before as mentioned before as mentioned before I'll utilize the remember previous value and set that annotation equal to definition.link so that it can be referenced as such from anywhere in the future Studio later on as a variable now we go into our part studio and import our feature which we do from the top right if we're within the same document document document and we can see that an option field comes up asking for user input on how large this Dimension should be now that we've covered preconditions and their uses let's take a look at the main functionality of our feature the post condition in the lower block we'll implement the functionality and behavior of our custom feature this is where we want to write out all of the operations such as making sketches extruding and any other combination of features and operations in order for our custom feature to fulfill its task in this example I'll show you how to use the extrude Boolean and query functions to create a relatively simple shape that is driven through user input it won't be in immediately useful shape but it highlights some of the most common features that you might use in order to get more creative in making your own custom features custom features custom features we'll start out by making a sketch and we do this by using sketch the fields inside that we should take note of are the name of the sketch feature which we'll use to reference this sketch later on this sketch later on this sketch later on after that we create a rectangle on the sketch by using SK rectangle and we see that we can put in some parameters for the locations of the two points that will Define a rectangle I will be using the length parameter that we created earlier in the precondition to define the dimensions of the cube we're creating so we'll go ahead and place that into the field for the second point and after that we call SK salt what this does is it binds the sketch entities to the sketch that we created earlier on now that we've created the square we use extrude to do exactly that I'm going to define the end depth again as the same Dimension dot length that we created earlier on in the precondition and if we wanted this to be any other end depth we could Define a another dimension in precondition dimension in precondition dimension in precondition now if we commit and go back to the port Studio we can see that the Cube's there we can change the length parameter to dynamically change the dimensions of the cube from within the part Studio using our custom feature I'm going to return to the precondition and add a new field and this time we'll call it whole radius again it will be a length unit and I'll assign the user defined value to definition.radius definition.radius definition.radius before we move on to the next step let's perform some cleanup on shape automatically deletes sketches for us once we use them in an extrude for example while we're in a part Studio however we can still see the sketch that was used for the initial extrude feature we'll have to perform this cleanup step ourselves by calling op delete on the sketch sketch sketch we'll create another sketch on the front plane again using sketch uh this time however instead of making a rectangle we'll use the SK Circle tool to create a circle that represents the profile on the hole that we can cut into our Cube I'll use the definition.radius valued that we defined earlier in the precondition precondition precondition and again we call SK solve to bind the entities to the sketch entities to the sketch entities to the sketch after that we again extrude the profile in the same direction as the square earlier and to the same depth which was dimension.length dimension.length dimension.length now we have a solid cylinder passing through a cube but really all that results in is still a cube we want to cut a cylinder away from the cube and to do that we'll use a Boolean operation to do that we call up Boolean and we Define the cutting tool as the cylinder that we just created that we just created that we just created notice that we have to use queries here to Define which feature is the cutting tool and which is the body that we want to cut away from the Boolean this is a pretty simple query but it's good to take a moment to look at it and understand it understand it understand it simply put the query we use here Returns the body that was created using a specific feature or operation such as the earlier extrude operation and that just about covers how to get started with creating a custom feature in onshape using featurescript hopefully onshape using featurescript hopefully onshape using featurescript hopefully this short tutorial was helpful to you all and will help Inspire the community to continue to create amazing features for other users to enjoy if you've got an idea for an on-shape how-to video let us know in the comment section down below and if you found this video helpful don't forget to like And subscribe to ensure that you're notified when we post more how-to videos in the future have a great rest of your day

_Signals: howto:23_

_Source: [How To Use FeatureScript | Onshape for Education](https://www.youtube.com/watch?v=oEOJus975Tg) — channel `Onshape`_

### Tip 3 (confidence 0.41)

> part gets larger we want this upper section or this upper part to also grow at the same proportion so to do that in on s

part gets larger we want this upper section or this upper part to also grow at the same proportion so to do that in on shape it's really simple all we need to do is just begin another sketch so I'll select this face here I'll choose to begin a new sketch and then I'm going to get into an offset entities command now I can take this edge here right Mouse button select and select tangent connected edges and then I can choose to offset this to a distance of let's left Mouse button in the background the background the background 0.5 mm so now we see that we've created an offset here for just a

_Signals: params:1 · howto:3_

_Source: [Designing Parts Together (In-Context Features)](https://www.youtube.com/watch?v=kKsVUTRPM3k) — channel `Onshape`_

### Tip 4 (confidence 0.41)

> with each sketch action so it is necessary to assign it to a constant change the ID to sketch ID and enter mid plane for

with each sketch action so it is necessary to assign it to a constant change the ID to sketch ID and enter mid plane for the sketch plane parameter this sketch only requires a circle use the SK Circle function to create a circle SK Circle takes in two arguments for the center point and radius leave the default value for the center parameter to place it at the sketch's origin enter Notch radius for the radius parameter finish the sketch with the SK function test the feature in a part Studio the sketch is positioned perpendicular to the edge at its midpoint to create a cut you need to combine

_Signals: camOps:1 · howto:3_

_Source: [Building a Complete Custom Feature (FeatureScript)](https://www.youtube.com/watch?v=yi06ZVDoevs) — channel `Onshape`_

### Tip 5 (confidence 0.4)

> taking one of these challenges is just start out by looking at the 2D print and kind of coming up with a game plan I thi

taking one of these challenges is just start out by looking at the 2D print and kind of coming up with a game plan I think in the case of this model I'm going to use the onshape functionality that allows me to sketch two lines in my first sketch and then immediately extrude them as sheet metal with the sheet metal bend features and I only really need to create half of this model because the model has symmetry we can see here we've got center line symmetry so I only need to create half the model so my very first sketch will be these two lines and I'll extrude them out along this direction then

_Signals: camOps:1 · howto:2_

_Source: [Sheet Metal Beginner Tutorial (Angle Bracket)](https://www.youtube.com/watch?v=4rndxiRc0Xc) — channel `Onshape`_

### Tip 6 (confidence 0.4)

> onto the plane if the query contains a mate connector it places the origin on the make connector new sketch on plane tak

onto the plane if the query contains a mate connector it places the origin on the make connector new sketch on plane takes in a plane parameter this means you can define an arbitrary plane in feature script that is not yet a part of the context to create the sketch it also gives you more control over the origin which is important for defining sketch entities create a constant named sketch ID for the sketch's ID because it is used in more than one place create a constant named sketch one and set it equal to the result of a new sketch on plane function we need to reference the sketch object

_Signals: howto:5_

_Source: [Building a Complete Custom Feature (FeatureScript)](https://www.youtube.com/watch?v=yi06ZVDoevs) — channel `Onshape`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `sketch-2d` operations in `onshape`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation