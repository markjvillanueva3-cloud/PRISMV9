---
id: "f360-027"
title: "Live Tooling Setup for Milling on Lathes"
source: "web:fusion360-docs"
confidence: 84
category: "setup"
tags: ["live-tooling", "mill-turn", "lathe", "coordinate-system"]
_source: "fusion360-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.808Z
---

# Live Tooling Setup for Milling on Lathes

To program live tooling (milling on a CNC lathe), create a Turning Setup and add milling operations within it. Fusion handles the coordinate system transformation from XZ lathe space. Ensure your post processor supports live tool codes — common issues include M-codes for spindle on/off for live tools (often M13/M14 or M133/M134) not matching your controller. Always verify the first program at reduced feed.

**Category:** setup
**Confidence:** 84
**Source:** web:fusion360-docs
**Operations:** mill_turn

## Related
- [[bobcad-cam-tips-bc-146|BobCAD Mill-Turn C-Axis Milling for Off-Center Features]]
- [[camworks-cam-tips-cw-071|C-Axis Milling on Lathe — Off-Center Features with Live Tooling]]
- [[catia-cam-tips-cat-155|CATIA Lathe Live Tooling for Cross-Drilling and Milling]]
- [[edgecam-cam-tips-ec-047|Live Tooling Strategy for Mill-Turn Machines]]
- [[fusion360-cam-tips-ext-f360-078|Live Tooling Coordinate System and Speed Limits]]
