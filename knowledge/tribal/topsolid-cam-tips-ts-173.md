---
id: "ts-173"
title: "TopSolid Swiss-Type Polygon Machining — Hex and Square Profiles"
source: "web:topsolid-docs"
confidence: 87
category: "cam_strategy"
tags: ["topsolid", "swiss-type", "polygon", "hex", "synchronization"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.518Z
---

# TopSolid Swiss-Type Polygon Machining — Hex and Square Profiles

TopSolid programs polygon machining (hex, square, Torx) on Swiss-type machines using synchronized rotation between the main spindle and polygon spindle. The rotation ratio determines the polygon shape: 1:1 = square (4 sides), 2:3 = hexagon (6 sides). TopSolid calculates the exact synchronization ratio and infeed depth from the desired polygon inscribed circle diameter. The process is dramatically faster than milling flats with a live tool — a hex is completed in seconds rather than minutes. TopSolid also supports polygon cutting for wrench flats on shafts and valve components.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:topsolid-docs
**Operations:** turning

## Related
- [[topsolid-cam-tips-ts-165|TopSolid Swiss-Type Synchronization — Gang Tool Overlapping]]
- [[camworks-cam-tips-cw-171|Swiss-Type Polygon Machining — Flats and Hex on Round Stock]]
- [[topsolid-cam-tips-ts-128|TopSolid'Cam 7 Multi-Channel Synchronization for Mill-Turn]]
- [[topsolid-cam-tips-ts-164|TopSolid Swiss-Type Lathe Programming — Complete Multi-Axis Workflow]]
- [[topsolid-cam-tips-ts-166|TopSolid Swiss-Type Sub-Spindle Back-Working — Second-Op Programming]]
