---
id: "f360-078"
title: "Live Tooling Coordinate System and Speed Limits"
source: "web:fusion360-docs"
confidence: 85
category: "cam_strategy"
tags: ["fusion360", "live-tooling", "mill-turn", "speed-limit", "c-axis"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.689Z
---

# Live Tooling Coordinate System and Speed Limits

When programming live tooling in a mill-turn setup, remember that the C-axis (spindle) becomes a positioning axis while the live tool spins. Set the Maximum Speed for the live tool spindle based on the live tool holder's rated RPM — typically 4,000-12,000 RPM, much lower than a VMC spindle. Exceed the holder rating and you will destroy bearings. Also verify your post outputs the correct M-code for live tool engagement (often M23/M24 or M83/M84 depending on the controller).

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:fusion360-docs
**Operations:** mill_turn

## Related
- [[fusion360-cam-tips-ext-f360-128|Mill-Turn C-Axis Milling with Balanced Cuts]]
- [[bobcad-cam-tips-bc-146|BobCAD Mill-Turn C-Axis Milling for Off-Center Features]]
- [[camworks-cam-tips-cw-071|C-Axis Milling on Lathe — Off-Center Features with Live Tooling]]
- [[solidcam-cam-tips-sc-084|Mill-Turn Live Tooling — RPM vs. CSS Decision for Milling on Lathe]]
- [[topsolid-cam-tips-ts-048|C-Axis Milling on Mill-Turn for Off-Center Features]]
