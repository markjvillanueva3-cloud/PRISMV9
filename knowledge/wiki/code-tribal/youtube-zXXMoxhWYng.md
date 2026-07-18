---
title: "The ULTIMATE CNC Router Feed and Speed Calculator | Online CNC Router Course Sample Lesson"
domain: general
source: youtube
videoId: zXXMoxhWYng
url: https://www.youtube.com/watch?v=zXXMoxhWYng
channel: "Dan Lee Boatbuilding"
duration_s: 885
tribal_entries: 6
chunks_scanned: 24
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# The ULTIMATE CNC Router Feed and Speed Calculator | Online CNC Router Course Sample Lesson

**Channel:** [Dan Lee Boatbuilding](https://www.youtube.com/watch?v=zXXMoxhWYng)
**Duration:** 14m 45s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 24 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.41

> have four flutes removing one chip per Revolution this would take our chip size down to 0

have four flutes removing one chip per Revolution this would take our chip size down to 0.025 mm in order to maintain a chip size of 0.1 mm with a four flute cutter we would either need to run it at four times the feed rate or reduce our spindle to one4 of its current RPM in order to account for the additional flutes so you can see how the flute count of our cutter also plays a large part in this equation machine rigidity now I have used a lot of different feed and speed calculators over my time there are some really good ones out there but my main issue with most of them is that they miss

_Signals: params:2_

### Tip 2 — confidence 0.43

> built this with sliders is it allows you to just slide these numbers around and they will in real time affect your outpu

built this with sliders is it allows you to just slide these numbers around and they will in real time affect your output numbers down the bottom here so you can see that as we drop our spindle RPM our recommended feed rate is also reducing we've then got flute count which runs from 1 to four so I'm going to start off with a two flute cutter there which is probably the most common thing that I'll use and then I'll come to Cutter diameter and we'll set that we'll set that we'll set that 6.5 the machine rigidity scale now this is something that I can pretty well guarantee you've never seen on a

_Signals: safety:1 · howto:4_

### Tip 3 — confidence 0.43

> they're going to stay put I would wind that down so my recommendation for the machine and fixture rigidity scale would b

they're going to stay put I would wind that down so my recommendation for the machine and fixture rigidity scale would be to air on the side of caution if you're not entirely confident in your machine and its rigidity slide this scale down and that's going to play things on the safe side you can always then increase it further on and in time if you're using this feed and speed calculator a lot you'll get used to what your machine is on that scale so we'll start with that in the center we'll go with three for now and we'll just look at our output here and see what we're getting so you can see

_Signals: safety:2_

### Tip 4 — confidence 0.41

> that on our output side of things we get a spindle RPM here and this is just mirrored from our slider up the top so we'v

that on our output side of things we get a spindle RPM here and this is just mirrored from our slider up the top so we've got quick confirmation of what our spindle RPM is you can see we've then got a recommended feed rate in millimeters per minute so this is reading this is reading this is reading 10,865 mm per minute and then a recommended cut depth of 6.7 mm so let's look at how these tweak a little bit we're running solid carbide as our cutter we've got a machine and fixture rigidity of three around about the middle of the scale and that's given us a cut depth of approximately 1 times our

_Signals: params:2_

### Tip 5 — confidence 0.41

> Cutters diameter if we scale that up to a fully rigid machine and fixture you can see that we can actually push that cut

Cutters diameter if we scale that up to a fully rigid machine and fixture you can see that we can actually push that cut depth to approximately two times our Cutters diameter and as I mentioned there are a few little tweaks that I've put in here just to get these output figures to what I actually recommend you run with so we'll go down to a single flute flute flute cutter we'll go for a 10 mil bit and we're going to go at 18,000 RPM so that gives us a recommended feed rate at 5,500 mm a minute now I mentioned earlier on in this video that if we wanted to maintain the same chip load and we

_Signals: params:2_

### Tip 6 — confidence 0.41

> went from a single flute cutter to a four flute cutter we would need to feed at four times the rate in order to maintain

went from a single flute cutter to a four flute cutter we would need to feed at four times the rate in order to maintain the same chip load size so we'll see how that works here we'll go from a single flute cutter at 5,500 mm a minute we'll take that up to a four flute cutter and you can see with just a little touch under 22,000 mm a minute so that applies there in comparison to our flutes and if we dial that down you can see how that recommended feed rate changes on the same vein if we went up to a four flute cutter but we wanted to keep our feed rate the same as I also previously mentioned

_Signals: params:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-zXXMoxhWYng-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/zXXMoxhWYng.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].