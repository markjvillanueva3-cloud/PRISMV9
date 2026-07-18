---
title: "Unit 6: Routing - Lesson 1: Routing Wires"
domain: cad
source: youtube
videoId: r-Yc3Ib5JH4
url: https://www.youtube.com/watch?v=r-Yc3Ib5JH4
channel: "SOLIDWORKS"
duration_s: 299
tribal_entries: 3
chunks_scanned: 8
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Unit 6: Routing - Lesson 1: Routing Wires

**Channel:** [SOLIDWORKS](https://www.youtube.com/watch?v=r-Yc3Ib5JH4)
**Duration:** 4m 59s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 8 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.46

> Click on options, routing, and make sure the boxes automatically route on drop of flanges connectors and automatically f

Click on options, routing, and make sure the boxes automatically route on drop of flanges connectors and automatically flanges connectors and automatically flanges connectors and automatically route on drop of clips are both checked. Then click okay. Start by placing some clips. Go to the design library, expand routing, and in the electric folder, locate the wire tie clip. Click and drag it onto a side of the mounting plate. A smart mate will automatically make it coincident to the plate. Select 8 mm for the configuration and click okay to accept the mate. Place three more clips as follows.

_Signals: params:1 · howto:8_

### Tip 2 — confidence 0.43

> Now place the second connector and rotate the assembly to place two more on the controller

Now place the second connector and rotate the assembly to place two more on the controller. Click on the connection points of two connectors from different locations and the cable will appear but it is only connected to one terminal on each each each side. Exit the 3D sketch and go to the electrical tab to select route through clip. In the current selection box, first select the cable. Then expand each wire tie from the flying feature manager and select its axis or do that from the graphics area. Once the cable is shown through the clips, click on auto route in the electrical tab.

_Signals: camOps:1 · howto:5_

### Tip 3 — confidence 0.41

> Then click the connection point of the margin wire tie clips and the connectors with no wire to create new branches

Then click the connection point of the margin wire tie clips and the connectors with no wire to create new branches. Now go to the assembly tab and click edit component to exit the editing mode of the harness. If the wires path is not as desired, you can move the wire tie clips and click rebuild to modify it. You can now exit isolate. Save the assembly and select save internally for the virtual components. components. components. Hit rebuild to get rid of any graphics problem. The biggest benefit of routing a robot using Solid Works is that we can determine the length of wire we need to buy.

_Signals: howto:6_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-r-Yc3Ib5JH4-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/r-Yc3Ib5JH4.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].