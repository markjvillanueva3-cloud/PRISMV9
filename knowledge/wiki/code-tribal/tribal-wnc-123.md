---
name: tribal-wnc-123
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["auto-5", "smoothing", "angular-velocity", "jerk"]
confidence: 90
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-123.md
promoted_at: 2026-05-26T16:07:21.583Z
---

# Auto5 Smoothing Parameters — Controlling Tool Axis Transition

Auto5 smoothing controls how quickly the tool axis changes between regions requiring different tilt orientations. Set the 'Angular Velocity Limit' (typically 5-15°/mm of toolpath) to prevent abrupt axis rotations that cause jerk marks on the surface. Lower values produce smoother axis motion but may increase toolpath length. For finishing operations on appearance surfaces, use 3-5°/mm; for roughing where surface quality is less critical, use 10-15°/mm. Always verify smoothed paths in simulation — aggressive smoothing can cause the tool to approach collision boundaries.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** 5_axis, finishing

## Related
- [[edgecam-cam-tips-ec-152|B-Axis Toolpath Smoothing for Surface Finish]]
- [[esprit-cam-tips-esp-108|Jerk Management for Ultra-Smooth Surface Finish]]
- [[topsolid-cam-tips-ts-160|5-Axis Rotary Axis Smoothing — Eliminating Machine Jerk]]
- [[worknc-cam-tips-wnc-001|Auto 5 Converts 3-Axis Toolpaths to Collision-Free 5-Axis]]
- [[worknc-cam-tips-wnc-002|Automatic Tool-Axis Calculation Avoids Manual Orientation]]
