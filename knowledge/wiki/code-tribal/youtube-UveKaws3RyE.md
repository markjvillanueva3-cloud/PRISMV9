---
title: "SOLIDWORKS: Electrical Routing Basics"
domain: cad
source: youtube
videoId: UveKaws3RyE
url: https://www.youtube.com/watch?v=UveKaws3RyE
channel: "Hawk Ridge Systems"
duration_s: 531
tribal_entries: 4
chunks_scanned: 10
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SOLIDWORKS: Electrical Routing Basics

**Channel:** [Hawk Ridge Systems](https://www.youtube.com/watch?v=UveKaws3RyE)
**Duration:** 8m 51s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 10 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> use the out-of-the-box connectors and cables i can go to the electrical tab and select start by drag drop that opens up 

use the out-of-the-box connectors and cables i can go to the electrical tab and select start by drag drop that opens up the design library in the task pane and navigates to the electrical subfolder you can also browse directly to this folder in the design library and drag the connector into the assembly without using that command using that command using that command i see the three pin female connector that i'd like to use and i'll drop it on the fan the fan the fan see how it snaps to the connector on the fan there's a mate reference in both of these parts that causes that behavior i'll

_Signals: howto:5_

### Tip 2 — confidence 0.42

> talk about that more later the route properties opens up and here i can change the type of route and od i'll leave this 

talk about that more later the route properties opens up and here i can change the type of route and od i'll leave this as default next the auto route dialog opens up this tool is really helpful in electrical routing but we're only going to use the auto route option in this video i'll drag a second connector and drop it onto the pcb there are stubs on the ends of the connector that will serve as places to start and the routes the routes the routes i'll click on the end point of the fan connector there's a clip in the assembly that has an axis that i can route through and then i'll finish by

_Signals: camOps:1 · howto:4_

### Tip 3 — confidence 0.41

> selecting the stub on the pcb connector there's no electrical data in here until i edit the wires so i'll do that and se

selecting the stub on the pcb connector there's no electrical data in here until i edit the wires so i'll do that and select a blue wire i can select multiple wires as well i'll assign the data to the spline and exit out of the route now we can see all the components of the route that are saved in the subassembly i'll open it in its own window to create a drawing of it i need to flatten the route and once i do i can make a drawing of it by clicking on these various options this is a nice 2d representation of the harness harness harness going back to the parent assembly i can see a couple of

_Signals: camOps:1 · howto:3_

### Tip 4 — confidence 0.4

> connectors that i want to run a cable between however i need to create a connector and a custom cable library for it i'l

connectors that i want to run a cable between however i need to create a connector and a custom cable library for it i'll open up the solidworks part i want to use to use to use i need to use the routing library manager to convert this part to something routing recognizes i'll click on the routing component wizard wizard wizard first i'll select the route type electrical in this case next i'll select connectors as the component type hitting next takes me to the next step now it's time to define the c points which are the stubs that we saw in the three pin female connector i need at least one

_Signals: howto:5_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-UveKaws3RyE-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/UveKaws3RyE.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].