---
id: "mc-266"
title: "Mastercam Simulator steady-rest and tailstock collision zones prevent crashes during mill-turn verification"
source: "web:mastercam-docs"
confidence: 81
category: "cam_strategy"
tags: ["mastercam", "simulator", "mill-turn", "collision", "steady-rest", "tailstock"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.330Z
---

# Mastercam Simulator steady-rest and tailstock collision zones prevent crashes during mill-turn verification

Define steady-rest and tailstock collision bodies in the Machine Definition Editor (under Components > Accessories) before running Mastercam Simulator on mill-turn programs. Import the steady-rest CAD model and set its engagement/retraction positions with corresponding M-code triggers. The Simulator will then verify that no tool, turret, or spindle motion collides with the steady-rest in its engaged position during turning operations, or with the tailstock during drilling. Set collision detection granularity to 0.5 mm for accurate near-miss detection. Without these definitions, the Simulator only checks tool-to-workpiece and tool-to-chuck collisions, missing the most common real-world crash scenario on mill-turn machines: turret crashing into an engaged steady-rest during tool change.

**Category:** cam_strategy
**Confidence:** 81
**Source:** web:mastercam-docs
**Operations:** turning, mill_turn

## Related
- [[mastercam-cam-tips-mc-083|C-axis milling on lathes requires accurate spindle orient and live tool offset]]
- [[mastercam-cam-tips-mc-084|Y-axis operations enable off-center milling for complex turned parts]]
- [[mastercam-cam-tips-mc-085|Sub-spindle transfer in Sync Manager requires precise handoff timing]]
- [[mastercam-cam-tips-mc-092|Machine Simulation detects axis over-travel that Verify completely misses]]
- [[mastercam-cam-tips-mc-253|Mastercam 2025 B-axis contour turning enables complex profile turning with live tooling on mill-turn]]
