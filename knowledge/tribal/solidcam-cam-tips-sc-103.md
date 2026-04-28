---
id: "sc-103"
title: "Holder Definitions — Multi-Section Profile for Accurate Collision Checking"
source: "web:solidcam-docs"
confidence: 89
category: "tooling"
tags: ["solidcam", "tool-holder", "multi-section", "collision", "profile"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.743Z
---

# Holder Definitions — Multi-Section Profile for Accurate Collision Checking

Define tool holders with multiple diameter sections (taper, body, nut, collet protrusion) in SolidCAM's holder editor rather than using a single simplified cylinder. A BT40 holder with ER32 collet has at least 5 distinct diameter sections. The collision avoidance algorithm uses the holder profile at every toolpath point — a simplified cylinder that is too large triggers false collisions, while one that is too small allows actual collisions. Import holder profiles from manufacturer DXF/STEP files when available.

**Category:** tooling
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** tool_management, simulation

## Related
- [[solidcam-cam-tips-sc-049|iMachining 2D Profile Pass — Add Finish Allowance Correctly]]
- [[solidcam-cam-tips-sc-055|iMachining 3D Undercut Detection — Avoid Gouging on Draft Angles]]
- [[solidcam-cam-tips-sc-092|Machine Simulation Setup — Import Exact Machine STL Models]]
- [[solidcam-cam-tips-sc-095|Tool Holder Verification — Simulate Complete Tool Assembly]]
- [[solidcam-cam-tips-sc-098|Assembly Machining — Reference Fixture Bodies for Collision Avoidance]]
