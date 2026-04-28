---
id: "mc-160"
title: "Gun drilling parameters focus on straight-line accuracy and coolant flow for extreme depth ratios"
source: "web:community"
confidence: 83
category: "cam_strategy"
tags: ["mastercam", "gun-drilling", "deep-hole", "high-pressure-coolant", "straightness", "no-retract"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.235Z
---

# Gun drilling parameters focus on straight-line accuracy and coolant flow for extreme depth ratios

Gun drills handle depth-to-diameter ratios of 20:1 to 100:1 and beyond. In Mastercam, program gun drilling as a custom drill cycle with slow entry feed (0.005–0.01 mm/rev) for the first 2× diameter to establish a straight pilot, then increase to normal feed (0.01–0.03 mm/rev). Gun drills require high-pressure through-tool coolant (70–200 bar) — verify the M-code for coolant activation posts before the drill cycle. Unlike peck drilling, gun drills should not retract during cutting because re-entry risks deflection. Set spindle speed to 60–100 m/min surface speed depending on material. Gun drill programming in Mastercam also requires setting the proper reference (R) plane well above the part to account for the long drill shank and allow the machine to stabilize feed before the drill contacts the workpiece.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** drilling, hole_making

## Related
- [[mastercam-cam-tips-mc-156|Mastercam Advanced Drill allows per-segment speed, feed, and cycle changes within a single hole]]
- [[mastercam-cam-tips-mc-159|Deep hole BTA drilling requires through-tool coolant programming and guide pad alignment]]
- [[mastercam-cam-tips-mc-227|Titanium machining in Mastercam requires constant engagement and aggressive coolant to manage heat]]
- [[mastercam-cam-tips-mc-229|Inconel and superalloy machining uses ceramic inserts at high speed with rigid toolpath control]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
