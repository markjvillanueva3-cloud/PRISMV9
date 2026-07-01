---
title: "Programming a M97  HAAS CNC lathe Z- Axis Live Tooling drilling example"
domain: lathe
source: youtube
videoId: 2ofXznnpuaQ
url: https://www.youtube.com/watch?v=2ofXznnpuaQ
channel: "Tim's Tractors & More!!"
duration_s: 771
tribal_entries: 6
chunks_scanned: 14
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Programming a M97  HAAS CNC lathe Z- Axis Live Tooling drilling example

**Channel:** [Tim's Tractors & More!!](https://www.youtube.com/watch?v=2ofXznnpuaQ)
**Duration:** 12m 51s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 6 of 14 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.41

> I actually did a video prior to this one explained where an m97 explained where an m97 explained where an m97 code is an

I actually did a video prior to this one explained where an m97 explained where an m97 explained where an m97 code is and how I wrote that there are multiple ways you can do this in this example this one might get kind of tricky definitely a more advanced video I wouldn't say for a beginner because it might take a while to wrap your head around this okay let's see if I can explain this without screwing it up let's say you have a piece of stock and this is for lathe you want to drill a hole but you have to do it off-center so this is centerline right here and let's say you want to drill a hole

_Signals: camOps:2_

### Tip 2 — confidence 0.47

> in X 3/4 of an inch so it's 750 off-center line and you want at least an inch deep doesn't it say it doesn't have to be 

in X 3/4 of an inch so it's 750 off-center line and you want at least an inch deep doesn't it say it doesn't have to be perfect at least an inch deep and for this example let's just say we're using I don't know a quarter 1/8 inch drill let's just say we're using we're kind of right this part right here 1/8 inch drill because I use that a lot and some of the parts I used to do here's were on older machines this came in real handy I figure it out after a few years the newer machines probably already have a can cycle for this but back then I didn't have that luxury I had to figure out a way to

_Signals: camOps:2 · params:2_

### Tip 3 — confidence 0.44

> do this without writing so many lines of code and you know wrap it in wrap it out wrap it in drill wrap it out just the 

do this without writing so many lines of code and you know wrap it in wrap it out wrap it in drill wrap it out just the pectoral to remove the chips so I found a way and this is going to hopefully help you guys out if you have live tooling tooling tooling on your lathe so I'm using the n97 call for this and I wrote it up kind of because I'm losing daylight here and hopefully this video quality is good so let's say you came up you found your location you pick the spot you want to drill you did m-19 code and I did that a previous video and let's say the m-19 code and 45 degrees so you'd have

_Signals: camOps:2 · params:1_

### Tip 4 — confidence 0.44

> your m-19 our forty five point zero zero zero or it could be a P so okay this is this forward it gets a little kind of c

your m-19 our forty five point zero zero zero or it could be a P so okay this is this forward it gets a little kind of crazy I tried to save a lot of code writing so what I did was I rapid 1/2 inch in front of the face turned on my life tooling which was at 133 unlesss a 3000 RPM that was the max rpm I don't know if they're quicker now but that's what it was back then then then and now I'm gonna wrap it down to my dimension of X point 750 z point 0 5 so I'm 50 thousandths in front of the faced part and let's just say well whoops let's say we turn on the coolant right here now this is where

_Signals: camOps:1 · params:2_

### Tip 5 — confidence 0.44

> this is where so I came up W Co Nam ravening 1

this is where so I came up W Co Nam ravening 1.1 inches that way coming out so it looks like a lot of wasted space but it happened so fast you know it's it's minuscule as far as the time you lose because I want to make sure I'm happening far enough out because it's almost acting like a sliding ruler with every succession as far as going in you just want to make sure your drill bit is coming out far enough to clean out the chips because the farther and farther you go in you have to make sure it comes out and clean off everything or you're gonna snap the drill and will leave me I did so it's

_Signals: camOps:2 · params:1_

### Tip 6 — confidence 0.46

> 19 a reads the 19 which tells it to loop back to this right here so this is going to consistently keep going to here so 

19 a reads the 19 which tells it to loop back to this right here so this is going to consistently keep going to here so it's going to do these three lines of code and repeat back up to here 15 times but just remember you're the last time it does is file a Peck the drill is going to still be inside that hole so what we have to do you have to top once that is all completed I want it to complete the jump down to this line right here line 13 so p1 3 so that tells me I want to make sure that it actually pulls the drill bit out of the part one inch in front of the face and it turns off the live

_Signals: toolpath:1 · camOps:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-2ofXznnpuaQ-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/2ofXznnpuaQ.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].