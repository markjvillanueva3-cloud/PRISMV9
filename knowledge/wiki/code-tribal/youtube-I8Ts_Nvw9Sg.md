---
title: "SOLIDWORKS Topology Optimization"
domain: cad
source: youtube
videoId: I8Ts_Nvw9Sg
url: https://www.youtube.com/watch?v=I8Ts_Nvw9Sg
channel: "TPM"
duration_s: 208
tribal_entries: 2
chunks_scanned: 5
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SOLIDWORKS Topology Optimization

**Channel:** [TPM](https://www.youtube.com/watch?v=I8Ts_Nvw9Sg)
**Duration:** 3m 28s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 2 of 5 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.41

> my goal to reduce my mass by 50% then I will add constraints to keep material in the areas that I want to be unaffected 

my goal to reduce my mass by 50% then I will add constraints to keep material in the areas that I want to be unaffected by the reduction of material now we will run the study and get our optimized geometry based on the structure we started with the areas to avoid removing material and the goals the study gives us a structure that has a reduced weight we can save the new part out as a mesh body and STL for 3d printing or we can use it to retrace a new solid SolidWorks 2018 does have a few mesh editing tools for cleaning up this model and we can use that if we want to go directly to a 3d print

_Signals: camOps:2_

### Tip 2 — confidence 0.42

> I think the best method currently with these new tools is to just create a solid body on top of the model so we can meas

I think the best method currently with these new tools is to just create a solid body on top of the model so we can measure and trace the new geometries after that of course you want to test the new body in an FAA study and check the new factor of safety historically these shapes have been difficult to manufacture and only 3d printing could effectively make these shapes quickly but with SolidWorks 2018 we can actually take these shapes and generate usable mesh geometries and then apply machine design principles to them using 3d CAD to make a finished part hopefully that will give users a few

_Signals: camOps:2 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-I8Ts_Nvw9Sg-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/I8Ts_Nvw9Sg.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].