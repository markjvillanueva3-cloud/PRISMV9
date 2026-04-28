---
id: "mc-063"
title: "Steep/Shallow boundary angle must match between roughing and finishing"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["mastercam", "steep-shallow", "threshold-angle", "boundary", "consistency", "waterline"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.156Z
---

# Steep/Shallow boundary angle must match between roughing and finishing

When using separate toolpaths for steep vs shallow regions (Waterline for steep, Scallop for shallow), ensure the Steep/Shallow threshold angle is identical across all operations. A mismatch of even 2-3 degrees creates a visible band of either double-cut or uncut material at the transition. Set the threshold to 45-55 degrees for most parts. Verify with Backplot that no gaps or overlaps appear at the boundary before running on the machine.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** finishing, 3d_finishing

## Related
- [[mastercam-cam-tips-mc-058|Hybrid finishing combines Scallop and Waterline for steep/shallow surface transitions]]
- [[mastercam-cam-tips-mc-257|Combining Equal Scallop with Steep/Shallow boundary yields optimal finish across mixed-angle surfaces]]
- [[mastercam-cam-tips-mc-060|Waterline finishing is mandatory for steep walls above 60 degrees]]
- [[mastercam-cam-tips-mc-068|Trimmed 5-axis constrains tool motion to a bounded surface region]]
- [[mastercam-cam-tips-mc-182|Material boundary auto-detection in rest machining eliminates manual containment definition]]
