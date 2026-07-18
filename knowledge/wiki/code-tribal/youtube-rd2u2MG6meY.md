---
title: "Set Your Lathe Offsets Manually - Haas Automation Tip of the Day"
domain: lathe
source: youtube
videoId: rd2u2MG6meY
url: https://www.youtube.com/watch?v=rd2u2MG6meY
channel: "Haas Automation, Inc."
duration_s: 1353
tribal_entries: 8
chunks_scanned: 40
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Set Your Lathe Offsets Manually - Haas Automation Tip of the Day

**Channel:** [Haas Automation, Inc.](https://www.youtube.com/watch?v=rd2u2MG6meY)
**Duration:** 22m 33s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 8 of 40 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.45

> part this is how parts are programmed and this is how we're going to set them up now keep that in mind as we jog our tur

part this is how parts are programmed and this is how we're going to set them up now keep that in mind as we jog our turret turret turret to a safe location and command tool 2 into position okay enough theory let's go ahead and set that tool offset set that tool offset set that tool offset x value i'm going to start the spindle at 250 rpms by entering 250 and pressing the spindle forward key now we can run the spindle faster for smaller parts smaller parts smaller parts or when turning aluminum and we will want to turn it slower if running a larger part or when cutting harder materials harder

_Signals: camOps:1 · params:1 · howto:4_

### Tip 2 — confidence 0.46

> diameter now we measured measured measured 2

diameter now we measured measured measured 2.9705 inches 75.45 millimeters 2.9705 inches 75.45 millimeters 2.9705 inches 75.45 millimeters that is the x diameter position that our tool tool tool is currently at and we know this because we just we just we just measured it now we'll go ahead and enter that value and the control does the rest for us for us for us the tool offset that is calculated is the exact machine position required to put the tip of our tool directly on our part center line x0 with the x set we're going to do something very similar something very similar something very

_Signals: params:3 · howto:2_

### Tip 3 — confidence 0.4

> shift from where those tools were originally touched off for now we want to make sure that that both our that that both 

shift from where those tools were originally touched off for now we want to make sure that that both our that that both our that that both our x and our z g54 work offset are set to zero uh we got to set them to zero for now zero for now zero for now and we're going to look at this again after we've touched off the rest of our tools tools tools our next tool is a drill now drills taps reams are on center tools and the the center of the tool and the tools holder tools holder tools holder need to be on center aligned with the spindle center line spindle center line spindle center line we can

_Signals: camOps:1 · howto:2_

### Tip 4 — confidence 0.45

> to set the z we will load the drill back up the drill back up the drill back up and jog it up to the exact same z face t

to set the z we will load the drill back up the drill back up the drill back up and jog it up to the exact same z face that we had turned with our od tool earlier that z face will serve as the touch off location for all of our tools tools tools in this basic setup we can use a piece of paper of paper of paper or shim stock to feel for contact as we carefully jog the tool carefully jog the tool carefully jog the tool up to the face in the z we can use the .001 jog increment .001 jog increment .001 jog increment or .0001 for better accuracy now we jog until we feel the paper or the feeler gauge

_Signals: camOps:3 · howto:1_

### Tip 5 — confidence 0.49

> the feeler gauge the feeler gauge drag and then press the z face measure button while highlighting our tools offset our 

the feeler gauge the feeler gauge drag and then press the z face measure button while highlighting our tools offset our tools offset our tools offset if you used a shim you will need to subtract the thickness of the shim from your z offset to account for it now we just touched off a pretty big drill it's drill it's drill it's 32 millimeters in diameter about an inch and a quarter and a quarter and a quarter if we were if we were setting a small drill we might have used an er 32 extension that has the the er taper to it it it but it would have been set up in the exact same way exact same way

_Signals: camOps:4 · howto:2_

### Tip 6 — confidence 0.43

> this next on our list is our boring bar now we've been setting up we've been setting up we've been setting up all of our

this next on our list is our boring bar now we've been setting up we've been setting up we've been setting up all of our tools in a very specific order we set up our od turning tool first because we needed that z face that z face that z face to set all of our tools against and next we have to set up the drill because we need a drilled hole need a drilled hole need a drilled hole in order to set up our boring bar we'll go ahead and use our boing bar to skim the inside diameter of our part making sure that we jog straight away from our part from our part from our part using only the z-axis when

_Signals: camOps:1 · howto:5_

### Tip 7 — confidence 0.58

> we're done now we're going to leave ourselves enough room to reach into that bore with a measuring tool a measuring tool

we're done now we're going to leave ourselves enough room to reach into that bore with a measuring tool a measuring tool a measuring tool a bore gauge now we are at 1.280 inches 32.512 millimeters in diameter diameter diameter we will once again highlight the tool that we're going to set and press that x diameter measure button the tool is currently sitting at 1.280 inches inches inches we know this because we just measured the bore the bore the bore and we have not moved the x at all so we'll enter that and let the control do all the calculations to set the z on this boiling bar we've got to

_Signals: camOps:5 · params:2 · howto:2_

### Tip 8 — confidence 0.43

> clearance issues clearance issues i may set my tool on the edge and then adjust my z adjust my z adjust my z for that to

clearance issues clearance issues i may set my tool on the edge and then adjust my z adjust my z adjust my z for that tool by half of the insert width now this insert is five millimeters wide millimeters wide millimeters wide so i might adjust my z by two and a half millimeters a hundred thou millimeters a hundred thou millimeters a hundred thou putting the tip of our 60 degree insert on center on center on center which would allow me to program the z value on my on my thread with a number that matches the blueprint blueprint blueprint now go ahead and give us some feedback on this one let us

_Signals: params:1 · howto:5_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-rd2u2MG6meY-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/rd2u2MG6meY.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].