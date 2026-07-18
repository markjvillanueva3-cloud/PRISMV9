---
title: "SolidCAM iMachining Getting Started - Walkthrough: Create and define the CAM-Part"
domain: cam
source: youtube
videoId: bJ7VDisRDLM
url: https://www.youtube.com/watch?v=bJ7VDisRDLM
channel: "SolidCAM & iMachining"
duration_s: 500
tribal_entries: 6
chunks_scanned: 13
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SolidCAM iMachining Getting Started - Walkthrough: Create and define the CAM-Part

**Channel:** [SolidCAM & iMachining](https://www.youtube.com/watch?v=bJ7VDisRDLM)
**Duration:** 8m 20s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 13 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.41

> accept the default cam settings and close the dialog box now here we have our CAD model ready to go into solid cam for p

accept the default cam settings and close the dialog box now here we have our CAD model ready to go into solid cam for programming for our first step of course we have to create and define the cam part to do that again go to the SolidWorks main menu this time click tools solid cam new milling when the new milling part dialog box opens simply click OK to use the default settings to create the cam part as we know it will be saved in the model file directory next the milling part data dialog box is displayed in the SolidWorks property manager this is where we'll want to define the cam part not

_Signals: howto:6_

### Tip 2 — confidence 0.4

> just for the general use of solid cam but also specifically for our machining first and foremost we can see that our def

just for the general use of solid cam but also specifically for our machining first and foremost we can see that our default controller selection is already defined so that we can post g-code for a 3-axis Hawes SS moving down the list next click the define button in the coordinate system section to define the origin for all the AI machining operations of this cam part using the default select face option click on the top face top face top face of the target model to position the coordinate system in the SolidWorks graphics area with the z axis normal to that face then in the pic section

_Signals: howto:5_

### Tip 3 — confidence 0.43

> enable the pic origin checkbox and pick the back left corner of the stock model to place the coordinate system there cli

enable the pic origin checkbox and pick the back left corner of the stock model to place the coordinate system there click OK to accept the selection and close the quartz a style lock box when the court says data window appears click OK to accept the default machining levels to confirm the coordinate system definition mac 1 position 1 click OK in the court system Anna jure moving to the next section we have to define the stock and target models to start the stock model definition click the stock button when the model dialog box appears click the drop down in the defined by section and choose

_Signals: howto:8_

### Tip 4 — confidence 0.42

> 3d model from the list since there is a solid body representing our stock material we can use this option now like I've 

3d model from the list since there is a solid body representing our stock material we can use this option now like I've done here I would recommend modeling your stock ahead of time in SolidWorks before you bring your cad model into SolidCAM for programming we do however have several options for defining your stock material without a 3d model being present so if you don't model your stock ahead of time don't worry you can define it by another method now just pick on the stock model in the SolidWorks graphics area Solid 1 appears in the type section confirming that our stock model is defined

_Signals: camOps:2 · howto:1_

### Tip 5 — confidence 0.4

> so click OK to accept the stock model definition next click the target button to define the target model when the model 

so click OK to accept the stock model definition next click the target button to define the target model when the model dialog box appears again simply pick on the target model this time again Solid 1 appears in the type section the target model is now defined and we can click OK to accept so that completes the camp our definition for use in Solid cam but if we want to use the AI machining technology we have to define the Machine and work material parameters we can do that right here in the eye machining data section of the milling part data dialog box if for whatever reason you don't make

_Signals: howto:5_

### Tip 6 — confidence 0.4

> at this point the cam part is fully defined and we can click OK to confirm the cam part definition so that concludes ste

at this point the cam part is fully defined and we can click OK to confirm the cam part definition so that concludes step 1 where we've prepared our cam part for use with the eye machining technology in solid cam in the next step I'll show you how to add that very first time machining operation and define the rough machining of the outside contour a finishing operation will also be quickly defined

_Signals: toolpath:1 · camOps:1 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-bJ7VDisRDLM-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/bJ7VDisRDLM.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].