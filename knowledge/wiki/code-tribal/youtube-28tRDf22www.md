---
title: "Trochoidal Milling"
domain: mill
source: youtube
videoId: 28tRDf22www
url: https://www.youtube.com/watch?v=28tRDf22www
channel: "Buildbotics LLC"
duration_s: 382
tribal_entries: 5
chunks_scanned: 8
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Trochoidal Milling

**Channel:** [Buildbotics LLC](https://www.youtube.com/watch?v=28tRDf22www)
**Duration:** 6m 22s
**Domain:** `mill` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 8 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `mill`.

### Tip 1 — confidence 0.4

> And in making these plates, I I realized that um that um that um if you have to cut through a lot of aluminum aluminum a

And in making these plates, I I realized that um that um that um if you have to cut through a lot of aluminum aluminum aluminum uh 6061 aluminum using uh basically my own built CNC machine, which is pictured right here, um right here, um right here, um you're best off using trochoidal uh milling. And trochoidal milling allows you to take deep cuts in aluminum in in a series of circular sweeps.

_Signals: toolpath:2_

### Tip 2 — confidence 0.54

> Since trochoidal cutting uses Since trochoidal cutting uses consistent smooth forces consistent smooth forces consistent

Since trochoidal cutting uses Since trochoidal cutting uses consistent smooth forces consistent smooth forces consistent smooth forces and very small and very small and very small depth of cut for each sweep, you can use a fairly high feed rate. The feed rate on this cut is 2 m per minute and the speed of the spindle is 15,000 rpm. This particular cut makes a 20 mm wide slot slot slot through the 6061 aluminum, which is 12 mm deep. mm deep. mm deep. In order to make this slot, it needs to make circles make circles make circles that count for the width of the bit as well.

_Signals: toolpath:2 · params:3_

### Tip 3 — confidence 0.41

> And so, the radius of the circle is only about 6

And so, the radius of the circle is only about 6.8 mm. Maintaining Maintaining Maintaining velocity of 2 m per minute on on circles with a radius of 6.8 mm drives up the junction acceleration. junction acceleration. junction acceleration. The junction acceleration that can be adjusted on adjusted on adjusted on on the controller is entirely dependent on the mechanics on the mechanics on the mechanics of your machine. of your machine. of your machine. My machine My machine My machine has a fairly large gantry that weighs over 100 lb.

_Signals: params:2_

### Tip 4 — confidence 0.42

> The maximum junction acceleration that your machine will tolerate can be determined through trial and error

The maximum junction acceleration that your machine will tolerate can be determined through trial and error. If your cut If your cut If your cut exceeds its exceeds its exceeds its its ability to accelerate around it at junction, junction, junction, then you'll lose steps, and you can hear that. I had to adjust the junction acceleration on Build Bot controller from the default, which is 200,000 mm per minute squared, up to 800,000 mm per minute squared. minute squared. minute squared. I also adjusted the max deviation on the same settings page on the Build Bot controller.

_Signals: params:2 · howto:1_

### Tip 5 — confidence 0.41

> From I adjusted it from 0

From I adjusted it from 0.1 mm to 0.2 mm. This allows the the the machine to deviate slightly from the path and round out the curves a little bit, reducing the junction acceleration around the junction. Finally, I set my max excel on the X and Y axis Y axis Y axis to 10 km per minute squared and the max jerk to 2,000 km per minute cubed. Thanks for watching and don't forget to check us out at theobotics.com. As always, likes and shares are greatly appreciated.

_Signals: params:2 · safety:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-28tRDf22www-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `mill`
- Source artifact: `state/shared/youtube-extraction/28tRDf22www.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].