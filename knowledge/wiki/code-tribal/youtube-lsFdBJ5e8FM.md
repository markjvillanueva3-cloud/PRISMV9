---
title: "GibbsCAM Tech Tip: How to Program Sub Spindle Pickoff Ops"
domain: cam
source: youtube
videoId: lsFdBJ5e8FM
url: https://www.youtube.com/watch?v=lsFdBJ5e8FM
channel: "Daystrom Technologies - GibbsCAM Info"
duration_s: 373
tribal_entries: 8
chunks_scanned: 9
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# GibbsCAM Tech Tip: How to Program Sub Spindle Pickoff Ops

**Channel:** [Daystrom Technologies - GibbsCAM Info](https://www.youtube.com/watch?v=lsFdBJ5e8FM)
**Duration:** 6m 13s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 8 of 9 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.51

> [Music] [Music] in today's gift cam tech tip you will learn how to program sub spindle pick off operations spindle pick 

[Music] [Music] in today's gift cam tech tip you will learn how to program sub spindle pick off operations spindle pick off operations spindle pick off operations starting from solid models first you will need to open the solid model in gibbs cam gibbs cam gibbs cam it's best to select the proper machine in the document control dialog before opening the file opening the file opening the file in this case i'm selecting a doosan twin spindle as my machine before opening a solidworks part file solidworks part file solidworks part file named new mill turn named new mill turn named new mill turn

_Signals: camOps:6 · howto:1_

### Tip 2 — confidence 0.42

> once the part is open you will need to position the part properly in the main spindle spindle spindle i find the easiest

once the part is open you will need to position the part properly in the main spindle spindle spindle i find the easiest way to do this is to open the coordinate systems dialog and select x y plane for the main spindle spindle spindle with face select turned on select the front face of the part before right mouse clicking to align face to cs now use modify shrink wrap to set the starting stock dimensions starting stock dimensions starting stock dimensions open the document control dialog and set the desired x d and z clearance values values values and then set the graphic part face distance

_Signals: howto:7_

### Tip 3 — confidence 0.46

> to zero double-click the solid model to place it in the body bag in the body bag in the body bag and rename it part in m

to zero double-click the solid model to place it in the body bag in the body bag in the body bag and rename it part in main [Music] select the part in the body bag and use ctrl d to duplicate it the new solid in the workspace is now selected use selected use selected use modify translate to move this new solid into position in the sub-spindle this will always be the length of the part in the z-axis as a positive value once this new part is in position in the sub spindle select the sub spindle select the sub spindle select the zx plane in the coordinate systems dialog right mouse click it and

_Signals: safety:1 · howto:7_

### Tip 4 — confidence 0.4

> change cs xyz to make the solid belong to the sub-spindle belong to the sub-spindle belong to the sub-spindle double-cli

change cs xyz to make the solid belong to the sub-spindle belong to the sub-spindle belong to the sub-spindle double-click the model to put it in the body bag where you can rename it to part in sub now double-click both solids to put them back into the workspace back into the workspace back into the workspace open the work group dialog rename workgroup 1 to blank since we will leave this will leave this will leave this unused click on new workgroup and rename it to check as we will use this geometry to make certain everything is set up correctly for simulation with the zx plane for the sub

_Signals: howto:5_

### Tip 5 — confidence 0.45

> spindle still active still active still active turn on the profiler and slice spun body select the green profile and the

spindle still active still active still active turn on the profiler and slice spun body select the green profile and then right mouse click on it to extract geometry now switch to the z x plane for the main spindle spindle spindle select that green profile and right mouse click on it to extract geometry turn off the profiler notice the geometry for the main geometry for the main geometry for the main is blue while the geometry for the sub is magenta is magenta is magenta this is how gibbscam shows geometry in the active cs the active cs the active cs versus an inactive cs versus an inactive

_Signals: camOps:2 · howto:4_

### Tip 6 — confidence 0.4

> spindle from the main spindle from the main spindle also for the sub spindle set the z-max to 

spindle from the main spindle from the main spindle also for the sub spindle set the z-max to .025 to .025 to .025 this will be the stock left by the cut off tool to remove with facing set the z stick out length to 1.025 holding on to 0.5 of material with the sub spindle sub spindle sub spindle with part being 1.5 long plus 0.025 stock for facing with the sub spindle now that everything is set up correctly we will program the part first i will load a facing process for the main spindle the main spindle the main spindle select the geometry set the machining markers and do it then i will load a

_Signals: howto:5_

### Tip 7 — confidence 0.41

> turning process for the main spindle next i will load all of the processes for picking off the part with the sub spindle

turning process for the main spindle next i will load all of the processes for picking off the part with the sub spindle spindle spindle these consist of a sub spindle in process to a grip process to a grip process to a grip z of 0.5 a sub spindle pole with a shift distance of 1.675 of 1.675 of 1.675 which is part length plus cutoff tool width plus width plus width plus 0.025 stock for facing on the subspindle plus .025 stock for facing the next part a contour part process with cutoff selected selected selected a sub spindle return with part in main i will select the geometry on the front of

_Signals: toolpath:1 · howto:1_

### Tip 8 — confidence 0.44

> the part for the cut off contour operation finally i will change the zx plane for the sub spindle load a facing process 

the part for the cut off contour operation finally i will change the zx plane for the sub spindle load a facing process for the sub spindle select the geometry set the machining markers using opsim rendering with stop at part load unload selected and overlay geometry turned on geometry turned on geometry turned on i can clearly see that everything is set up correctly for machining in both the main main main and sub spindles thanks for watching this gibscam tech tip this gibscam tech tip this gibscam tech tip if you have any questions please feel free to contact your local gibbscam

_Signals: toolpath:1 · howto:4_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-lsFdBJ5e8FM-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/lsFdBJ5e8FM.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].