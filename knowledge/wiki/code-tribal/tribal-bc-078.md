---
name: tribal-bc-078
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["common-line", "shared-kerf", "cycle-time", "material-savings"]
confidence: 87
source: "web:bobcad-common-line"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-078.md
promoted_at: 2026-06-09T22:31:15.951Z
---

# Common Line Cutting for Reduced Cycle Time

BobCAD common line cutting shares cut lines between adjacent parts, cutting a single kerf that defines the edge of two parts simultaneously. This reduces cycle time by 20-40% and material waste by 5-10% on densely nested sheets. Set the common line tolerance to ±0.1mm to account for kerf width variation. Not all part geometries support common line — parts must have compatible straight edges at the shared boundary. BobCAD identifies eligible common lines automatically.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-common-line
**Operations:** nesting

## Related
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
- [[mastercam-cam-tips-mc-169|Common line cutting shares edges between adjacent parts to eliminate double cuts and save material]]
- [[mastercam-cam-tips-mc-238|Common line cutting between nested parts saves one kerf width per shared edge]]
- [[bobcad-cam-tips-bc-006|Feed Optimization Based on Instantaneous Engagement]]
- [[bobcad-cam-tips-bc-008|Air Cut Avoidance in Adaptive Roughing]]
