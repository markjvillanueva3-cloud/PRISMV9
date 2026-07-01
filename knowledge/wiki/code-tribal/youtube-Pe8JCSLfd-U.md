---
title: "Finding the spindle speed for a lathe"
domain: lathe
source: youtube
videoId: Pe8JCSLfd-U
url: https://www.youtube.com/watch?v=Pe8JCSLfd-U
channel: "IMAT "
duration_s: 349
tribal_entries: 4
chunks_scanned: 8
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Finding the spindle speed for a lathe

**Channel:** [IMAT ](https://www.youtube.com/watch?v=Pe8JCSLfd-U)
**Duration:** 5m 49s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 4 of 8 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.41

> so in this video we want to talk to you about setting your correct rpms or your speed for your lathe there will be anoth

so in this video we want to talk to you about setting your correct rpms or your speed for your lathe there will be another video later on on how to do it for the mill and it's pretty much the same thing but we're gonna kind of kind of break it down for just the lathe right now and then we'll break it down for the mill later on so everything comes down to this equation I don't know if you guys have seen this in multiple places you'll see them on the back of business cards or all over the Internet and that's how to find the speed that you need to be running act nowhere anywhere I mean I've been

_Signals: camOps:2_

### Tip 2 — confidence 0.42

> different next is this 3

different next is this 3.8 - that's just a constant number you can supplement this with a four if you'd like but I find the numbers work out a little bit better if we actually use that 3.8 - okay always going to stay the same you sometimes will see it written as just a four next is your DIA or diameter this would be the diameter of your part so if you're working on a part that is one-inch you're gonna put a 1 here so let's rewrite this 4 if we were working with a carbide bit on a 1 inch diameter part and it's all it's going to be is we're going to do 250 surface beat multiplied by 3 point 8 2

_Signals: params:1 · safety:1_

### Tip 3 — confidence 0.44

> divided by 1 inch okay so very quickly what is 250 multiplied by 3 point 8 2 9 5 5 so we could rewrite this as make that

divided by 1 inch okay so very quickly what is 250 multiplied by 3 point 8 2 9 5 5 so we could rewrite this as make that look like a 5 and then we're gonna just so it's 955 divided by 1 inch diameter which is pretty easy in your head you compare the snout being 955 rpms so your answer would be 950 okay let's do it again let's this time let's do some tool steel really quick and then maybe we'll do one more after that more after that more after that so let's do a service fee per minute for tool steel is 100 so we're gonna do it 100 multiplied by 3 point 8 2 divided by let's say 1.5 so if I it

_Signals: params:3_

### Tip 4 — confidence 0.47

> ruin the bit so let's do one more with carbide because that's that's what we're going to be using most of the time aroun

ruin the bit so let's do one more with carbide because that's that's what we're going to be using most of the time around here let's do it and let's do it with a 2-inch piece of stock so give me 250 surfaceview per minute multiply it by 3 point 8 2 / 2 inches or 2 inches pretty much so that one will equal 955 there's a 77 there's a 77 / - is 4 7 7 point 5 4 7 7 477 rpms ok now if anything I want you to take away from this particular equation is it's going to get you close I don't think if you go over to our lives right now there is no 477 RPMs on there but there is a 490 and I believe there's

_Signals: params:4_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-Pe8JCSLfd-U-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/Pe8JCSLfd-U.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].