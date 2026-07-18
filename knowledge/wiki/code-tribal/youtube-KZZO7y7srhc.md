---
title: "Sodick Wire Programing with ESPRIT and Model Associativity"
domain: wedm
source: youtube
videoId: KZZO7y7srhc
url: https://www.youtube.com/watch?v=KZZO7y7srhc
channel: "MidwestCAM"
duration_s: 504
tribal_entries: 6
chunks_scanned: 11
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Sodick Wire Programing with ESPRIT and Model Associativity

**Channel:** [MidwestCAM](https://www.youtube.com/watch?v=KZZO7y7srhc)
**Duration:** 8m 24s
**Domain:** `wedm` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 11 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `wedm`.

### Tip 1 — confidence 0.42

> we can set the different types of cutting conditions that we need for this specific part on this machine in this case I'

we can set the different types of cutting conditions that we need for this specific part on this machine in this case I'm setting up the uh the cut for the um taper or the main cut so we can set here directly accessing the database from sodic and let's you know put all of our information here we can actually go in and specifically modify our and create our own specific technology as well so we'll select the settings for the primary cut and for the land um we can walk through and set up our same conditions for the land we can change wire if we wanted wire if we wanted wire if we wanted to um

_Signals: howto:7_

### Tip 2 — confidence 0.41

> let's to um let's to um let's select well this looks pretty good let's pick these settings and we can suppress the rough

let's to um let's to um let's select well this looks pretty good let's pick these settings and we can suppress the rough on the already had that set for for for us on the land because we were roughing with the taper um we have other options we can set now here in this area right here we're actually here we're actually here we're actually extending the beginning and the end of the feature because of the uh the start point being calculated from the land or from the feature recognition we want to actually extend that out a little bit uh some more advanced settings uh Corner rounding internal

_Signals: camOps:1 · howto:3_

### Tip 3 — confidence 0.47

> Corner rounding make sure that we're reading taper uh information from the information from the information from the fea

Corner rounding make sure that we're reading taper uh information from the information from the information from the feature look ahead um those types of things most of the spe machine specific stuff is here the cut data and we select data and we select data and we select okay and we have our tool path now one thing I did forget to do is I forget to tell it that I am using a cut off strategy to take advantage of our cut off and we'll just simply easily make that change you can see we now have our cut off strategy in here so we have our rough to our glue our cut off then our uh all of our

_Signals: toolpath:1 · camOps:1 · howto:4_

### Tip 4 — confidence 0.4

> simulation and we can see our wire positioning and readout or our angle as we're running through you it's going to stop 

simulation and we can see our wire positioning and readout or our angle as we're running through you it's going to stop before the cut off and single step it's going to run run through the cut off stop drop the off stop drop the slug reverse so now we're tapering back for the secondary cut on the taper you see the Cuts now with our part completely programmed let's say that we've been issued a design change and we want to to automatically update that here in the s file so let's go back to the interor file and let's actually make that design change let's edit the sketch and let's just change um

_Signals: howto:5_

### Tip 5 — confidence 0.43

> make a couple of slight changes here let's change this let's say we change this to we change this to we change this to 1

make a couple of slight changes here let's change this let's say we change this to we change this to we change this to 15 and move this uh Arc a little bit uh to the to the to the left so nothing too major but obviously a change in the part so let's save that let's go back to apree and in apree we'll check our reference file we can see we have the little icon here that tells us that we need to update our file so we select so we select so we select update and a spree automatically Mage automatically recalculates the feature automatically recalculates the feature automatically recalculates the

_Signals: howto:8_

### Tip 6 — confidence 0.47

> feature and the tool path on the part we're done let's run a little simulation here again you see the changes uh taking 

feature and the tool path on the part we're done let's run a little simulation here again you see the changes uh taking place the stop the cut off and all the additional roughs and skims on the land and the taper at this point all we need to do is create our do is create our do is create our G-Code so we'll say create G-Code and we will get a complete file with all the power and offset settings and the quality settings for the sodic ready to load on the machine and run the part so you can see here's our initial rough and skim there's our cut off area through cut off area through cut off area

_Signals: toolpath:1 · camOps:1 · howto:4_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-KZZO7y7srhc-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `wedm`
- Source artifact: `state/shared/youtube-extraction/KZZO7y7srhc.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].