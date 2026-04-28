---
id: "gc-152"
title: "Swiss-type part ejector timing in GibbsCAM prevents part jams and bin overflow"
source: "web:gibbscam-forum"
confidence: 83
category: "cam_strategy"
tags: ["gibbscam", "swiss", "part-ejector", "timing", "automation"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.951Z
---

# Swiss-type part ejector timing in GibbsCAM prevents part jams and bin overflow

After backworking, GibbsCAM Swiss programs must sequence the part ejection correctly: sub-spindle stops, chuck opens, ejector pin fires, dwell for part to clear, retract ejector, close chuck for next part. Set the ejector dwell (G4) to 0.3-0.5 seconds — too short and the part may bounce back into the chuck, too long and it wastes cycle time. For parts shorter than 5 mm, increase air blast pressure during ejection to ensure the tiny part clears the work zone. Program a parts counter that pauses the machine every N parts (e.g., 500) for bin checking, preventing part pile-up that could interfere with the sub-spindle barrel.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:gibbscam-forum

## Related
- [[gibbscam-cam-tips-gc-052|Gang tooling layout minimizes tool change time on Swiss machines]]
- [[gibbscam-cam-tips-gc-088|GibbsCAM macros automate repetitive geometry creation and tool selection]]
- [[gibbscam-cam-tips-gc-089|Template operations capture proven process recipes for instant reuse]]
- [[gibbscam-cam-tips-gc-090|Batch processing runs multiple parts through post processing unattended]]
- [[gibbscam-cam-tips-gc-091|Automatic Feature Recognition identifies holes with minimal user input]]
