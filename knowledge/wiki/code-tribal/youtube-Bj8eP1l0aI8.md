---
title: "A further explanation of what I was thinking on the small mill turn machine. Just a quick video."
domain: mill
source: youtube
videoId: Bj8eP1l0aI8
url: https://www.youtube.com/watch?v=Bj8eP1l0aI8
channel: "Edge Precision"
duration_s: 359
tribal_entries: 3
chunks_scanned: 8
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# A further explanation of what I was thinking on the small mill turn machine. Just a quick video.

**Channel:** [Edge Precision](https://www.youtube.com/watch?v=Bj8eP1l0aI8)
**Duration:** 5m 59s
**Domain:** `mill` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 8 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `mill`.

### Tip 1 — confidence 0.56

> absolutely necessary to be able to jog parallel to jog parallel to jog parallel to the tool but to the tool but to the t

absolutely necessary to be able to jog parallel to jog parallel to jog parallel to the tool but to the tool but to the tool but but on a manual machine like a Bridgeport Mill or something if you tip the head or or nod the head you have to um move the knee up and down in order to to say face a flat face or do these kind of things on a manual Mill because it can't because it can't because it can't unless you had another axis of the machine perpendicular to the tools axis you can't really face you can't really face you can't really face you know flats or middle pockets in the um in the um in the

_Signals: toolpath:3 · camOps:2_

### Tip 2 — confidence 0.44

> um in the part or drill hole patterns around say circles or square hole patterns and things like that you can't really d

um in the part or drill hole patterns around say circles or square hole patterns and things like that you can't really do that really do that really do that on a um Bridgeport Mill very easily I mean you could do it you'd have to trig out everything and and do all that but see this and you could even even if you uh uh uh see if I jog this up in the x-axis and say jog the B say jog the B say jog the B down to a even a a steeper angle like this than if I I was jogging was jogging was jogging in the um in the um in the um what they call this XZ axis I could turn tapers if if you know if the

_Signals: camOps:3_

### Tip 3 — confidence 0.54

> of either jogging it in the the TX and the TZ the tool X and the tool Z and the tool Z and the tool Z and and the Y the 

of either jogging it in the the TX and the TZ the tool X and the tool Z and the tool Z and the tool Z and and the Y the Y doesn't change the Y would always be correct would always be correct would always be correct or you can jog it you know in the normal what you might call World axis I guess or machine axis and then you could to change the position on the part you can rotate the c-axis c-axis c-axis here and move around the part around the out the outside of the park to do various things like mill Flats you know or or whatever or drill holes whole patterns Mill pockets and things like that

_Signals: camOps:3 · safety:3 · howto:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-Bj8eP1l0aI8-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `mill`
- Source artifact: `state/shared/youtube-extraction/Bj8eP1l0aI8.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].