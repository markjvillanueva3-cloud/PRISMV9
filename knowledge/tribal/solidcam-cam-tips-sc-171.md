---
id: "sc-171"
title: "Thread Milling Multi-Start Threads — Configure Start Angle Offset"
source: "web:solidcam-docs"
confidence: 82
category: "cam_strategy"
tags: ["solidcam", "thread-milling", "multi-start", "worm-screw", "angular-offset"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.795Z
---

# Thread Milling Multi-Start Threads — Configure Start Angle Offset

For multi-start threads (worm screws, quick-disconnect fittings), configure SolidCAM's Thread Milling operation with: Number of Starts = N and Start Angle Increment = 360/N degrees. SolidCAM generates N separate helical passes, each offset by the start angle. The effective lead equals pitch × number of starts. Critical: verify the thread mill can reach full depth in a single helical pass per start — if the lead is large, the tool may need to make multiple depth passes per start. For 2-start threads, starts are at 0 and 180 degrees; for 3-start, at 0, 120, and 240 degrees. Machine the starts sequentially (not simultaneously) to maintain positional accuracy between starts.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:solidcam-docs
**Operations:** threading, milling

## Related
- [[solidcam-cam-tips-sc-050|iMachining 3D Rest Material — Use Previous Tool Reference for Accuracy]]
- [[solidcam-cam-tips-sc-051|iMachining 3D Morphing Between Levels — Smooth Transitions on Complex Geometry]]
- [[solidcam-cam-tips-sc-052|iMachining 3D Auto Step-Down — Wizard Increases Feed at Shallower Depths]]
- [[solidcam-cam-tips-sc-053|iMachining 3D Stock Awareness — Enable for Castings and Forgings]]
- [[solidcam-cam-tips-sc-054|iMachining 3D Multiple Depth Passes — Layer Roughing for Very Deep Cavities]]
