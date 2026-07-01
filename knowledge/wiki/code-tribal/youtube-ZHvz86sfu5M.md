---
title: "Programming Dual Spindle CNC Lathes in Fusion 360!"
domain: lathe
source: youtube
videoId: ZHvz86sfu5M
url: https://www.youtube.com/watch?v=ZHvz86sfu5M
channel: "NYC CNC"
duration_s: 862
tribal_entries: 7
chunks_scanned: 29
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Programming Dual Spindle CNC Lathes in Fusion 360!

**Channel:** [NYC CNC](https://www.youtube.com/watch?v=ZHvz86sfu5M)
**Duration:** 14m 22s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 29 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.4

> tool life improves parting tool life improves parting tool life and it lets us run these walk away and come back when th

tool life improves parting tool life improves parting tool life and it lets us run these walk away and come back when they're done much better workflow than having to run a second operation to properly clean up and machine and machine and machine that back side the first step is not in our part file but rather in this master template and we'll have this available cart here to download with the file open we're going to activate our part placeholder component right click on our actual part file and insert into current design click ok click ok click ok enable the visibility on our stock main

_Signals: howto:5_

### Tip 2 — confidence 0.48

> visibility to visibility to visibility to not the front of the stock but rather that origin right behind it click ok we'

visibility to visibility to visibility to not the front of the stock but rather that origin right behind it click ok we're also going to measure our part this is one of the few manual processes processes processes that you have to do we click the front face hold shift and click the back face we can see it's we can see it's we can see it's 0.925 inches 0.925 inches 0.925 inches click on your fx or user parameters you don't have that up don't have that up don't have that up there you can pin it to your toolbar in part length we're going to say negative 0.925 negative 0.925 negative 0.925 and a

_Signals: params:3 · howto:4_

### Tip 3 — confidence 0.4

> couple other variables that we need to change here what is the stock that we're using that we're using that we're using 

couple other variables that we need to change here what is the stock that we're using that we're using that we're using we'll say one inch you'll notice that parametrically updates really cool parametrically updates really cool parametrically updates really cool the main stock length we'll say two inches this is how far out the raw material is sticking and i generally do not change the 15 000 of main spindle and sub spindle part off part off part off and that 15 000 is the distance between the front of the part and the front of the raw material so it's how much it's going to turn off when we

_Signals: camOps:1 · howto:2_

### Tip 4 — confidence 0.43

> middle of this face and if we look at the distance between the front of our part in the back part in the back part in th

middle of this face and if we look at the distance between the front of our part in the back part in the back part in the back it's 0.35 2.65 it's 0.35 2.65 it's 0.35 2.65 so about 0.45 inches looks fine you'll also need to also need to also need to input the width of your parting tool if you use the same parting tool every time you'll never have to change this value though though though and the beauty in this workflow is not only only only does it give you a safe and reliable easy way to program dual spindle parts but many turning features and parts are really conducive to automated or

_Signals: params:1 · safety:1 · howto:1_

### Tip 5 — confidence 0.42

> we got our machine about a year ago we set those we have never had to change them yet which is them yet which is them ye

we got our machine about a year ago we set those we have never had to change them yet which is them yet which is them yet which is absolutely awesome so g54 absolutely awesome so g54 absolutely awesome so g54 is the face of our main spindle g55 is the face of our subsidial on the haas lathe to set that g54 offset that we only have to do once we first measure a tool with the tool probe we then bring that tool up to the face of the collet of the collet of the collet we used a piece of paper so that we weren't actually touching the cutting tool of the collet face with the g54 z-axis value z-axis

_Signals: safety:1 · howto:3_

### Tip 6 — confidence 0.42

> file makes it really quick if you're trying to change a fillet or a chamfer or a feature or a whole depth to not have to

file makes it really quick if you're trying to change a fillet or a chamfer or a feature or a whole depth to not have to go find files save other files etc really like that feature i'm also a big fan of comments so you can see this can see this can see this both these setups are littered with comments i've got a reminder to myself here to update the part length again that's something you really don't want to forget to do with this workflow i've got a couple of manual nc's just to make sure the b-axis make sure the b-axis make sure the b-axis is clamped that way the machine doesn't give an

_Signals: camOps:2 · howto:1_

### Tip 7 — confidence 0.4

> of how many different versions and variations in machines and brands and models and setups and so forth so inevitably i 

of how many different versions and variations in machines and brands and models and setups and so forth so inevitably i think we're going to have to continue to have a small amount of g-code over time but again the great thing about this is that other than adjusting the parts catcher location value location value location value that code never has to change two final important workflow tips number one try not to save not to save not to save over your master template when you're forking it off to work on an individual part file so we'll do that by just going to file save as and rename it

_Signals: safety:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-ZHvz86sfu5M-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/ZHvz86sfu5M.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].