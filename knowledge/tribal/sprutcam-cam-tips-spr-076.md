---
id: "spr-076"
title: "Rotary Axis Wrapping for Cylindrical Parts"
source: "web:sprutcam-tutorials"
confidence: 0.84
category: "cam_strategy"
tags: ["rotary-wrap", "cylindrical", "4-axis", "engraving"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.937Z
---

# Rotary Axis Wrapping for Cylindrical Parts

SprutCAM can 'wrap' 2D toolpaths around cylindrical surfaces using rotary axis substitution. Define the wrap cylinder diameter and axis. A flat 2D pattern (text, artwork, contour) is projected onto the cylinder surface. The X-axis motion converts to A/B-axis rotation. Verify the wrap diameter matches the actual part diameter exactly — errors cause scale distortion in the circumferential direction.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:sprutcam-tutorials
**Operations:** multi_axis

## Related
- [[cimatron-cam-tips-cim-065|Rotary Axis Wrapping for Cylindrical Features]]
- [[cimatron-cam-tips-cim-163|Rotary Axis Wrapping for Round Mold Components]]
- [[hypermill-cam-tips-ext-hm-171|Rotary Axis Wrapping for 4-Axis Parts]]
- [[powermill-cam-tips-pm-150|Rotary Axis Wrapping for 4-Axis Parts]]
- [[tebis-cam-tips-teb-164|Rotary Axis Wrapping for 4-Axis Engraving]]
