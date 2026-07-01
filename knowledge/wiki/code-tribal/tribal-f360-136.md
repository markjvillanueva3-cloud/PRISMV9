---
name: tribal-f360-136
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "swarf", "ruled-surface", "5-axis", "side-cutting"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-136.md
promoted_at: 2026-06-09T22:31:16.285Z
---

# Swarf Cutting for Ruled Surfaces

Use the Swarf cutting strategy for ruled surfaces (surfaces that can be defined by sweeping a straight line) such as turbine blade sides, draft walls, and tapered ribs. Swarf cutting uses the side of the cutter rather than the tip, covering the entire surface height in a single pass. Set the tool axis to follow the ruled surface direction and limit the maximum tilt rate to 2-5 degrees per move. Verify the effective cutting length of the tool covers the surface height — typically need a tool with 3-4x the surface height in cutting length. Surface finish is controlled by the stepover along the surface, typically 50-70% of the effective cutting width.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:fusion360-docs
**Operations:** 5_axis_finishing

## Related
- [[camworks-cam-tips-cw-047|Swarf Cutting — Side-of-Tool Machining for Ruled Surfaces]]
- [[edgecam-cam-tips-ec-028|Swarf Cutting for Ruled Surface Walls]]
- [[fusion360-cam-tips-ext-f360-059|Swarf Wall Angle Limits for Ruled Surface Validation]]
- [[cimatron-cam-tips-cim-016|5-Axis Swarf Cutting for Ruled Surfaces]]
- [[esprit-cam-tips-esp-031|5-Axis Swarf Cutting for Ruled Surfaces]]
