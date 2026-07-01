---
title: "Using Parameters to Update Patterns in Fusion 360 #Fusion360 #Patterns #Parameters #ParametricDesign"
domain: cad
source: youtube
videoId: -BPcktQwIIY
url: https://www.youtube.com/watch?v=-BPcktQwIIY
channel: "Learn Everything About Design"
duration_s: 956
tribal_entries: 3
chunks_scanned: 32
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Using Parameters to Update Patterns in Fusion 360 #Fusion360 #Patterns #Parameters #ParametricDesign

**Channel:** [Learn Everything About Design](https://www.youtube.com/watch?v=-BPcktQwIIY)
**Duration:** 15m 56s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 3 of 32 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.43

> video so first example here we've got this sort of rectangular pattern we've got vertical bars inside of this frame if w

video so first example here we've got this sort of rectangular pattern we've got vertical bars inside of this frame if we go to modify and change parameters let's go ahead and pull this out of the way if i modify the length of the part so you can see here it's currently 8 inches that's the inside size based on the pattern length and then we've got the overall dimensions of the part now this one here if we modify this value to say 16 say 16 say 16 it updates and there are more instances of the pattern you can see the pattern number here of 14 updates if we change it to eight inches you can see

_Signals: params:1 · howto:5_

### Tip 2 — confidence 0.5

> if i change it to 36 inches now we've only got six if i change it to 38 inches we have the same number but the spacing i

if i change it to 36 inches now we've only got six if i change it to 38 inches we have the same number but the spacing increases if i change it to 42 we're now adding an extra pattern so you can see that with logic we're able to do some pretty cool things with the design and get them to update update update so the one that we're going to be creating is the whole pattern because it's the easiest to set up so let's go ahead and create a new design we're going to be using the default metric units and we're going to start by creating our user parameters so if you've never created user parameters

_Signals: params:2 · safety:1 · howto:5_

### Tip 3 — confidence 0.43

> no units and it it comes in as millimeters so this isn't going to work we have to cancel it out and we have to always be

no units and it it comes in as millimeters so this isn't going to work we have to cancel it out and we have to always be sure that we are using the correct units so again p a t i width and there's no way for us to really go back and edit um completely edit the expression to where we can change those units at least i don't believe there is so we want to make sure that we just get it right here so again plate width divided by 50 millimeters close the brackets brackets brackets so you can see here if i click on the expression i can edit that but if i click on the units i'm not able to change

_Signals: safety:1 · howto:4_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath--BPcktQwIIY-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/-BPcktQwIIY.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].