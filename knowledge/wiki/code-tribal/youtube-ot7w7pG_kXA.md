---
title: "Understanding G0, G1, G2 and G3 surface continuity using curvature comb"
domain: general
source: youtube
videoId: ot7w7pG_kXA
url: https://www.youtube.com/watch?v=ot7w7pG_kXA
channel: "Jaiprakash Pandey"
duration_s: 850
tribal_entries: 3
chunks_scanned: 19
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Understanding G0, G1, G2 and G3 surface continuity using curvature comb

**Channel:** [Jaiprakash Pandey](https://www.youtube.com/watch?v=ot7w7pG_kXA)
**Duration:** 14m 10s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 19 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.4

> so here we'll talk about the G naught G 1 G 2 and G 3 surface continuity now to understand the surface continuity I'll s

so here we'll talk about the G naught G 1 G 2 and G 3 surface continuity now to understand the surface continuity I'll start by making some sketches and for that I'm gonna go to a sketch panel and I'll start with spline fit point spline and I'll select Y Z plane and I'm gonna make well this kind of spline and another one starting from here and there it is it is it is so this is the spline all right now nothing fancy just two simple splines and now I'm gonna extrude these splines using the surface tool so I'll just click on stop sketch and I'm gonna extrude it not using these 3d modeling tools

_Signals: camOps:1 · howto:2_

### Tip 2 — confidence 0.46

> here and as you can see here the chrome lines or the curvature cone lines are really very tiny when compared with this o

here and as you can see here the chrome lines or the curvature cone lines are really very tiny when compared with this one that's because the radius here is really big and these chrome lines are inversely proportional to the radius oh they'll be small here also these chrome lines are always normal to the surface so in this case they are pointing at 90 degrees to the point of contact of the surface so wherever they are touching the surface they are pointing at 90 degrees so this is the visual representation of the surface continuity or the continuity of your curvature you can also modify this

_Signals: params:2 · safety:1 · howto:1_

### Tip 3 — confidence 0.41

> once again the same plane and the same kind of drawing so here and from this point we gonna make this all right now once

once again the same plane and the same kind of drawing so here and from this point we gonna make this all right now once again we will extrude it using the patch environment so I'll go to patch and extrude and well you know that this is once again G not continuty because of this sharp edge but now we'll convert it into G 1 continuity using Filat tool so I'll go to modify and fill it and I'll select this edge alright and I'll just move this little bit inside so that we have little bit of radius here that's approximately 18 mm that's good and now if you look at this Filat panel you're gonna see

_Signals: params:1 · howto:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-ot7w7pG_kXA-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/ot7w7pG_kXA.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].