---
title: "Screw cutting on a CNC Lathe using G76 code"
domain: lathe
source: youtube
videoId: iTHKdPwrAUg
url: https://www.youtube.com/watch?v=iTHKdPwrAUg
channel: "Practical Machinist"
duration_s: 413
tribal_entries: 1
chunks_scanned: 1
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Screw cutting on a CNC Lathe using G76 code

**Channel:** [Practical Machinist](https://www.youtube.com/watch?v=iTHKdPwrAUg)
**Duration:** 6m 53s
**Domain:** `lathe` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 1 of 1 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `lathe`.

### Tip 1 — confidence 0.46

> hello my name is Mark and I am G co2 tutor I run a series of courses teaching how to program CNC machines using anak G c

hello my name is Mark and I am G co2 tutor I run a series of courses teaching how to program CNC machines using anak G codes so in this lesson working with Pratt school machinist I'm here to show you how the g76 Fred turning operation works so let's take a dive into this line of code and see what each part does so this is what a typical two line g76 code would look like to produce a screw thread on a piece of bar or material inside a CNC lathe now we're going to cut a 20 millimeter by 1.5 a fret so this time we're going to use metric most machinist work in both Imperial and metric due to the fact that American companies and European companies often share the same space when we're making parts for our products so bear in mind we are working in metric on this particular operation so just by glancing at these two lines of code it looks a bit jumbled there's a lots of different features in here lots of different words such as P words and key words so we're going to go over each section word by word and decipher what this means and how we can use it within our programs so the first thing we come across is our g76 code this is one of the screw cutting cycles available to us using Fanuc g codes so g 76-thousand machine we're going to be screw cutting so the next word we come across is this p number now this P code actually tells Machine three different lots of information the first po4 is the amount of spring cuts that we wish to do once the thread is to death so this is how many extra passes we would do once we stopped indexing in our turrets so with a full depth of fret this is used to clean up thread to get rid of any burrs and any chattering and give us a good surface finish it also helps increase accuracy so in this case I'm using for spring passes following on this we have a 0-0 this is the angle of shampoo at the end of the thread it's our run-out angle and the last two digits here is our angle of fret this is the inclusive angle of a teeth on our screw thread it's also the angle of our tools that we cuts the material to produce these teeth produce these teeth produce these teeth so where we're using a metric thread at this time we're using a sixty degree angle a thread if we were cussing imperial more than likely we'll be looking at a 55 degree and this leads us on to our key value now how cute values change meanings often for our G codes but in the case of the first line of the G 76 Fretilin cycle the Q value here is the minimum depth of cuts now as we produce our screw thread we start off by taking larger cuts and the machine will automatically calculate the depth of cuts i will decrease as we get near our core diameter so listen number is the smallest cut we will take white producing our screw thread and this is displayed in microns so a minimum cut of point zero three millimeters would be 30 microns so our value here would be Q 30 now for those of you as more used to Imperial measurements 30 microns is slightly larger than a thousandth of an inch a thousandth of an inch is 25.4 microns if this was emitted the machine could well go right down and start taking point zero zero one of the cuts and it would take us forever to produce our thread so he put a minimum depth of cut to ensure this doesn't happen our is often used to mean radius within G code but these words often change dependent on the operation we are doing in this case R is our finishing allowance in other words the amount of material we leave on for our finishing pass so that's the end of the first line of the two lines seventy-six commands now we can do this using just one line of code but the two line of code is much preferable because we can give it a lot more information and give us more control over producing our frets so again on the next line G 76 is where we start off that's how this just tells machine we're continuing on the G 76 Fred turning cycle and to expects any command that follows this to be part of that cycle the first thing we do on this line is to define the core diameter of our Fred our Fred our Fred so our Fred called so our Fred called so our Fred called mata is 18 point two millimeters this would be our final depth of cuts the next position we give it is our end points of our threat now I'm using the front face of our part as the zero position our datum position so Z minus 18 millimeters would give us an 18 millimeter deep threat now as I said on the first line piece Q's and ours and different word values often mean different things in G code in this particular case our p6 hundreds of words means 600 microns depth of threads and this is radial this is just one size of our screw thread so this is stated in microns so the depth afraid is not point six millimeters each side but we write this in microns so it's p600 now in order for our controls to work out how deep to take each cuts of our thread we need to give it a first depth of cut and a final depth of cuts then we've already done our final depth of cuts or minimum cuts in our first line here so our first step of cuts we define with the second Q value in the second line so I've decided our first step of cuts it should be not two points one six millimeters and our final depth of cuts should be north point naught 3 millimeters so a key value of 160 that's 160 microns that gives us a depth of our first card at Northpoint 1 6 millimeters and then the Machine will calculate and reduce this roll the way down to Northpoint not three millimeters for its final cuts and finally we define the pitch of our thread now for this we use F which is our feed rate command and we give it a value of 1.5 millimeters now this is the pitch of an M 20 thread so that concludes this short lesson on how to use the G 76 to line screw fret cycle on a Fanuc g-code machine to learn more about programming with g code on both milling machines and CNC lathes please pop over to my web site at Chico to tutor comm where there is loads of free less less less sins and articles and a free mini-course to sign up to get you going to learn about this fascinating world of programming with G code

_Signals: camOps:1 · params:1 · howto:5_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-iTHKdPwrAUg-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `lathe`
- Source artifact: `state/shared/youtube-extraction/iTHKdPwrAUg.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].