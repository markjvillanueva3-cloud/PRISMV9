---
title: "Swiss CNC  Citizen \"M\" Series Programming by Diligence Part 1"
domain: lathe
source: youtube
videoId: CAKLh7Wm30g
url: https://www.youtube.com/watch?v=CAKLh7Wm30g
channel: "Diligence Incorporated"
duration_s: 1041
tribal_entries: 6
chunks_scanned: 22
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Swiss CNC  Citizen "M" Series Programming by Diligence Part 1

**Channel:** [Diligence Incorporated](https://www.youtube.com/watch?v=CAKLh7Wm30g)
**Duration:** 17m 21s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 22 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.4

> program structure and the format of the program and how the different sections of the program work together the next lin

program structure and the format of the program and how the different sections of the program work together the next line of code will set up the coordinate system of your stock the Z coordinate system and the x coordinate system this is done with a G 50 which is a coordinate shift command it is used for changing where your zero of the part is on the Cartesian coordinate system it will be explained more thoroughly in the programming portion next a mode will be called up for the process that was chosen for your part the back spindle work for the turret is usually always programmed in the sub

_Signals: safety:1 · howto:1_

### Tip 2 — confidence 0.41

> program like this the basket dump is done here also [Music] the next item in dollar 2 is the pickoff codes that basicall

program like this the basket dump is done here also [Music] the next item in dollar 2 is the pickoff codes that basically will just get the torrent out of the way so that the back spindle and the main spindle can work together it also incorporates the M machines capabilities and pickoff machines capabilities and pickoff machines capabilities and pickoff procedures with the game tooling you can do turning operations on the main spindle side while turning you could be drilling into the center of the part with a turret tool at the same time you can use the gang to live tools to drill or mill on

_Signals: camOps:2_

### Tip 3 — confidence 0.41

> surface synchronization for constant surface feed per minute and for capping disc 1 finishes with how tool calls work an

surface synchronization for constant surface feed per minute and for capping disc 1 finishes with how tool calls work and how you can save time while exchanging tools X 3 inches with the other tool and call up the Q 1 for the next tool and instead of going to the safety diameter above the stock and then moving over it would go at an angle from the X 3 inches and go to that tools position disc 2 with a runtime of 104 minutes contains the G codes G 0 to G 67 incorporating information on feed commands using the G 1 command with more than one axis both axes start out at the exact same time and

_Signals: params:2_

### Tip 4 — confidence 0.44

> depending upon your machines parameter number five the starting location will be opposite sign once started in mode four

depending upon your machines parameter number five the starting location will be opposite sign once started in mode four c-axis this too also goes through single-point threading and tapping with the g32 command we will now go through a tapping routine to help you understand how the g32 works for tapping this is the type of tap holder you will need for tapping on this machine it is what is called an extension tap holder the tap can be pulled forward to compensate for the machine reversing to start out programming your g32 thread make sure you're at the correct speed in other words put a dwell

_Signals: camOps:3_

### Tip 5 — confidence 0.4

> explained in great detail next we put in our program the shift we want since the shift is an incremental shift we must u

explained in great detail next we put in our program the shift we want since the shift is an incremental shift we must use the incremental letters for the axis we are shifting we are shifting in the z direction so we will use the W incremental access letter mainly because of that the diameter of the spindles and how the Machine was constructed the shift for the live tools is five hundred and ninety thousandths and five tenths which is 15 millimeters in metric boring bars always have their tips pointing down when on the turret this is so all your programming would be positive meaning you would

_Signals: safety:1 · howto:1_

### Tip 6 — confidence 0.41

> this g65 is calling up calling up calling up the letters after it are the arguments or variables that the person wants t

this g65 is calling up calling up calling up the letters after it are the arguments or variables that the person wants to pass into the generic program in other words he can control how the program works with this information the g65 command is also called a cam cycle in this example a is the first Peck disc 3 with a runtime of 69 minutes contains information on the G codes G 76 through G 999 it incorporates single-point threading with G 76 completely dismantling its structure the first G 76 line has three things on it P Q and R first we will go through what the P stands for and the different

_Signals: toolpath:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-CAKLh7Wm30g-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/CAKLh7Wm30g.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].