---
title: "NX CAE Tips and Tricks - Direct Editing"
domain: cad
source: youtube
videoId: VJEMzA3NBvI
url: https://www.youtube.com/watch?v=VJEMzA3NBvI
channel: "GMSystem2001"
duration_s: 245
tribal_entries: 4
chunks_scanned: 5
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# NX CAE Tips and Tricks - Direct Editing

**Channel:** [GMSystem2001](https://www.youtube.com/watch?v=VJEMzA3NBvI)
**Duration:** 4m 5s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 5 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> in this example we will use a synchronous modeling command to lengthen the arms of this model then we will update the ex

in this example we will use a synchronous modeling command to lengthen the arms of this model then we will update the existing mesh to conform to the geometry changes in situations where you do not have permission to modify the master CAD part you can make the geometry changes to the CAE idealized part first load and display the idealized part the master part is an assembly component of the idealized part before we can edit the cat geometry in the idealized part we must create an associative copy of the solid body from the master part in the advanced simulation toolbar click promote select the

_Signals: howto:5_

### Tip 2 — confidence 0.48

> solid body and then click okay the promoted CAE model is now Associated to the history in the master part if the master 

solid body and then click okay the promoted CAE model is now Associated to the history in the master part if the master part is updated NX also updates the promoted body in the idealized part next turn on the synchronous modeling synchronous modeling synchronous modeling toolbar from the synchronous modeling toolbar select move face this command moves a set of faces adjusting related faces accordingly click the settings tab the face finder automatically selects faces that are related to the faces that you select it uses a set of search criteria to find the related faces turn on the select Co

_Signals: camOps:2 · howto:7_

### Tip 3 — confidence 0.48

> axal select go planer and select symmetric search criteria we will select faces that are normal to the desired move Dire

axal select go planer and select symmetric search criteria we will select faces that are normal to the desired move Direction select one of the filet faces and an inner face of one of the holes because of the select code axial option the faces on the opposite arm that share the same axis were selected automatically select the large planer face use Quick Pick to select the planer face on the inside of the pocket because of the select go planer option the related planer faces on the opposite arm were also opposite arm were also opposite arm were also selected now we are ready to move the faces

_Signals: toolpath:1 · howto:8_

### Tip 4 — confidence 0.48

> select the blue arrow handle and drag it out to a distance of 50 mm you can also type a value in the distance box click 

select the blue arrow handle and drag it out to a distance of 50 mm you can also type a value in the distance box click okay to accept the new distance suppose we want to make further adjustments to the arm length open the part Navigator a move face feature has been created in the model history we can edit the feature and make further adjustments to the distance Dimension rightclick the Dimension rightclick the Dimension rightclick the feature and select edit feature and select edit feature and select edit parameters in the distance box change the value to 45 mm now that the geometry changes

_Signals: params:2 · howto:7_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-VJEMzA3NBvI-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/VJEMzA3NBvI.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].