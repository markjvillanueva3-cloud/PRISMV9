---
title: "Limits and Fits:  The ISO System"
domain: general
source: youtube
videoId: wvVMs2BZdeU
url: https://www.youtube.com/watch?v=wvVMs2BZdeU
channel: "Tabletop Machine Shop"
duration_s: 601
tribal_entries: 7
chunks_scanned: 20
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Limits and Fits:  The ISO System

**Channel:** [Tabletop Machine Shop](https://www.youtube.com/watch?v=wvVMs2BZdeU)
**Duration:** 10m 1s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 20 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.46

> is red and the shaft tolerant zone is green this means that without measuring the actual outer diameter of the shaft we'

is red and the shaft tolerant zone is green this means that without measuring the actual outer diameter of the shaft we'll end up somewhere in the green zone and the actual diameter of the hole will end up somewhere in the red zone a pin can fit into a hole one of three different ways clearance transition and interference a clearance fit means that there will always be space between the two parts no matter how the tolerances turn out transition fit means there's sometimes space between the parts and sometimes there isn't but it's usually pretty close pretty close pretty close interference

_Signals: camOps:1 · safety:3_

### Tip 2 — confidence 0.43

> fits never have space between the parts and one part always has to be forced into the other it turns out these categorie

fits never have space between the parts and one part always has to be forced into the other it turns out these categories can actually be quite broad for example a nine millimeter pin fitting into a ten millimeter hole is a clearance fit but it would be extremely loose a nine point nine eight millimeter pin in a ten millimeter hole is also a clearance fit but it's much tighter the former might be good just make sure two parts don't hit each other and the latter might be good for making sure the pin stays approximately in the same position relative to the hole different fits as well as their

_Signals: safety:2_

### Tip 3 — confidence 0.4

> and their sizes will always vary a bit your reamer also cuts slightly different sized holes depending on your work holdi

and their sizes will always vary a bit your reamer also cuts slightly different sized holes depending on your work holding where and the reamer and the cutting parameters all of which can change while reaming your hundred holes because you bought the dowel pins and have no control over their tolerance this is called a shaft basis fit so the challenge is now to decide what size reamer decide what size reamer decide what size reamer to make sure that all the dowel pins fit properly if you know the tolerance range you can expect from your reamer and you know the tolerances of the dowel pins you

_Signals: safety:1 · howto:1_

### Tip 4 — confidence 0.4

> the clearance without changing the allowance is to tighten up your tolerance zones either by changing your manufacturing

the clearance without changing the allowance is to tighten up your tolerance zones either by changing your manufacturing methods or buying tighter tolerance pins conveying tolerant zones can be a bit annoying say you own a factory that makes dowel pins you want to be able to tell customers what the tolerance zone is on each size of dowel pin but it would be cumbersome to have to create engineering drawings for each size so instead you can just say the tolerance will always be a bit over the specified dimension we're a bit over scales roughly proportionately to the target size we could say

_Signals: safety:1 · howto:1_

### Tip 5 — confidence 0.43

> limits and it diverges into the material for holes H means the smallest the hole can be is the nominal size but it's all

limits and it diverges into the material for holes H means the smallest the hole can be is the nominal size but it's allowed to be larger for shafts H means the largest a shaft can be as the nominal size and it can only be smaller the H tolerance zone is important because it's taken as the middle shafts or pins with tolerance zones before H in the alphabet will never be the nominal size holes will always be larger and shafts will always be smaller after H there a few tolerance zones such as J and J s where the shaft can be larger or smaller but as you go further through the alphabet the

_Signals: safety:3_

### Tip 6 — confidence 0.43

> the hole has an h7 tolerance in the shaft has a g6 tolerance I've cut some holes in this piece of aluminum to show some 

the hole has an h7 tolerance in the shaft has a g6 tolerance I've cut some holes in this piece of aluminum to show some examples of different fits this is an undersized h6 tolerance dowel pin the e7 h6 and f7 h6 are reasonably loose clearance holes you can rattle the 12.7 millimeter h6 dowels around a little bit and they basically drop right through the h7 h6 and g7 h6 are much closer fits and could perhaps be used to locate parts while remaining removable the js7 h6 is a transition fit that as you can see ended up being on the lighter interference side but a rubber mallet would work to tap

_Signals: camOps:1 · safety:1 · howto:1_

### Tip 7 — confidence 0.4

> the pin in for a semi-permanent joint joint joint finally the p7 h7 is an interference fit and would probably require a 

the pin in for a semi-permanent joint joint joint finally the p7 h7 is an interference fit and would probably require a hydraulic press or at least a beefy Arbor press to install this might be a good time to point out that contrary to my labels in my past example individual holes and shafts can't be called jf7 or h7 the js7 refers to the tolerance zone that the hole falls in a hole that is 10.00 one millimeters is in the js7 tolerance zone but it's also in the h6 h5 and js5 tolerance zones you have to remember that we can't measure the hole until after it's cut and we have to specify the

_Signals: safety:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-wvVMs2BZdeU-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/wvVMs2BZdeU.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].