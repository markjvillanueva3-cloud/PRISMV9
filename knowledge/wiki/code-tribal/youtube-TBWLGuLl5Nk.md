---
title: "SW Expert Explores Mate Connectors"
domain: cad
source: youtube
videoId: TBWLGuLl5Nk
url: https://www.youtube.com/watch?v=TBWLGuLl5Nk
channel: "Onshape"
duration_s: 488
tribal_entries: 3
chunks_scanned: 14
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SW Expert Explores Mate Connectors

**Channel:** [Onshape](https://www.youtube.com/watch?v=TBWLGuLl5Nk)
**Duration:** 8m 8s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 14 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> [Music] [Music] so in our last video we brought components together from different parts Studios into an on-shape assemb

[Music] [Music] so in our last video we brought components together from different parts Studios into an on-shape assembly now we're ready to create mates between these components so we can establish Dynamic assembly motion meaning we want the lid to hinge open and closed at 90 degrees now mates work a little differently in on shape than they did in SolidWorks in SolidWorks what we would do is select two faces and mate them together well in on shape things work a little bit differently because we utilize what are known as mate connectors now a mate connector is kind of like a coordinate system

_Signals: params:1 · howto:2_

### Tip 2 — confidence 0.44

> the May connector will relocate so that it is always at the center or the midpoint of that edge so what I'd like to do i

the May connector will relocate so that it is always at the center or the midpoint of that edge so what I'd like to do is create a new mate connector here at the center of this end face of the PIN now we see that when we create that mate connector it does have an x y and z-axis I'm going to create another mate connector here by selecting this circular Edge and onshape is going to create that may connector at the very center of that circular Edge or coplanar to this end face of the hinge once I select that circular Edge and the mate connector is created we see that onshape moves those two mate

_Signals: safety:1 · howto:5_

### Tip 3 — confidence 0.44

> the Z axial rotation and that limit is going to start at zero degrees and end at 90 degrees now if we want to visualize 

the Z axial rotation and that limit is going to start at zero degrees and end at 90 degrees now if we want to visualize what that limit is going to look like we can use this little play button here and we see that onshape shows us that pin is going to be able to rotate back 90 degrees and then back down to zero degrees and that looks exactly like what we want so I'm going to hit the green check mark and we're going to test out this assembly the lid opens to 90 degrees and closes back down to zero degrees and that is exactly what we were hoping for from this assembly now this is just my very

_Signals: params:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-TBWLGuLl5Nk-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/TBWLGuLl5Nk.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].