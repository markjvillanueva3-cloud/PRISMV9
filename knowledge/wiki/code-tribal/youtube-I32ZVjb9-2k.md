---
title: "Swiss CNC Programming Made Easy | Citizen L20 Demo with ESPRIT EDGE"
domain: lathe
source: youtube
videoId: I32ZVjb9-2k
url: https://www.youtube.com/watch?v=I32ZVjb9-2k
channel: "ESPRITCAM"
duration_s: 946
tribal_entries: 6
chunks_scanned: 30
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Swiss CNC Programming Made Easy | Citizen L20 Demo with ESPRIT EDGE

**Channel:** [ESPRITCAM](https://www.youtube.com/watch?v=I32ZVjb9-2k)
**Duration:** 15m 46s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 30 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.43

> I'll start by importing the solid model, which loads the geometry into our workspace

I'll start by importing the solid model, which loads the geometry into our workspace. From here, we'll go into part setup and define the part by selecting the model and pressing okay. Next, we'll add the stock. Since we're working from bar, I'll set it to 20 mm diameter and 200 mm length. I'm also adding a 1 millm facing offset to give us some clearance at the front of the part. Once that's defined, we hit okay. And now the part and stock are ready to go. go. go. With the part and stock defined, we're ready to move into machine setup.

_Signals: params:2 · howto:2_

### Tip 2 — confidence 0.41

> This streamlined setup process not only saves time, but it also reduces the chances of error, especially in high mix Swi

This streamlined setup process not only saves time, but it also reduces the chances of error, especially in high mix Swiss environments. It's fast, reliable, and sets itself up for efficient, accurate programming moving efficient, accurate programming moving efficient, accurate programming moving forward. Now that we've imported the CAD model and defined our machine setup, we're moving on to the next step of the CAD feature operation workflow. This is where we define the machining features that drive the tool path. We'll start by creating turning features.

_Signals: toolpath:1 · howto:1_

### Tip 3 — confidence 0.4

> I'll select the geometry, define the axis, and set a few parameters to capture the profile we want to machine

I'll select the geometry, define the axis, and set a few parameters to capture the profile we want to machine. Next, I'll jump into the feature manager tab where you'll see that a spree edge has automatically created all the turning features based on the part geometry. That means we're not manually sketching profiles. It's already done for us, which saves time and reduces setup errors. Next, we're going to create hole features. I'll go to the features tab, select hole, and choose the faces I want a spree to recognize holes from.

_Signals: howto:5_

### Tip 4 — confidence 0.43

> Then I'll select the slot face and create wall feature

Then I'll select the slot face and create wall feature. It's a quick process and it gives us clean and well- definfined geometry to work with. To finish up, I'll mirror the features to the opposite side of the part by rotating them 180 degrees around the center line. This keeps the setup symmetrical and saves time when programming both ends. With our turning, hole, and milling features defined, we built a solid foundation for programming. This step brings consistency to the workflow, reduces manual effort, and sets us up for automation in the next phase.

_Signals: camOps:1 · params:1 · howto:2_

### Tip 5 — confidence 0.46

> These patterns enable simultaneous and superimposed operations, allowing us to program more advanced parallel machining 

These patterns enable simultaneous and superimposed operations, allowing us to program more advanced parallel machining strategies with minimal effort. I'll apply our first pattern by modifying the sync move just before the transfer. This tells the software to coordinate the pickup and cut off operations to run in parallel, reducing cycle time while keeping everything in sync. keeping everything in sync. keeping everything in sync. Let's take a look at the simulation. Starting from the park operation, the cutoff tool moves into position and parks, ready for use.

_Signals: toolpath:2 · howto:1_

### Tip 6 — confidence 0.44

> First, I'll define a milling profile to capture the outer contour

First, I'll define a milling profile to capture the outer contour. Then, I'll run hole recognition to identify the holes on the back face. These features will serve as a foundation for the operations we'll apply next using the same process-driven approach we used on the main spindle. With the features on the backside now defined, we'll continue just as we did on the main spindle by applying process files to drive the machining operations. As soon as we apply the first process after the transfer, you'll notice that the link moves in channel 2 turn red.

_Signals: toolpath:1 · camOps:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-I32ZVjb9-2k-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/I32ZVjb9-2k.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].