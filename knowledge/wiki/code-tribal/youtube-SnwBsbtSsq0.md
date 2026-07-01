---
title: "G96 and G97 on a CNC Lathe (Surface speed and RPM)"
domain: lathe
source: youtube
videoId: SnwBsbtSsq0
url: https://www.youtube.com/watch?v=SnwBsbtSsq0
channel: "CNC Training Centre"
duration_s: 504
tribal_entries: 5
chunks_scanned: 9
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# G96 and G97 on a CNC Lathe (Surface speed and RPM)

**Channel:** [CNC Training Centre](https://www.youtube.com/watch?v=SnwBsbtSsq0)
**Duration:** 8m 24s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 9 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.48

> g97 g97 g96 means we're going to use a surface speed which is designated in g96 and g97 g97 g96 means we're going to use

g97 g97 g96 means we're going to use a surface speed which is designated in g96 and g97 g97 g96 means we're going to use a surface speed which is designated in m per minute and minute and minute and g97 means we're just going to use a speed in normal speed in normal speed in normal RPM so if we type in a command g97 g97 g97 S500 M3 you'll get a speed of, 1500 RPM but if you program g96 S180 M3 you're now starting your spindle at 180 m a minute which means it will calculate its speed from where the machine is sitting at that point so that's why when you hear a CNC running a CNC lath that is the

_Signals: params:1 · gcode:2_

### Tip 2 — confidence 0.4

> spindle you will hear gradually increase and decrease as the tool goes in and out as it's Machining so let's watch this 

spindle you will hear gradually increase and decrease as the tool goes in and out as it's Machining so let's watch this part Machining this is a big diameter part so when this part's Machining when it's there on the outside it's going to be going quite slow but as we get towards the inside obviously the RPM needs to be quite fast quite fast quite fast and if you think when we get to the center the machine almost needs to be flat out and this is where a G50 would come in to clamp the speed so we've got nothing really dangerous happening nothing really dangerous happening nothing really

_Signals: gcode:1_

### Tip 3 — confidence 0.42

> it we don't use it obviously on drilling because we're in the center of the part and we don't use it on threading becaus

it we don't use it obviously on drilling because we're in the center of the part and we don't use it on threading because obviously in threading it's going to be the same speed all the while but on turning we would almost always use it because that diameter varies if you've got a part that's you just turn in one diameter or something like that you might want to just lock it in at g97 with an RPM and just leave it alone but generally alone but generally alone but generally speaking you will use it the other thing I will say is when you send the turret home it's probably best when you get

_Signals: camOps:1 · safety:1_

### Tip 4 — confidence 0.41

> before you send the turet home to just lock it back into lock it back into lock it back into g97 because you don't reall

before you send the turet home to just lock it back into lock it back into lock it back into g97 because you don't really want the motor going up and down in RPM as your turret's going back and forward from um its tool change position um into cut because there's no actual reason for that so you could pitch it at like a th000 revs or something just put a g97 s1000 M3 which will start your spindle and everything and then when you get ready to come into cut that's when you apply it and when you finished cutting you can just take it off again so what I'm going to do now is show you a few

_Signals: gcode:1 · howto:1_

### Tip 5 — confidence 0.44

> divided by 1,000 which will give you 942 then your speed in RPM will be your surface speed divided by the by the by the 

divided by 1,000 which will give you 942 then your speed in RPM will be your surface speed divided by the by the by the circumference so we've got a surface speed of 180 m a minute we divide into that that that the the the 942 which you've got here and that gives us us us 191 RPM so on a 300 mm diameter we will get 191 RPM if our surface speed is 180 m a minute surface speed is 180 m a minute the diameter is 60 the diameter is 60 the diameter is 60 the circumference will be 60 * piun which is 60 * which is 60 * which is 60 * 3142 which is 3142 which is 3142 which is 188.50 to and then your

_Signals: params:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-SnwBsbtSsq0-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/SnwBsbtSsq0.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].