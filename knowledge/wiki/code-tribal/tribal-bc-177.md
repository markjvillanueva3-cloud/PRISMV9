---
name: tribal-bc-177
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["nesting", "common-line", "shared-edge", "cutting-length", "plasma"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-177.md
promoted_at: 2026-06-09T22:31:15.975Z
---

# BobCAD Nesting with Common-Line Cutting

BobCAD's common-line cutting shares cut edges between adjacent parts, eliminating the part-to-part gap and reducing total cutting length by 15-30%. Two adjacent rectangular parts share one cut line instead of two separate cuts with a gap. Enable common-line in nesting settings and set the minimum shared edge length (typically 10mm). Common-line cutting requires precise alignment — misalignment by even 0.1mm causes both parts to be out of tolerance on the shared edge. Best suited for plasma and oxyfuel cutting where kerf width is consistent. Less suitable for laser where kerf varies with speed.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** contouring, cutting

## Related
- [[mastercam-cam-tips-mc-169|Common line cutting shares edges between adjacent parts to eliminate double cuts and save material]]
- [[mastercam-cam-tips-mc-238|Common line cutting between nested parts saves one kerf width per shared edge]]
- [[bobcad-cam-tips-bc-075|True-Shape Nesting for Maximum Sheet Yield]]
- [[bobcad-cam-tips-bc-175|BobCAD Nesting Module for Sheet Metal Cutting Optimization]]
- [[bobcad-cam-tips-bc-176|BobCAD True-Shape Nesting vs Rectangular Nesting]]
