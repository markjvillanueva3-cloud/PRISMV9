---
name: tribal-f360-027
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["live-tooling", "mill-turn", "lathe", "coordinate-system"]
confidence: 84
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-f360-027.md
promoted_at: 2026-06-09T22:31:16.307Z
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
