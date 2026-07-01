---
title: "Sodick IntelliQvic: IQ Solid to 4 Axis wire edm - punch example"
domain: wedm
source: youtube
videoId: 9qLnCkt5xBc
url: https://www.youtube.com/watch?v=9qLnCkt5xBc
channel: "GreentweenVideo"
duration_s: 581
tribal_entries: 4
chunks_scanned: 12
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Sodick IntelliQvic: IQ Solid to 4 Axis wire edm - punch example

**Channel:** [GreentweenVideo](https://www.youtube.com/watch?v=9qLnCkt5xBc)
**Duration:** 9m 41s
**Domain:** `wedm` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 12 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `wedm`.

### Tip 1 — confidence 0.4

> mouse - okay so the first step would be to make sure you have the part orientated for 0 zero if not they give you this p

mouse - okay so the first step would be to make sure you have the part orientated for 0 zero if not they give you this place model function I'll do a future video on how to move part around and shift your 0 0 but this is what this is for just put the part put your 0 0 I pick up on the block to program the part first step is to do what we call feature recognition and the contour extraction page in here it's gonna find the thickness of the model already that fills out already and then you say if you want to search the model for all Pat all shapes punches or dot cuts or you can say just search

_Signals: toolpath:1_

### Tip 2 — confidence 0.43

> okay next step is to put a start hole on the part so I'm gonna put one up here at X 0 and y if you look down in the bott

okay next step is to put a start hole on the part so I'm gonna put one up here at X 0 and y if you look down in the bottom right it gives you where your cursor is right now so if I just freehand one in here I'm gonna want to put her in a position that I know of I'm gonna put it at Y point five but I got the mouse right now at 0.55 so I will turn on the starting hole function and I will put it at Y point five and creates a little wire star hole for us to use for the tool path now if you're doing a die with multi holes multi pockets in it it has a function to search the entire block there's a

_Signals: toolpath:1 · camOps:1_

### Tip 3 — confidence 0.4

> starting whole search function so if you have little circles drawn in for your starter holes it'll search for those thin

starting whole search function so if you have little circles drawn in for your starter holes it'll search for those things you would go in here and tell it what the max size is for your start holes and it will search all your circles and there within that size it will convert it will change them to be setups cutting circles it changes them into these wire starts okay next up is a machining path and path generation and we are gonna turn on the automatic which is to automatically find the start hole is what that's for and hit generate path first thing is to set the power settings for the wire

_Signals: camOps:1 · howto:2_

### Tip 4 — confidence 0.48

> machine in any way when you run the desktop version you have to have right database which matches your machine in the so

machine in any way when you run the desktop version you have to have right database which matches your machine in the software which I do not have at this moment for this machine so any just I'm gonna set that kind of generically to move on forward now we have three are up so we need to pick a surface finish so pick this rougher finish choice here and it's a three pass technologies as three times here I wanted a better surface finish I could pick these better surface finishes and this changes from three time passes the better finish and before time passes or a little bit there five time

_Signals: camOps:4 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-9qLnCkt5xBc-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `wedm`
- Source artifact: `state/shared/youtube-extraction/9qLnCkt5xBc.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].