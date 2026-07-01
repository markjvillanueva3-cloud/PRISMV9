---
title: "Free Generative Design — Beginner Fusion 360 Tutorial"
domain: cad
source: youtube
videoId: PSSt8wswNJQ
url: https://www.youtube.com/watch?v=PSSt8wswNJQ
channel: "Product Design Online"
duration_s: 1466
tribal_entries: 14
chunks_scanned: 36
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Free Generative Design — Beginner Fusion 360 Tutorial

**Channel:** [Product Design Online](https://www.youtube.com/watch?v=PSSt8wswNJQ)
**Duration:** 24m 26s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 14 of 36 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.41

> fine the more accurate the solution the more time the application will need to complete all of the calculations so be su

fine the more accurate the solution the more time the application will need to complete all of the calculations so be sure to use the fine setting with caution now I understand that this setting doesn't make much sense just by looking at it alone however once we get to the end of this tutorial where we have different solutions generated for us you'll start to see the resolution of the model for now I'll click OK the next thing that we want to double check before we move any further is our document units one important thing to note is that the document units you have set in the design

_Signals: safety:1 · howto:2_

### Tip 2 — confidence 0.4

> the top cylinder of the caster would also need to be preserved with this GE part we have six components that need to be 

the top cylinder of the caster would also need to be preserved with this GE part we have six components that need to be selected to look at all of our components we can toggle open the model components folder you'll then see our assembly which can also be toggled open to show all of the individual components we need to select the four cylinders that surround the outer post the order you select them does not matter with this feature we also need to select these two inner rings we can hide the pinned component to make it easier to select them double check in the dialog that all six are selected

_Signals: howto:5_

### Tip 3 — confidence 0.41

> and then click OK then click OK then click OK notice how the preserved parts are automatically color-coded in green that

and then click OK then click OK then click OK notice how the preserved parts are automatically color-coded in green that also correlates to the reserved geometry folder in the browser folder in the browser folder in the browser within the design space drop down to other features can be activated the second option is obstacle geometry now the obstacle geometry feature is used to define any areas or space where the generated designs cannot take up space if we look back at our caster example we would need to select the wheel component as the side walls of the caster can't obstruct the wheel or

_Signals: howto:6_

### Tip 4 — confidence 0.4

> case 1 in our browser which houses the constraints after defining the constraints we'll need to define the structural lo

case 1 in our browser which houses the constraints after defining the constraints we'll need to define the structural loads or the forces that need to be factored into our design solutions I'll select structural loads in the tool bar let's add some varying forces to the ring components or the middle of this part I'm going to hide the pinned component so it's easier to select the Rings we can then select the inside of both rings now it defaults to the angle option but let's switch this to the vectors option so we can define a load per each axis for this first structural load I'm going to type

_Signals: howto:5_

### Tip 5 — confidence 0.4

> out 8,000 in the Z input field this tells the program it needs to simulate 8,000 pounds of force being pushed up in the 

out 8,000 in the Z input field this tells the program it needs to simulate 8,000 pounds of force being pushed up in the Z direction when this first load case is run after clicking ok to confirm our structural load will see that is added to our load case 1 within the loads folder our first load case is all set up and ready to go but this is where we can really utilize the power of computing and generative design I'm going to right click on the load case 1 and I'll select clone to create a copy of it let's clone this a total of 3 times so we can set up four different load cases to be tested

_Signals: howto:5_

### Tip 6 — confidence 0.41

> thousand three hundred and fifty seven for the z-direction notice how the arrows are at an angle because we define two d

thousand three hundred and fifty seven for the z-direction notice how the arrows are at an angle because we define two different directions of where the force is being applied applied applied I'll click OK to confirm the force of load case number three load case number three load case number three I'll now activate Lowe case number four and this time I'm going to right-click on the force option and I'm going to delete it delete it delete it for the fourth load case we're going to apply a different force to each one of these inner rings I'll activate the structural loads feature and then I'll

_Signals: howto:6_

### Tip 7 — confidence 0.41

> select the inside of the Ring closest to us or ring number one in the browser I'll switch this to the vectors as well an

select the inside of the Ring closest to us or ring number one in the browser I'll switch this to the vectors as well and then I'll type out a y-value of negative 1,400 I'll then click OK as we're done defining the first ring for the second ring we'll apply the same force except in the opposite direction after reactivating the structural loads feature I'll select the inside of the second ring or the ring furthest away from us I'll then select the vectors option and I'll type out 1404 the y-direction this time making sure not to type out a minus sign I'll click OK and we're now ready to define

_Signals: howto:6_

### Tip 8 — confidence 0.41

> be generated outcomes will be generated the first option is unrestricted which means that the study will not account for

be generated outcomes will be generated the first option is unrestricted which means that the study will not account for any specific manufacturing process this option is hit or miss and depends on the part but it's interesting to see the options the computer can come up with without any restrictions so we can leave this one checked we also have the options of additive milling to access cutting and die casting for this GE part let's take a look at what some outcomes could be if we were to 3d print this using an industrial grade 3d printer that prints metal that prints metal that prints metal

_Signals: camOps:2_

### Tip 9 — confidence 0.4

> I'll unselect the milling option and we'll take a look at the additive settings for the overhang I'll bump this up to 50

I'll unselect the milling option and we'll take a look at the additive settings for the overhang I'll bump this up to 50 degrees as we'll be working with a printer that can go straight out for the minimum thickness of the part I'll switch this to 0.05 because we only have additive selected we'll end up with two different types of outcomes those with additive manufacturing in mind and those without those without those without I'll then click okay as we're done with these manufacturing settings the last thing that we want to define before we generate all the ideas would be the materials now the

_Signals: params:1 · howto:2_

### Tip 10 — confidence 0.41

> materials are yet another key consideration that the program will combine with our other rules to come up with the viabl

materials are yet another key consideration that the program will combine with our other rules to come up with the viable solutions because we're planning on using a metal 3d printer we can apply some various types of metal activate the study materials feature and you'll see it looks similar to our appearances or physical properties appearances or physical properties appearances or physical properties dialog let's go ahead and right-click on the aluminum material and delete it we want to explore some different stainless steel options so I'm going to first make sure that the library is set to

_Signals: camOps:1 · howto:3_

### Tip 11 — confidence 0.46

> these materials on this tutorials resource page so you can reference them now that we're done selecting the materials we

these materials on this tutorials resource page so you can reference them now that we're done selecting the materials we can simply close the dialog at this point we have all of our rules and guidelines set up to run the study I'm going to click Save to save a version of this in case fusion 360 decides to crash as I certainly don't want to have to set everything up again then before clicking generate we can use the pre-check tool which will let us know if we have anything to be concerned about about about as you can see I'm receiving a warning because one of the bodies is hidden this is a

_Signals: safety:2 · howto:3_

### Tip 12 — confidence 0.41

> great reminder that we need to turn the visibility of the pin component back on by selecting its eyeball icon in the bro

great reminder that we need to turn the visibility of the pin component back on by selecting its eyeball icon in the browser if I select the pre check tool again we should get a confirmation that we're all set up to generate all of the potential design solutions we need to select the generate feature this is where you would typically need to have cloud credits purchased and it would let you know how many cloud credits are required to run your study however if you're watching this before January 1st 2020 then you'll be able to run as many studies as you would like absolutely free again let me

_Signals: camOps:1 · howto:3_

### Tip 13 — confidence 0.44

> this allows you to select multiple models to compare with one another you can also further analyze the designs by lookin

this allows you to select multiple models to compare with one another you can also further analyze the designs by looking at the stress view and design space views now I want to show you how to export your design so if you do spend some time playing around with generative design you're able to 3d print your final outcome you can simply select create new mesh from outcome to generate a mesh file otherwise if you want to bring the design back into the design workspace to make edits you can select create new design from outcome this will take a few minutes to process however once you click the

_Signals: camOps:1 · howto:6_

### Tip 14 — confidence 0.41

> who supported the channel via my buy me a coffee page Felipe B George C and Jason Kegel if you have found my tutorials t

who supported the channel via my buy me a coffee page Felipe B George C and Jason Kegel if you have found my tutorials to be helpful in any way then consider supporting my content by becoming a patron or by making a one-time donation on my buy me a coffee page all of the contributions help me keep the website up and running and will help me continue to create high-quality tutorials including many more courses that will be released in 2020 as always I truly appreciate you taking the time to watch this tutorial be sure to hit that thumbs up icon if you learn something in this video click that

_Signals: safety:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-PSSt8wswNJQ-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/PSSt8wswNJQ.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].