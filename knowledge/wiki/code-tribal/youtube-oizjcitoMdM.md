---
title: "Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0"
domain: cad
source: youtube
videoId: oizjcitoMdM
url: https://www.youtube.com/watch?v=oizjcitoMdM
channel: "Cademy XYZ | Rhino 3D & Grasshopper"
duration_s: 6155
tribal_entries: 22
chunks_scanned: 135
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Rhino 3D Modeling Office Chair & Parametric Mesh Texture Grasshopper Tutorial | Webinar 5.0

**Channel:** [Cademy XYZ | Rhino 3D & Grasshopper](https://www.youtube.com/watch?v=oizjcitoMdM)
**Duration:** 102m 35s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 22 of 135 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.41

> by creating a rectangle starting from the center starting from the center starting from the center okay okay okay now th

by creating a rectangle starting from the center starting from the center starting from the center okay okay okay now the center of rhino is at zero zero zero so you can press zero and press enter all right so you're creating a rectangle from there now you can create a rectangle of any size at the moment size at the moment size at the moment and then we will drag that rectangle up all right if you don't see this green handle red handle this is called the gumball and you can turn it on by clicking this combo icon clicking this combo icon clicking this combo icon okay make sure that is turned

_Signals: camOps:1 · howto:3_

### Tip 2 — confidence 0.41

> manually and deform them as per your requirement so we just need to massage these points to these points to these points

manually and deform them as per your requirement so we just need to massage these points to these points to these points to create a create a create a better curve for capturing the back panel okay panel okay panel okay you can also turn on the tools like curvature graph that is going to help you understand how is the curvature of the curve okay how you are creating if the control points are going back and forth you will be able to see the graphs going one or the other way there is a really interesting tool in Rhino called Fair Rhino called Fair Rhino called Fair so if you use a degree 3

_Signals: camOps:1 · howto:3_

### Tip 3 — confidence 0.4

> would like to project project project these two curves these two curves these two curves and then select the surface to 

would like to project project project these two curves these two curves these two curves and then select the surface to which we would like to project would like to project would like to project so let's set this surface now the direction by default is set to z-axis okay however a lot of the commands in Rhino depend upon the viewport so if I go to the right viewport and press ok press ok press ok I think I have to go to the viewport before I select the surface so let me rerun the project command rerun the project command rerun the project command go to the right viewport select the surface

_Signals: howto:5_

### Tip 4 — confidence 0.42

> and project surface and project surface and project so you will notice that it has projected the curves from that viewpo

and project surface and project surface and project so you will notice that it has projected the curves from that viewport okay now when I just project it as it is I might end up with a complex curve than the original curve okay so in order to avoid that when you run the project command command command make sure that you set the option of lose to yes of lose to yes of lose to yes you want to create a projection of the original curve on the surface in this case it doesn't matter because these are simple planes so even if you don't make it Loose it's gonna retain its original topology but if

_Signals: toolpath:1 · howto:2_

### Tip 5 — confidence 0.42

> this was an organic curved surface then if you want to retain the topology turn the lose option on on on so the next ste

this was an organic curved surface then if you want to retain the topology turn the lose option on on on so the next step is basically getting rid of the additional curves so I'm gonna get rid of the let me get rid of these planes we're gonna skip the gonna skip the gonna skip the back one I think yeah keep the back one delete the front one delete the front one delete the front one then keep the front one delete the back one and vice versa okay right I think I've done the opposite maybe I've done the opposite no worries so you will end up with these three curves okay and then we just Loft

_Signals: camOps:1 · howto:4_

### Tip 6 — confidence 0.42

> the back surface so let me show you what has happened happened happened let me run the project command delete input yes 

the back surface so let me show you what has happened happened happened let me run the project command delete input yes delete input yes delete input yes then then then select the I think that's the back surface and then let's see what do we have here okay so as you can see we are projecting these control points of the front surface to the back surface okay we still need to project these set of points so you can select them by double clicking these points okay okay so as you can see we have now these points front view project points front view project points front view project delete input

_Signals: howto:7_

### Tip 7 — confidence 0.4

> front Parts control point and fusing the back Parts control point to the corresponding front part corresponding front pa

front Parts control point and fusing the back Parts control point to the corresponding front part corresponding front part corresponding front part so you can just select the surfaces turn on its control points and move these points from here to there so basically we are stitching we are stitching we are stitching the very top of the back surface and as they share the same topology they can connect can connect can connect in the top Edge perfectly okay so that's basically why we are creating it because we need a tangential kind of shape here now after that you can select this curve that we

_Signals: camOps:1 · howto:2_

### Tip 8 — confidence 0.44

> blender fillet blender fillet blender fillet in the intersection it's not joined sorry it's not joined sorry it says Sup

blender fillet blender fillet blender fillet in the intersection it's not joined sorry it's not joined sorry it says Supply affiliate to this hedge okay let's see if it's working how it should how it should how it should yeah there you go yeah there you go yeah there you go right so that's the final result might use a higher degree but anyways higher radius sorry higher radius sorry higher radius sorry that's the end result okay all right so the next step is we are almost there we are done with the modeling so for the support for the armrest you're just using some profiles you're blending the

_Signals: camOps:3_

### Tip 9 — confidence 0.42

> uh you're blending the uh you're blending the uh surface between profile a just make sure to chain edges to chain edges 

uh you're blending the uh you're blending the uh surface between profile a just make sure to chain edges to chain edges to chain edges and B and B and B curvature curvature curvature position or tangency okay and you can then do the same thing with the bottom section section section chain edges because you want to select all the edges and this thing okay the same concept curvature curvature or tangency tangency that's the end result now once I have made that I will just rotate it 10 degrees and the reason for that is if you look at the handle from the right viewport it's rotated 10 degrees

_Signals: params:2 · howto:1_

### Tip 10 — confidence 0.44

> changed The Fill angle from The Fill angle from The Fill angle from 5 degrees to 360 Degrees to five anyways yeah so we 

changed The Fill angle from The Fill angle from The Fill angle from 5 degrees to 360 Degrees to five anyways yeah so we can polar array the wheels and that's the end result of the wheels so so so if you unlock the 13th layer that's basically the end result of everything so you can hide the rest okay any questions till this part so now we will jump to the grasshopper workflow so let me turn on the grasshopper plugin by clicking on this icon or writing the grasshopper command so meanwhile it launches for rest of you guys if you have any question you can write it the chat uh habil asks if this

_Signals: camOps:1 · params:2_

### Tip 11 — confidence 0.41

> tutorial will be recorded yes you can watch the stream again using the same YouTube link um um is there a reason the sea

tutorial will be recorded yes you can watch the stream again using the same YouTube link um um is there a reason the seat curves were not projected we have talked about this before before before in case you need a slight radius to the corners how do you do that I guess you were talking about the solid profile for the Y support you can just add a solid fillet here okay you just have to be careful about the radius but you should be able to apply the fillet okay now of course we are not really careful about the the uh as you can see the topology so another way to resolve this issue is by

_Signals: camOps:2_

### Tip 12 — confidence 0.41

> duplicating The Edge it's a bit longer process but you can nonetheless do it nonetheless do it nonetheless do it and you

duplicating The Edge it's a bit longer process but you can nonetheless do it nonetheless do it nonetheless do it and you pipe it using the radius of the fillet that you want you split a with B okay okay let me show you and then you blend these two surfaces okay using the continuity criteria and then you can join them together okay so that is how you can add slide fill it okay okay that is another way to do it if the normal fillet doesn't work which in this case is a bit difficult because we are creating a really complex topology um okay so let's see more questions uh loving the way things are

_Signals: camOps:2_

### Tip 13 — confidence 0.41

> me see if I can show you by going back to the sit assembly mechanism I think it was there okay it's here okay it's here 

me see if I can show you by going back to the sit assembly mechanism I think it was there okay it's here okay it's here okay it's here perfect so in this case you would join them first and then you would first apply a Boolean Philip apply a Boolean Philip apply a Boolean Philip with some radius with some radius with some radius and then you would apply another fillet but that needs to be less than the fillet that you have used so it can be let's say a flat of radius one okay so like that you are able to smooth the knob part um how much do you which how do you know how do we know which

_Signals: camOps:2_

### Tip 14 — confidence 0.56

> continuity to choose in blend surface well that depends upon what kind of uh part that is if it's a visual part generall

continuity to choose in blend surface well that depends upon what kind of uh part that is if it's a visual part generally curvature continuity or G2 is preferred if it's a mechanical part you don't need to worry about continuity for aesthetic purpose but for mechanical purpose so you can go with g0 which is position or chamfer or G1 which is an arc fillet okay just a simple Arc so g0 or G1 is fine for mechanical parts for aesthetical parts G2 G3 even you can go there there there how did you make the assembly I think I think I think yeah I think we are done with the questions so let's go to

_Signals: camOps:2 · gcode:5_

### Tip 15 — confidence 0.43

> first whoever after that they are second whoever is last that's the tenth okay so I can assign a rank to these points ba

first whoever after that they are second whoever is last that's the tenth okay so I can assign a rank to these points based on their distance okay so let me show you let me import this point by double clicking on the canvas canvas canvas you can create a point node okay you can also go to params Geometry point point point okay you drag and drop this node in the canvas canvas canvas okay and in order to import this point here you just right click set one point set one point set one point and you will be able to select that point point point okay so now that point is inside the grasshopper

_Signals: howto:8_

### Tip 16 — confidence 0.41

> has a similar appearance to the grasshopper interface where you connect nodes where you connect nodes where you connect 

has a similar appearance to the grasshopper interface where you connect nodes where you connect nodes where you connect nodes to create complex material effects okay so let me first extend this part till here here here we also don't need these parts you can close it and extend it further okay so let's turn on the material and graph all right so first we need to understand how are we gonna create that wavy effect now there are two ways to do it you can either do it using a bump map or you can actually deform the geometry okay so let's see how you can do it with the bump map the bump map the

_Signals: camOps:1 · howto:3_

### Tip 17 — confidence 0.4

> it's not yeah you can see slightly here here here okay you can also exaggerate the effect by increasing and decreasing t

it's not yeah you can see slightly here here here okay you can also exaggerate the effect by increasing and decreasing the bump height so as you can see I'm exaggerating the height you can also change the shape of that note note note so I can go back to the shape and pattern and change it to lines so you can see now we have lines black and white lines and we can use these black and white lines to add that bump effect okay so now you can see we have this really interesting wavy pattern okay so if the bump is set to zero there is no wavy pattern set to one you have subtle bump effect if you set

_Signals: howto:5_

### Tip 18 — confidence 0.42

> Creo SolidWorks Alias okay so you can export your file in iges or step format which is basically a poly Surface or Surfa

Creo SolidWorks Alias okay so you can export your file in iges or step format which is basically a poly Surface or Surface in Rhino you can apply the texture and you can export it back to your native cat software okay okay okay all right so once you have applied the wavy effect as you can see you have more options here so imagine if you want to create a gradient create a gradient create a gradient of color of color of color you can right click you can right click you can right click and you can create a new material let's say a plastic material say a plastic material say a plastic material

_Signals: howto:7_

### Tip 19 — confidence 0.4

> white map so when you connect it to the geometry input you will see nothing happens and um in order for any of the geome

white map so when you connect it to the geometry input you will see nothing happens and um in order for any of the geometry nodes to work nodes to work nodes to work you have to execute the geometry node because these are going to actually deform the geometry deform the geometry deform the geometry as you can see here it takes some time and that is the end result you're actually deforming the geometry when you apply this effect or anytime you change anything here you have to always press the same node and you can deform the actual shape okay so this is going to give you also the similar

_Signals: safety:1 · howto:1_

### Tip 20 — confidence 0.42

> rounded Edge called rounded Edge called rounded Edge so I have applied a fillet to that object in keyshot object in keys

rounded Edge called rounded Edge called rounded Edge so I have applied a fillet to that object in keyshot object in keyshot object in keyshot so as you can see when I set this to zero this is what we imported but you can add subtle fillets can add subtle fillets can add subtle fillets to the corners by adding this number here okay now this is also an optical illusion it's not actually deforming the geometry it's it's kind of blending the mesh vertices and creating that illusion of fillet and that is why you get this weird artifacts on the kind of like different angle okay so you have to be

_Signals: camOps:2 · howto:1_

### Tip 21 — confidence 0.41

> careful on how you use this tool but it helps you create fillet on complex Parts complex Parts complex Parts just inside

careful on how you use this tool but it helps you create fillet on complex Parts complex Parts complex Parts just inside keyshot with a single parameter okay how do you create those lights those light panels you just add a panel sorry a plane so you go to Geometry add a plane add a plane add a plane and you convert that plane into a light source okay okay so that's how we are creating the lines you can increase and decrease the intensity as per your requirement okay okay all right so yeah let's uh stop with these examples here you can of course play around with the parameters create different

_Signals: camOps:1 · howto:3_

### Tip 22 — confidence 0.41

> the end of the day we always create nerves textures okay so nerves textures if you're kind of new to this concept is wha

the end of the day we always create nerves textures okay so nerves textures if you're kind of new to this concept is what you will be needing in order to manufacture this part eventually okay so this is the next step so we have another variation of the same texture the one that we used in the chair for example this one so this is going to be part of the advanced Workshop okay so how can you create this nice fading patterns nice fading patterns nice fading patterns now the next course that you can join is the key shot so if you are interested in creating interesting renders of your design

_Signals: safety:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-oizjcitoMdM-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/oizjcitoMdM.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].