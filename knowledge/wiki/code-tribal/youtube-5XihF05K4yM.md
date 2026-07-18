---
title: "G & M Code - Titan Teaches Manual Programming on a CNC Machine."
domain: mill
source: youtube
videoId: 5XihF05K4yM
url: https://www.youtube.com/watch?v=5XihF05K4yM
channel: "TITANS of CNC MACHINING"
duration_s: 1592
tribal_entries: 16
chunks_scanned: 30
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# G & M Code - Titan Teaches Manual Programming on a CNC Machine.

**Channel:** [TITANS of CNC MACHINING](https://www.youtube.com/watch?v=5XihF05K4yM)
**Duration:** 26m 32s
**Domain:** `mill` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 16 of 30 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `mill`.

### Tip 1 — confidence 0.52

> shows you that 10 32 threads inside the part and the third one shows the pockets and shows the park complete complete co

shows you that 10 32 threads inside the part and the third one shows the pockets and shows the park complete complete complete so let's actually profile the part with a half inch end mill and come back and actually sham fer actually sham fer actually sham fer drill and tap the 1032 threads one thing I also say is G and M codes what are they G codes actually create action it makes the machines move M codes usually turn things on or off so to turn on the spindle you'd hit M three spindle turns on turn on the coolant m8 shut off the program and xxx stop a sub M 99 and on and on so G codes create

_Signals: camOps:6 · howto:2_

### Tip 2 — confidence 0.46

> movement M codes turn things off and turn things on so now the first step in programming is to actually create a program

movement M codes turn things off and turn things on so now the first step in programming is to actually create a program to create the program I'm gonna hit less program I'm gonna hit o all programs start with the letter O so I'm gonna hit oh I'm gonna look up and see the different programs in there and pick a number that's not being used and I'll pick 300 I'm simply gonna hit enter and boom there it is from that point I hit memory boom it sets over here I hit edit I'm able to toggle around and actually create my program so the first thing I'm going to do is create some space this end the

_Signals: camOps:2 · howto:5_

### Tip 3 — confidence 0.41

> to use that half inch end mill to actually profile around this part right here alright so now let's actually write this 

to use that half inch end mill to actually profile around this part right here alright so now let's actually write this program so the first thing we're going to do is we're going to hit m6 go grab a tool let's do two one and then I'm gonna end of block enter m61 you see this zero if you hit m6 the machine will automatically put the zero in you don't have to hit em zero six just hit em six t1 and the block enter or just enter and the zero will automatically appear so this is telling the machine to go get tool number one which is our half inch end mill next thing we're gonna do is we're gonna

_Signals: camOps:2_

### Tip 4 — confidence 0.41

> negative 0

negative 0.5 Y point to five and then I'm going to turn on my spindle turning on the spindle is m3 and then s with amount of RPMs for how fast you want to actually run that spindle so I'm going to m3 speed four zero zero zero and then watch I'm just gonna press ENTER boom it's up there with my end the block so now that we're in location what do we do next do we do next do we do next let's turn on the coolant while the machine is still up here so that if there's chips in the line they have a chance to flush out so once the tool engages the material you'll be blasting that that that so I'm

_Signals: camOps:2_

### Tip 5 — confidence 0.42

> 250 right there 250 right there 250 right there now as I actually wrap it across here I got to remember there is a radiu

250 right there 250 right there 250 right there now as I actually wrap it across here I got to remember there is a radius corner and it's ten thousandths so what I want to do is I actually want to run all the way across that back in and then stop ten thousand shy from the end of the park so the part is 4 inches once we're in G 1 if the next line is G 1 also you do not have to repeat it so all I'm gonna do is go to location so I'm gonna hit X 3 point 9 9 I'm gonna leave my feed rate alone and I'm just gonna hit enter now we're gonna make that radius right so it's 10 thousandths you're always

_Signals: params:1 · safety:1_

### Tip 6 — confidence 0.48

> Y and the X is in position the Y is just going to move up in the X is gonna stay exactly the same that's why you see me 

Y and the X is in position the Y is just going to move up in the X is gonna stay exactly the same that's why you see me only changing the y so now let's take the turn up here and then I'm gonna ramp off it so we don't leave a line and then I'm going to bring the tool up so g2x point zero one Y point two five radius point 260 enter bone now I'm at the top the top if my why was at 250 I'll be right on that surface so I'm actually gonna ramp off it so I'm going to actually move over an X but I'm gonna lift my Y off the surface so it just gradually ramps off the material so we don't leave a line

_Signals: toolpath:2 · camOps:1_

### Tip 7 — confidence 0.51

> gonna start with the quarter inch chamfer tool number fifteen then we're gonna go to the 177 drill which is the proper d

gonna start with the quarter inch chamfer tool number fifteen then we're gonna go to the 177 drill which is the proper drill size for a roll tap for a 1032 thread and then we're gonna finish it off with a 1032 tap and then I'm going to show you a trick to make it quick and simple and precise so the tools are standardized but I'm actually gonna change the order so we're gonna go to one tool to tool three to four three to four three to four all right so tool 2 is the Sham per mil where we're spotting where the drill is actually going to drill for that top so let's go grab tool number two so m 6

_Signals: camOps:8 · howto:1_

### Tip 8 — confidence 0.44

> t - boom so let's go to location the first hole will do is that point 150 and point 150 so I'm going to go G 0 G 90 G 54

t - boom so let's go to location the first hole will do is that point 150 and point 150 so I'm going to go G 0 G 90 G 54 X point 1 5 y negative point 1 5 m 3 spindle will say 7000 and the block and we go to location we go to location we go to location rapid movement absolute positioning to the g54 fixture to my X&Y location to m3 turned the spindle on to 7,000 rpms let's turn the coolant on let's go grab our tool height offset g43 h2z point 1 and the block bone all right so now I'm going to show you something different than milling this is a can cycle for a drill program so we're gonna go G

_Signals: camOps:2 · params:1_

### Tip 9 — confidence 0.46

> 81 drill with no Peck right just come down boom alright G 98 when you raise back up when the tool raises back up and we 

81 drill with no Peck right just come down boom alright G 98 when you raise back up when the tool raises back up and we go to our initial plane which would be on the G 43 lime if I'd a g 99 it would go to our rapid plane in this case they're pretty much both the same because we win 0.1 so next one is our which is our rapid plane boom boom then we're gonna go depth so it's a 90 degree included angle so if I go a hundred thousands deep that means it makes that diameter twice as big so that would be two hundred for a 1032 thread we're actually gonna build a sham / that's about 0.205 so I'm gonna

_Signals: toolpath:1 · camOps:1 · params:1_

### Tip 10 — confidence 0.46

> go negative point one zero to five and then when I hit feed rate I'm gonna hit 20 point and I'm gonna hit and the block 

go negative point one zero to five and then when I hit feed rate I'm gonna hit 20 point and I'm gonna hit and the block and there you go so now you have your drill program when you raise back up go to your rapid plane or one is your rapid plane z- 102 five is how deep we're going and we're beating at 20 point which is 20 inches per minute the cool thing about rapid is if you were in a pocket and you were way down here you could actually instead of raising all the way up you could keep your are down and actually stay down and be like boom boom boom boom and then raise it up before you hit the

_Signals: toolpath:1 · camOps:1 · params:1_

### Tip 11 — confidence 0.41

> done now here's the trick so I just gave you a drill program and I have three different tools that are doing similar can

done now here's the trick so I just gave you a drill program and I have three different tools that are doing similar can cycles right the drill program is a can cycled and I have three tools that are doing basically the same thing with the same motion okay so watch I'm just gonna come down here right above where I want to start and I'm just gonna copy it and I'm going to paste it two times because most of the information is gonna stay the same so I'm gonna hit f2 I'm going to scroll down boom I'm gonna hit it one again and again now I have three of them right here okay and now I simply have

_Signals: camOps:2_

### Tip 12 — confidence 0.51

> to change my T's andmy h's you always want to make sure that your tea and your H are exactly the same otherwise you can 

to change my T's andmy h's you always want to make sure that your tea and your H are exactly the same otherwise you can crash this machine so this one is now going to be this one's gonna be tool three I'm gonna hit that guy I'm gonna get h3h3 I'm gonna get that guy I'm gonna look at it now we're drilling right so let's change the RPMs a little bit I'm gonna go 5,000 hit that bad boy right back we're using a kettle metal drill so you can actually go three times diameter so it's a pretty awesome drill just to be safe because I'm teaching G&M code I'm actually going to stay a little bit shy so

_Signals: camOps:2 · safety:2 · howto:2_

### Tip 13 — confidence 0.41

> what I'm talking about is this g1 is one movement drilling straight down and coming out G 83 is a drill movement with a 

what I'm talking about is this g1 is one movement drilling straight down and coming out G 83 is a drill movement with a PEC so as you come down you can say go a hundred thousand two hundred thousand three hundred thousand so you can break that chip and get this chip out okay so we're gonna hit G 83 and now I'm gonna leave everything the same but I'm gonna out of Q and the Q is the size of the PEC so boom boom boom so we're gonna do a Q of Q point zero 50 just for safety this kenta mental drill can kill it I just want to be safe alright and we're just gonna insert this guy now t3h 3 although

_Signals: camOps:2_

### Tip 14 — confidence 0.48

> always double-checking boom-boom G 83 boom-boom but how deep am I gonna go so I come over here it says 380 so I'm gonna 

always double-checking boom-boom G 83 boom-boom but how deep am I gonna go so I come over here it says 380 so I'm gonna go 580 so I'll go z- 0.58 so i go deep now and it's gonna Peck 50,000th at a time so now I come down here I hit t4 right there I'm gonna hit 1000 because now we're tapping okay so tool for is a 1032 roll tap ok we got cooling in the machines the roll taps like the heat I'm gonna run it at a thousand rpms I'm gonna leave everything the same but I'm gonna change this to the tapping cycle and that's a G 84 so we're gonna go g8 4 boom we do not want it to hit the bottom so I'm

_Signals: toolpath:1 · camOps:1 · safety:1 · howto:1_

### Tip 15 — confidence 0.41

> gonna say a hundred thousand shy from the bottom so I'm gonna say z- 0

gonna say a hundred thousand shy from the bottom so I'm gonna say z- 0.48 which is a hundred thousandths shy of the depth that the drill went down boom and over here I'm gonna put the exact feed rate when you're tapping there's a calculation it has to be perfect so this is v3 1.25 because I'm a thousand rpms and I have 32 threads per inch on that thread so I hit that guy right there I said I needed my hmit to be identical tea for h2 so let's go h4 boom and we are perfect so now we have - one - two - three - four all dialed now we just have to finish it up right so it's it's thinking about my

_Signals: camOps:2_

### Tip 16 — confidence 0.51

> boom boom I guess see right here where it came up and actually taper it off I can see a drilled hole drill the hole dril

boom boom I guess see right here where it came up and actually taper it off I can see a drilled hole drill the hole drill the hole drilled hole drill hole drill hole drilled drill hole drilled drill hole drilled it looks good and now I have confidence to go to the next level so now I just have to take my tools offset them about six inches off the part and then I'm gonna dry run the entire program to make sure that all the tools function perfectly I'm going to drop my feed rates my rapid and double-check everything to just proof it all out once I've had success we can engage the material we

_Signals: camOps:6 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-5XihF05K4yM-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `mill`
- Source artifact: `state/shared/youtube-extraction/5XihF05K4yM.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].