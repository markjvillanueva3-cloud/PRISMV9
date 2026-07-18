---
name: tribal-nx-063
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "swarf", "ruled-surface", "gouge-check", "5-axis"]
confidence: 87
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-063.md
promoted_at: 2026-06-09T22:31:16.477Z
---

# SWARF Driving with Ruled Surface Verification

Before creating a SWARF operation, verify that the target wall surfaces are truly ruled (can be swept by a straight line). NX's SWARF drive aligns the tool flute along the ruling direction, but if the surface has double curvature, the tool will gouge or undercut. Use NX Surface Analysis > Ruling Lines to check. For non-ruled surfaces, switch to Variable Contour with interpolated axis vectors instead of SWARF to avoid geometric errors exceeding 0.02 mm.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:siemens-nx-docs
**Operations:** finishing, 5-axis

## Related
- [[camworks-cam-tips-cw-047|Swarf Cutting — Side-of-Tool Machining for Ruled Surfaces]]
- [[cimatron-cam-tips-cim-016|5-Axis Swarf Cutting for Ruled Surfaces]]
- [[edgecam-cam-tips-ec-028|Swarf Cutting for Ruled Surface Walls]]
- [[esprit-cam-tips-esp-031|5-Axis Swarf Cutting for Ruled Surfaces]]
- [[esprit-cam-tips-esp-183|FreeForm 5-Axis Swarf Cutting for Ruled Surfaces]]
