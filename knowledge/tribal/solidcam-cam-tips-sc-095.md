---
id: "sc-095"
title: "Tool Holder Verification — Simulate Complete Tool Assembly"
source: "web:solidcam-docs"
confidence: 91
category: "cam_strategy"
tags: ["solidcam", "simulation", "tool-holder", "assembly", "swept-volume"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.737Z
---

# Tool Holder Verification — Simulate Complete Tool Assembly

Always simulate with the complete tool assembly (cutting tool + holder + adapter + spindle nose) rather than just the cutting tool. In SolidCAM's tool definition, build the full assembly by stacking components. The simulator checks the entire assembly for collisions at every position. This catches the most common crash scenario in 5-axis work: the holder or spindle nose hitting the fixture or part while the cutting tool is safely clear. Enable the holder shadow display to see the swept volume during simulation.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:solidcam-docs
**Operations:** simulation, verification

## Related
- [[solidcam-cam-tips-sc-092|Machine Simulation Setup — Import Exact Machine STL Models]]
- [[solidcam-cam-tips-sc-093|Collision Zone Margins — Set Per-Component Safety Distances]]
- [[solidcam-cam-tips-sc-094|Stock Comparison — Real-Time Remaining Material Visualization]]
- [[solidcam-cam-tips-sc-096|Kinematic Chain Configuration — Correct Joint Order for Your Machine]]
- [[solidcam-cam-tips-sc-098|Assembly Machining — Reference Fixture Bodies for Collision Avoidance]]
