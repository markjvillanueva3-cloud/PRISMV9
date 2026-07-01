---
title: "Loading Tools? ALWAYS Do This First - Boring Bars and Probes - Haas Tip of the Day"
domain: general
source: youtube
videoId: xcfVhNQQVcU
url: https://www.youtube.com/watch?v=xcfVhNQQVcU
channel: "Haas Automation UK"
duration_s: 645
tribal_entries: 5
chunks_scanned: 16
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Loading Tools? ALWAYS Do This First - Boring Bars and Probes - Haas Tip of the Day

**Channel:** [Haas Automation UK](https://www.youtube.com/watch?v=xcfVhNQQVcU)
**Duration:** 10m 45s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 16 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.41

> of the day because it's such a common topic right anyone who's around a hostile loads tools every setup guy programmer a

of the day because it's such a common topic right anyone who's around a hostile loads tools every setup guy programmer and some operators are loading tools but what we saw earlier with that unnamed set up guy putting the tools in was actually pretty bad some bad things were happening number one he was loading up a large tool and he had not yet designated it as a large tool on the pocket tool table if you've got two large tools next to each other in the carousel they might bump into each other and jam things up then you have to go through an entire recovery process so we've made an entire

_Signals: toolpath:1 · howto:1_

### Tip 2 — confidence 0.43

> insert off of the wall so typically a Q point zero one ten thousandth of an inch is plenty that's that's more than enoug

insert off of the wall so typically a Q point zero one ten thousandth of an inch is plenty that's that's more than enough now on a boring head like this this is a M it's actually a really cool boring tool by seco this is this is like a bulletproof tool it's through spindle coolant it also has these key ways in here to make sure the tool is oriented and locked perfectly in the direction that it's at always so we're not we're not we're not holding this in an ER call it it's built into the holder but if I load this boring tool into my spindle it's always gonna face at m-19 spindle orientation

_Signals: safety:2_

### Tip 3 — confidence 0.43

> it's gonna face this insert towards the operator operator operator that's the y- direction so in this case with this bor

it's gonna face this insert towards the operator operator operator that's the y- direction so in this case with this boring head with this boring head with this boring head we need to retract in the Y positive direction at the bottom of the hole so how do we accomplish this well right off the bat we've got to get rid of the Q value on our g76 line if there is a Q value on your g76 line whether you've got anything else on there it's gonna always retract to the default setting twenty-seven direction which is X positive which which might break this tool if it's got a large value so Q always

_Signals: safety:2_

### Tip 4 — confidence 0.4

> to make sure that this all happens that it all works out my personal opinion is that it's always a setup guys fault so t

to make sure that this all happens that it all works out my personal opinion is that it's always a setup guys fault so the person who is actually putting that boring head that boring tool into the spindle should be responsible for making sure that insert is facing the right direction again typically on a hospital fault it should be facing left but with a special tool that must be faced in a certain direction direction direction it's the setup guys responsibility to make sure that make sure that make sure that the program gets adjusted either they need to adjust it or they have to go back to

_Signals: safety:1 · howto:1_

### Tip 5 — confidence 0.43

> press m-19 I watch orient and I load this tool the probe into the spindle and I always always load it with the Haas logo

press m-19 I watch orient and I load this tool the probe into the spindle and I always always load it with the Haas logo towards me towards the operator now why is this manner because at some point this probe is gonna be taken out of the machine you're gonna be changing the batteries where you need an extra extra pot in the machine to put a tool in and when that tool goes back in you want to put it back in the same way you pulled it out because during the calibration process a cycle is run and it decides how far is this probe off center in the X and it puts that value into macro variable five

_Signals: safety:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-xcfVhNQQVcU-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/xcfVhNQQVcU.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].