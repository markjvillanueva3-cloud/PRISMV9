---
title: "Topology Optimization in Autodesk Fusion 360"
domain: cad
source: youtube
videoId: lyTULzvHhXw
url: https://www.youtube.com/watch?v=lyTULzvHhXw
channel: "Autodesk Sustainability Workshop"
duration_s: 381
tribal_entries: 4
chunks_scanned: 10
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Topology Optimization in Autodesk Fusion 360

**Channel:** [Autodesk Sustainability Workshop](https://www.youtube.com/watch?v=lyTULzvHhXw)
**Duration:** 6m 21s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 10 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> lever arm part which can be found in the simulation sample models included as part of your Fusion 360 package we will he

lever arm part which can be found in the simulation sample models included as part of your Fusion 360 package we will head straight to the simulation workspace to set up our initial simulation the new steady window will already be open and we will select shape optimization study we're now ready to Define our material constraints loads and mesh size as well as a few other parameters to select our material we'll click on the material icon we'll continue with the parts predefined to Steel Steel Steel material we will now apply constraints by clicking on the structural constraints icon based on

_Signals: howto:5_

### Tip 2 — confidence 0.41

> material around the two pin holes to apply this constraint to our simulation we'll use The Preserve regions functionalit

material around the two pin holes to apply this constraint to our simulation we'll use The Preserve regions functionality we will preserve the first region by selecting the inside of the larger hole and setting the boundary radius to 8 radius to 8 radius to 8 mm this will ensure that no material within 8 mm of the hole is removed by the simulation we'll repeat this process for the smaller hole this time setting a six millim boundary radius next because our model is symmetrical across the horizontal plane we will want our lightweighted version to achieve the same symmetry we'll do so by

_Signals: params:2_

### Tip 3 — confidence 0.4

> helpful insight they often cannot be used literally as they are more organic in nature and cannot be manufactured with t

helpful insight they often cannot be used literally as they are more organic in nature and cannot be manufactured with typical methods other than additive manufacturing if we wanted to say laser cut or Mill this part we have to make further updates to the model itself based on these results provided by the simulation we will do so by promoting our results back into the modeling workspace this will allow us to direct ly modify the original part based on our results we'll go to results and click promote now you can see that our simulation results have been simulation results have been

_Signals: camOps:1 · howto:2_

### Tip 4 — confidence 0.47

> simulation results have been superimposed over our original model to update the model directly based on these results we

simulation results have been superimposed over our original model to update the model directly based on these results we will create a new sketch on the top face we'll Begin by hand sketching a series of Contours in response to the areas of material removal provided by the simulation the simulation the simulation we will then apply a series of parallel constraints dimensions and fillets to create a uniform easy to manufacture part because this video is not focused on the sketching Tools in Fusion 360 I will skip ahead to the completed sketch now we have our final sketch Contour again for the

_Signals: toolpath:2 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-lyTULzvHhXw-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/lyTULzvHhXw.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].