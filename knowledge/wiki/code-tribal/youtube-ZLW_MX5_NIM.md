---
title: "The Essential Macro Video - Intro to CNC Macros and Subprograms - Haas Tip of the Day"
domain: general
source: youtube
videoId: ZLW_MX5_NIM
url: https://www.youtube.com/watch?v=ZLW_MX5_NIM
channel: "Haas Automation, Inc."
duration_s: 1229
tribal_entries: 5
chunks_scanned: 29
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# The Essential Macro Video - Intro to CNC Macros and Subprograms - Haas Tip of the Day

**Channel:** [Haas Automation, Inc.](https://www.youtube.com/watch?v=ZLW_MX5_NIM)
**Duration:** 20m 29s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 29 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.45

> get used by different programs our m98 code can reach out and grab that external sub to simplify things for us in this e

get used by different programs our m98 code can reach out and grab that external sub to simplify things for us in this example we are Machining some bearing Pockets into extrusions If This Were a common feature for us we could put all of this code into its own subprogram and call it up from our main program at any XY location that needs this kind of pocket 01 NC is our main program O2 NC is our O2 NC is our O2 NC is our subprogram if we really wanted to make this bearing pocket subprogram call easier for operators we would take that subprogram and give it some kind of nickname an alias to

_Signals: toolpath:2_

### Tip 2 — confidence 0.43

> make it easier to remember and call up now right on our control screen we actually have an alias page where we can do ju

make it easier to remember and call up now right on our control screen we actually have an alias page where we can do just that we renamed our subprogram 0 9000 and then enter 310 as our value our Alias M code name now anytime we command an m310 in our program this 0 9000 subprogram will be called and the Machine will Mill out one of these bearing pockets for us at that XY location and this is super handy if you have repetitive features to make m310 AKA m98 p9000 AKA our bearing pocket sub a simple alias to make things easier like how we refer to Pablo Diego Jose Francisco DEA Juan nepo moeno

_Signals: toolpath:1 · camOps:1_

### Tip 3 — confidence 0.4

> both ends clean up completely is to take an even amount off both sides we don't want to be taking taking off a lot of ma

both ends clean up completely is to take an even amount off both sides we don't want to be taking taking off a lot of material on one end and no material on the other so we're going to set our g54 x0 right on the center line of our part in that way we know that we're always going to take an even amount off both sides and that's going to give us our best chance for the part to completely clean up both ends now in the code we will need our tool to move to the right of our Zero by our finished length divided by length divided by length divided by two we need the edge of our tool to be at the

_Signals: safety:1 · howto:1_

### Tip 4 — confidence 0.41

> NC program by entering our needed inputs into our g65 macro call our subprogram will have all of the info it needs to up

NC program by entering our needed inputs into our g65 macro call our subprogram will have all of the info it needs to update our tool path and run this part now when we ask to make a longer part all we'll have to do is adjust a variable on our macro call press cycle start and we are Machining the macro sub program makes all of our adjustments for US based on these these these inputs this is very different than an m98 subprogram call those subprograms are written in stone they are immovable they're unchangeable they're only good for one particular feature and again we want to make not one part

_Signals: toolpath:1 · howto:1_

### Tip 5 — confidence 0.44

> our subprogram pulled something off of a shelf and that shelf was empty it could crash our could crash our could crash o

our subprogram pulled something off of a shelf and that shelf was empty it could crash our could crash our could crash our program a lot of times my subprograms all write a macro statement to make sure that somebody wrote something to that shelf location an if statement if pound 4 equals pound 0 then and pound 3000 equals 10 alarm out pound 3000 is a macro statement that we can create our own own own alarm pound zero is a really unique variable it's not a variable it's not a variable it's not a regular local variable it's not 1 through 33 pound zero is not a number and you can see that in

_Signals: safety:3 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-ZLW_MX5_NIM-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/ZLW_MX5_NIM.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].