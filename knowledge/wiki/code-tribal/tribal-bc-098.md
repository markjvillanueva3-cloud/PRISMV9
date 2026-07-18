---
name: tribal-bc-098
category: code-tribal
subdomain: surface_quality
domain: tribal-knowledge
tags: ["tolerance", "chordal-deviation", "file-size", "look-ahead"]
confidence: 90
source: "web:bobcad-tolerance"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-098.md
promoted_at: 2026-05-26T16:07:19.794Z
---

# Tolerance Control for Surface Accuracy vs File Size

BobCAD surface tolerance (chordal deviation) controls toolpath-to-surface approximation. Tighter tolerance (0.001mm) = more accurate but larger NC files. For mold finishing use 0.005mm, general machining 0.01-0.02mm. V36 Advanced Surface Quality dialog provides arc fit and point distribution settings. Very tight tolerances may cause controller slowdown due to block processing limits — ensure your controller's look-ahead buffer can handle the point density.

**Category:** surface_quality
**Confidence:** 90
**Source:** web:bobcad-tolerance
**Operations:** finishing

## Related
- [[fusion360-cam-tips-ext-f360-105|Smoothing Tolerance for Controller Look-Ahead]]
- [[surfcam-cam-tips-sc2-080|Tolerance Settings Control Surface Accuracy and File Size]]
- [[bobcad-cam-tips-bc-203|BobCAD Dimensional Uncertainty Budget for Critical Features]]
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-102|Reaming — Slow Speed Precision Finishing for Tight-Tolerance Holes]]
