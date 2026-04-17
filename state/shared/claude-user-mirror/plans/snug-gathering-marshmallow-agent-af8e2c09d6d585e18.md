# SFC Calculator Review -- First-Year CNC Apprentice Perspective

This document captures an honest, in-character assessment of the PRISM SFC (Speeds, Feeds, and Cuts) Calculator from the viewpoint of an 18-year-old apprentice, six months into a CNC machining apprenticeship. The apprentice knows basic G-code, has run a handful of jobs on a Haas VF-2, and is still learning terminology and theory.

---

## The Test Scenario: Face Mill 6061 Aluminum on a Haas VF-2

### Could I figure it out? Step by step, honestly:

**Step 1: Machine Mode Tabs** -- OK, I see "Mill" at the top and it has sub-operations like "Face Milling." That is straightforward. I would click Mill, then Face Milling. So far so good.

**Step 2: Pick the material** -- SmartMaterialSelector. I need to find 6061 aluminum. I assume there is a search or dropdown. The code references a `MATERIALS` array from `materials.ts`. I would look for "6061" or "Aluminum." If the list is grouped by material family, I can probably find it. No issues *if* the search is decent. But if it just says "Al 6000-series" and not "6061-T6" specifically, I would be guessing whether the hardness values are right.

**Step 3: The Parameter Panel** -- This is where I start getting confused.

**Step 4: Select a tool** -- SmartToolSelector. I need a face mill. But how big? 2-inch? 3-inch? My shop uses a 2-inch Sandvik face mill with 5 inserts. I am not sure what to pick if the list is all metric and I think in inches.

**Step 5: Hit Calculate** -- I would get RPM, feed rate, DOC, WOC numbers back. But then what? I would need to type these into the Haas controller. The results display (`SfcCalculateResult`) gives me `spindle_speed` and `feed_rate`, which maps directly to S and F on the control. That part I understand.

---

## Terms and Abbreviations That Confuse Me

### DOC (Depth of Cut)
The parameter panel labels this "Depth of Cut" which is fine. But the code internally calls it `depth` in some places and `doc` in others (like `docMultiplier`, `docMult`). In my shop, the guys just say "ap" or "depth" or "how deep are you going." The abbreviation DOC is in my textbook but I had to look it up the first time. **I sort of know this one now.**

### WOC (Width of Cut)
Labeled "Width of Cut" in the panel -- OK. But I hear the machinists at work say "stepover" or "radial depth" or "ae." I have never heard anyone on the floor actually say "WOC." In the toolpath strategies, the code uses `wocMultiplier`. If someone handed me this calculator and said "set your WOC," I would have to think for a second. **I know the concept but the abbreviation is not what I hear at work.**

### SFM (Surface Feet per Minute)
This abbreviation does not appear directly in the code I read -- the code uses `cutting_speed` in the result and the machineModes file references `surface_speed` and `speed` in paramSections. But SFM is what my instructor drilled into me. SFM = (RPM x pi x Diameter) / 12 for imperial. I can do that formula. The calculator presumably does it for me, which is the whole point. **I know this one from class, but I might not recognize it if the UI says "cutting speed" instead of "SFM."** Also: the code stores everything in metric (m/min), and the Haas at my shop displays in IPM / SFM. The unit toggle (metric/imperial) in the ParameterPanel would be critical for me.

### Chip Thinning
This phrase appears in the toolpath strategy descriptions -- "constant chip load" in the adaptive clearing description. Chip thinning is when your radial engagement is small (low WOC/stepover), so the actual chip is thinner than the programmed feed-per-tooth. You have to increase the feed rate to compensate. **I have heard my lead machinist mention this when he was running adaptive toolpaths, but I do not fully understand the math.** The calculator handles it with multipliers (`feedMultiplier: 1.3` for adaptive clearing, `1.4` for trochoidal), but it never explains WHY. If I saw "Feed Multiplier: 1.4" I would not know that is compensating for chip thinning.

### Trochoidal (Milling)
From `toolpathStrategies.ts`, line 63: `label: "Trochoidal Milling"`, description: "Circular arc engagement -- maximum depth, minimal radial load." **I have seen videos of this on YouTube -- the tool goes in a circular swooping pattern instead of straight lines. My shop does not do it much because our CAM (Mastercam Mill 2D) might not support it.** The code even flags it: `minCamLevel: "mill_3d"`. But the word "trochoidal" itself -- I had to Google it. Nobody says that word on the shop floor. They say "high-speed machining" or "dynamic milling" or "that swirly toolpath." If this calculator showed me "Trochoidal" in a dropdown, I would think it sounds fancy and not pick it because I would not know what I was getting into.

### CBN (Cubic Boron Nitride)
Shows up in two places:
1. Tool material option in `ParameterPanel.tsx` line 22: `const TOOL_MATERIALS = ["Carbide", "HSS", "Ceramic", "CBN", "PCD"];`
2. Grinding operation defaults in `operations.ts`: `tool_material: "CBN"`
3. Coating type in `toolHolders.ts` line 87: `{ id: "cbn", label: "CBN", color: "dark", maxTemp: 1200 }`

**I know HSS and Carbide -- those are what I use every day. I have heard of CBN but never held one. My instructor said it is for hardened steel (50+ HRC) and it costs a fortune. PCD I know even less about -- something about diamond for aluminum?** The calculator puts CBN right next to Carbide in a flat dropdown. I might accidentally select it for my 6061 aluminum job because I do not know any better, and the calculator should probably warn me that is a terrible idea. (The CompatibilityValidator might catch this, but I cannot tell from the code alone.)

### HSK (Hollow Taper Shank)
From `toolHolders.ts` lines 13-14: `{ id: "hsk_a63", label: "HSK-A63" }` and `{ id: "hsk_e40", label: "HSK-E40" }`. **Our Haas VF-2 uses CAT40 toolholders. I know what CAT40 is because I load tools every day. HSK -- I have seen it mentioned in trade magazines but our shop does not have any HSK machines. I think it is a face-contact taper that is more accurate at high RPM?** The calculator lists both. I would just pick CAT40 because that is what I know. But if I were at a different shop, I would not know which HSK to choose (A63 vs E40? what?).

### CNMG (and other insert designations)
From `toolHolders.ts` line 98: `{ id: "cnmg", label: "CNMG", noseRadius: 0.8, description: "80 deg rhombic, neg. rake -- general turning" }`. Also WNMG, DNMG, TNMG, VNMG, CCMT, DCMT, APKT, RPMT, SPMT.

**This is the one that really makes my head spin.** I know these are ISO insert designation codes. The letters mean something:
- C = 80-degree diamond shape
- N = 0-degree clearance
- M = tolerance class
- G = chipbreaker type

But honestly, when I am at the lathe, my lead just hands me the right insert and says "use this one." I can read the code off the box but I could not tell you from memory what the third letter means. The calculator has 10 insert geometries listed. If I had to choose between CNMG and CCMT for a basic OD turning pass on aluminum, I would freeze. The descriptions help -- "80 deg rhombic, neg. rake -- general turning" tells me CNMG is the go-to. But "neg. rake" vs "pos. rake" -- **I am still shaky on rake angle theory.** I know positive rake cuts easier on soft materials (like my aluminum), so CCMT might actually be better for 6061, but the calculator does not guide me there.

---

## Where I Get Stuck

### 1. Too many choices, no guidance on what to pick FIRST
The page has THREE columns with dozens of selectors. Machine config, material, stock dims, CAM software, cutting priority, toolpath strategy, parameters, tool holder, insert, fixture, tool, machine. **I do not know which order to fill these in.** Is there a workflow? Do I pick the material first or the tool first? In real life my setup sheet tells me everything -- I do not have to figure out the sequence.

### 2. The "Cutting Priority" selector is abstract
`CuttingPrioritySelector` offers "Runtime," "Finish," "Balanced," and "AI Enhanced." **I do not know what these do.** Runtime means faster cycle time? At what cost -- tool life? Surface finish? The descriptions are one-liners: "Fastest cycle time" and "Best surface quality." But I do not understand the tradeoff. And "AI Enhanced" -- what does that even mean? It says "Cost-optimized by PRISM AI" but I have no idea what the AI is changing. The multipliers in the code (speedMult: 1.05, feedMult: 1.1, docMult: 1.1) are invisible to me. **I would probably just leave it on "Balanced" because I am scared of the other options.**

### 3. Toolpath strategy multipliers are invisible magic
When I pick "Adaptive Clearing," it silently multiplies my depth by 2.5 and my width by 0.15. That is a HUGE change. Going from 2mm DOC to 5mm DOC and from 40mm WOC to 6mm. But the UI just updates the numbers in the parameter panel and I might not notice or understand why they changed. **If I did not know about high-speed machining principles, I would look at "5mm depth of cut" and think the calculator is broken because my instructor told me 2mm for face milling.**

### 4. CAM software selection -- I do not understand the impact
The calculator asks what CAM software I use. OK, we use Mastercam at my shop. But why does the calculator care? The code shows it applies a feed multiplier (1.0 for Mill 2D, 1.0 for Mill 3D, 1.05 for Multiaxis). **I would not understand that different CAM packages handle toolpath geometry differently, which affects how aggressively you can feed.** SolidCAM iMachining gets 1.15x -- that is 15% more feed. But the calculator never explains this.

### 5. I do not understand overhang ratios
The tool holder selector has overhang options: Short (2xD or less), Standard (3xD), Long (4-5xD), Extra Long (6xD+). **I know stickout matters -- my instructor hammered that into me. Less stickout = less chatter. But "3xD" means 3 times the tool diameter? So a 12mm endmill at standard would stick out 36mm?** The calculator does not explain this and I would have to do that math in my head.

### 6. Insert geometry selection for turning is overwhelming
10 insert geometries with ISO codes. For my face milling scenario this would not apply (face mill uses milling inserts like APKT or RPMT, not CNMG). But if I switch to turning mode, I have to pick between 10 inserts and I do not have the experience to choose correctly. **The descriptions help but are too technical for my level.** "80 deg rhombic, neg. rake" -- I can picture the diamond shape but "negative rake" requires understanding that the insert is tilted away from the cut, which creates more force but is stronger.

### 7. Fixture selection -- I know this one but the labels are odd
"Fixture Plate + 1-2-3 Blocks" -- I use 1-2-3 blocks every week. "6-inch Kurt Vise" -- that is exactly what is on our VF-2. But "Modular Grid Plate" -- we do not have one. "Vacuum Fixture" -- I have only seen those in videos. **The max force values (22000N, 35000N) mean nothing to me. Is 35000N a lot? Enough for face milling aluminum? I have no frame of reference.**

### 8. No "beginner mode" or guided workflow
The biggest issue: this calculator assumes I already know what I am doing. It is a power tool for experienced machinists. **For someone at my level, I need it to say: "You picked face milling on aluminum. Here is a recommended setup: 2-inch face mill, 4 inserts, CAT40 holder, 6-inch vise, 800 SFM, 0.006 IPT feed. Here is why."** Instead it gives me 15 separate decisions to make and I am not confident in any of them.

---

## What DOES Work for Me

1. **The sub-operation pills under the Machine Mode tabs** -- I click "Mill" and see "Face Milling, Slot Milling, Pocket Milling..." That maps to how I think. I know what a face mill does.

2. **The defaults auto-load** -- When I pick Face Milling, it populates tool diameter 50mm, 6 teeth, 2mm depth, 40mm width. Those are reasonable starting values. At least I have a baseline.

3. **Metric/Imperial toggle** -- Essential. Our Haas runs in inches. All my training is in inches. If this was metric-only I would be lost.

4. **Conservative/Standard/Aggressive presets** -- These are labeled in plain English. Conservative = safe, Aggressive = pushing it. I would start Conservative every time because I am not confident enough to push the machine.

5. **The Calculate button is obvious** -- Big, clear, center of the page. I know what to press.

6. **Results give me RPM and feed rate** -- That is what I type into the Haas controller. `spindle_speed` = S-word, `feed_rate` = F-word in my G-code. Direct mapping.

---

## What Would Help Me Learn

1. **Tooltips or info icons on every field** -- Hover over "DOC" and see: "Depth of Cut (ap): How deep the tool goes into the material on each pass. Start shallow (0.5-2mm for aluminum) and increase as you gain confidence."

2. **A "Why?" explanation next to calculated results** -- "RPM 5093 because: SFM 800 / (pi x 2-inch cutter) = 5093. Typical for carbide on 6061."

3. **Warnings when I pick incompatible combos** -- "You selected CBN tool material for 6061 Aluminum. CBN is designed for hardened steel (50+ HRC). Consider Carbide instead." The CompatibilityValidator component exists for this but I cannot tell how comprehensive it is.

4. **A guided wizard mode** -- "Step 1: What are you cutting? Step 2: What operation? Step 3: What tool?" One thing at a time instead of the full 3-column power layout.

5. **Real-world photos or diagrams** -- Show me a picture of a face mill vs an end mill vs a ball nose. Show me what DOC and WOC look like on an actual cut. The current UI is all text and numbers.

6. **Link chip thinning to the feed multiplier** -- When adaptive clearing bumps my feed by 1.3x, show a callout: "Feed increased 30% to compensate for chip thinning at 15% radial engagement."

7. **Insert designation decoder** -- Let me click on "CNMG" and see the ISO breakdown: C=80-degree diamond, N=0-degree clearance, M=tolerance, G=chipbreaker. With a picture of the shape.

8. **Haas-specific output** -- Since I am on a Haas, show me the actual G-code line: `S5093 M03`, `G01 F30.5`. That would bridge the gap between "calculator output" and "what I type into the machine."

---

## Summary of Confusion Level by Term

| Term | My understanding | What would help |
|------|-----------------|-----------------|
| DOC | Mostly get it | Just confirm it means how deep per pass |
| WOC | Know the concept, never heard the abbreviation | Say "stepover" too |
| SFM | Learned the formula in class | Show the formula when displaying results |
| Chip thinning | Heard of it, do not understand the math | Visual explanation of why feed goes up when WOC goes down |
| Trochoidal | Seen YouTube videos, cannot explain it | Call it "Dynamic Milling" in parentheses, show animation |
| CBN | Know it is expensive and for hard stuff | Warning if paired with wrong material |
| HSK | Know it exists, never used one | "Your Haas uses CAT40" auto-filter by machine |
| CNMG | Can read the letters, cannot choose the right one | Wizard: "For general OD turning in aluminum, use CCMT (positive rake)" |
| Adaptive Clearing | Sort of know it is HSM | Explain "This changes your DOC from 2mm to 5mm -- here is why that is safe" |
| AI Enhanced | No idea | Explain what the AI actually changes, or hide from beginners |

---

## Files Reviewed

- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\SfcCalculatorPage.tsx` -- Main page, 527 lines, 3-column layout
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\operations.ts` -- 13 operation categories, 46 total operations
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\machineModes.ts` -- 13 machine modes with sub-operations
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\components\sfc\ParameterPanel.tsx` -- Parameter input with metric/imperial, presets
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\toolpathStrategies.ts` -- 20 toolpath strategies with multipliers
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\types\sfc.ts` -- Type definitions for calc request/result
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\toolHolders.ts` -- Tapers, holders, insert grades, coatings, geometries
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\fixtures.ts` -- 21 fixture types with force ratings
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\camSoftware.ts` -- 5 CAM packages with feed multipliers
