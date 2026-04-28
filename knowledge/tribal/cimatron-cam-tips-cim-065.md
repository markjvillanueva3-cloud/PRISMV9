---
id: "cim-065"
title: "Rotary Axis Wrapping for Cylindrical Features"
source: "web:cimatron-tutorials"
confidence: 0.83
category: "cam_strategy"
tags: ["rotary-wrap", "cylindrical", "engraving", "4-axis"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.033Z
---

# Rotary Axis Wrapping for Cylindrical Features

Cimatron wraps 2D toolpaths around cylindrical surfaces using rotary axis substitution. Define wrap cylinder diameter and axis. Flat 2D patterns (text, artwork, contours) project onto the cylinder. X-axis converts to rotary motion. Verify wrap diameter matches actual part exactly — errors cause circumferential scale distortion. Use for engraving on round mold components.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:cimatron-tutorials
**Operations:** multi_axis

## Related
- [[cimatron-cam-tips-cim-163|Rotary Axis Wrapping for Round Mold Components]]
- [[hypermill-cam-tips-ext-hm-171|Rotary Axis Wrapping for 4-Axis Parts]]
- [[powermill-cam-tips-pm-150|Rotary Axis Wrapping for 4-Axis Parts]]
- [[sprutcam-cam-tips-spr-076|Rotary Axis Wrapping for Cylindrical Parts]]
- [[tebis-cam-tips-teb-164|Rotary Axis Wrapping for 4-Axis Engraving]]
