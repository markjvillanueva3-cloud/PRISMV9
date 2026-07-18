---
title: "Sodick IntelliQvic: IQ Solid to 4 Axis wire edm - die example"
domain: wedm
source: youtube
videoId: eIljdNiDadA
url: https://www.youtube.com/watch?v=eIljdNiDadA
channel: "GreentweenVideo"
duration_s: 525
tribal_entries: 7
chunks_scanned: 12
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Sodick IntelliQvic: IQ Solid to 4 Axis wire edm - die example

**Channel:** [GreentweenVideo](https://www.youtube.com/watch?v=eIljdNiDadA)
**Duration:** 8m 45s
**Domain:** `wedm` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 12 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `wedm`.

### Tip 1 — confidence 0.4

> blending down I should say down into that bottom you shape at the bottom put an ISO view here so first up here v2 up her

blending down I should say down into that bottom you shape at the bottom put an ISO view here so first up here v2 up here v2 up here v2 going to feature recognition contour extraction and it finds the model is one point one inches one point one eight inches thick and for our extraction we will we can leave it on all which it'll find the outside shape which is okay or you could say die and it'll just find this inside shape which would work fine we'll put on all just to show you what that happens so finds the inner shape and the outer shape the inner shape they list some here in the bottom left

_Signals: toolpath:1_

### Tip 2 — confidence 0.41

> what it found its found this he be different which is for axis it's ten elements that's the green one right now on the s

what it found its found this he be different which is for axis it's ten elements that's the green one right now on the screen and then I found the contour to axis this is gonna be your punch shape see if it slides over so you get your to access punch shape if you were going to cut the outside shape you know cut it out of a block out of a block out of a block square block or something it finds the outer shape too so we won't end up necessarily needing to program that that's what happens when you leave this on all it'll find all the inners and all the outers so we could delete this one if we

_Signals: toolpath:1 · howto:1_

### Tip 3 — confidence 0.41

> don't need it right now but it's okay if it's there it's not going to give us a problem because you'll see on the next p

don't need it right now but it's okay if it's there it's not going to give us a problem because you'll see on the next page we could we would have to turn it on to program it so before we go on to the programming page I need to put a start hole we put this in a top view we need to put a 2d try drawing input a starting hole and I'm gonna put it at zero zero here zero zero here zero zero here draws in my little white start hole next step is machining path path generation and you can see here's my two features listed the four axis one die and two axis punch so the first one is check mark just

_Signals: camOps:2_

### Tip 4 — confidence 0.4

> cuz it's at the top of the list if I wanted a program one or the other I can put a check mark here which one I want to p

cuz it's at the top of the list if I wanted a program one or the other I can put a check mark here which one I want to program so I'm gonna do the two axes die first and I'm gonna pick automatic no I'm gonna leave automatic off the time so I'll show you what that does then we will do generate path pick our power settings so this is set right now for one point one point eight inches thick maybe the flush cups are gonna be open top and bottom and I'll make three pass technology I'll leave it on this rougher finish so it's three paths you have finer finished possibilities with the ALM machine

_Signals: camOps:1 · howto:2_

### Tip 5 — confidence 0.41

> generation so what did I ask it for me for here's at the bottom left to specify the starting hole so I got to click that

generation so what did I ask it for me for here's at the bottom left to specify the starting hole so I got to click that circle we made before and now it says click the entry element so on on the circle you know or on the shape that you want to cut you've got to click on some see how this highlights and a little flat it's lit up I'm on the circle that light when I move my mouse around it lights up stuff that I can click on so I could click on the circle like that and that's where it goes to for the leading light and it's completed here's our little glue tab up here the tab with and the Rideau

_Signals: howto:6_

### Tip 6 — confidence 0.41

> the avoidance distance right there so next step is to and here's how the four acts blended in you know they'd found all 

the avoidance distance right there so next step is to and here's how the four acts blended in you know they'd found all the elements from the surfaces top to bottom the way it was made in this the solid model was made follows what's their next steps that create the NC code convert to NC put a name in here sample let's call it four and hit convert but now there's convert parameters here what that allows you to do is go into here and you have your stop codes if you don't want to have the stop codes you can always say no to stop codes or change them into mo ones if you want to be able to switch

_Signals: safety:1 · howto:2_

### Tip 7 — confidence 0.42

> it on and off at the controller with an mo one while you're running you can turn Emma ones on and off there's a button f

it on and off at the controller with an mo one while you're running you can turn Emma ones on and off there's a button for that or if you simply want to make sure it stops or if you want to have a /m you have some choices on how you want to stop and after the cutoff so what that means is it's gonna rough cut when it goes to cut it off you want that extra stop where you would pull the slug out you could say no or yeah give me another n00 there or two possibly okay and it's set up for the move to first starting hole so what this does gives gives you a G zero zero to the first - the to move you

_Signals: camOps:2 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-eIljdNiDadA-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `wedm`
- Source artifact: `state/shared/youtube-extraction/eIljdNiDadA.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].