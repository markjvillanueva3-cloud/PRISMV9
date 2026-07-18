---
title: "How To Calculate Speeds and Feeds (Inch Version) - Haas Automation Tip of the Day"
domain: general
source: youtube
videoId: zzzIpC39WUg
url: https://www.youtube.com/watch?v=zzzIpC39WUg
channel: "Haas Automation, Inc."
duration_s: 866
tribal_entries: 4
chunks_scanned: 19
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# How To Calculate Speeds and Feeds (Inch Version) - Haas Automation Tip of the Day

**Channel:** [Haas Automation, Inc.](https://www.youtube.com/watch?v=zzzIpC39WUg)
**Duration:** 14m 26s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 19 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.45

> pi the ratio between a circles diameter and its circumference is pi so no matter what diameter our tire is the distance 

pi the ratio between a circles diameter and its circumference is pi so no matter what diameter our tire is the distance around the outside of that tire where the rubber meets the road is always 3.14 times greater this tire has a diameter of 3.8 two inches three point eight two times pi is 12 now this tire come on this tire has a diameter of 40 inches 40 times pi about 126 inch circumference okay that's great get out of it if we were to run our tires too fast too many surface feet per minute they would overheat blister and fail our end Mills work in the same way there's a limit a maximum

_Signals: params:2 · safety:1_

### Tip 2 — confidence 0.41

> choose the right material group you are gonna burn up your tools titanium has a different machine ability than mild stee

choose the right material group you are gonna burn up your tools titanium has a different machine ability than mild steel if you try running a drill or an end mill in titanium at cutting speeds meant for mild steel you are gonna melt that tool it will overheat and fail so if you can't find what material group your stock should be in then give your tooling representative a call they would love to hear from you how many tooling reps out there would love to hear from one of our viewers and talk tools yeah that's what I thought from the section of the manual for our tool under the rope for our

_Signals: camOps:2_

### Tip 3 — confidence 0.4

> the number of teeth matches the number of flutes this tool has three flutes three teeth this tools got six teeth and thi

the number of teeth matches the number of flutes this tool has three flutes three teeth this tools got six teeth and this one's got four we want our tool to take a very specific size bite with each tooth this is our feed per tooth in inches just like our cutting speed the book or PDF will give us that feed per tooth value the catalog says that from my tool material and type of tool path three thousandths of an inch per tooth is a good starting range point zero zero three our feed per tooth times for our number of teeth times one thousand five hundred and twenty eight our RPM will give us our

_Signals: toolpath:1_

### Tip 4 — confidence 0.43

> inch per minute feed rate F eighteen point three three six some manuals will just give out a single feed rate for all cu

inch per minute feed rate F eighteen point three three six some manuals will just give out a single feed rate for all cutting conditions but most will give us at least two possibilities one for slotting and one for side milling our AE is our width of cut that's our step over that's our radial depth of cut and our AP is our axial depth of cut how deep the tool is moving in the z-axis most times if your slotting your bite is going to be about 25 percent less than if you're just side milling with the popularity of optimized tool paths like dynamic adaptive volume mill type high speed machining

_Signals: toolpath:1 · camOps:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-zzzIpC39WUg-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/zzzIpC39WUg.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].