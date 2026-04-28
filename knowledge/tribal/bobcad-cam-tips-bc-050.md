---
id: "bc-050"
title: "Profiling with Combined Rough-Finish Cycles"
source: "web:bobcad-profiling"
confidence: 88
category: "cam_strategy"
tags: ["profiling", "rough-finish", "g71-g70", "corner-dwell"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.496Z
---

# Profiling with Combined Rough-Finish Cycles

BobCAD OD/ID profiling supports combined rough-finish cycles: multiple roughing passes at constant depth followed by a single finish pass. Set rough stock to 0.3-0.5mm, finish feed to 50-60% of roughing. For sharp corners, the system inserts dwell (G04) to allow the tool to settle. Enable 'Profile filtering' to smooth geometry within tolerance. BobCAD outputs optimized canned cycle code where the controller supports it (G71/G70 on Fanuc).

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-profiling
**Operations:** turning_roughing, turning_finishing

## Related
- [[surfcam-cam-tips-sc2-052|OD Profiling with Multi-Pass Roughing and Single-Pass Finish]]
- [[bobcad-cam-tips-bc-011|2D Profiling with Cutter Compensation and Spring Passes]]
- [[catia-cam-tips-cat-158|CATIA Lathe Profiling with Minimum Radius Check]]
- [[edgecam-cam-tips-ec-011|Profiling with Lead-In/Lead-Out Arcs]]
- [[edgecam-cam-tips-ec-043|Profiling with Controlled Overlap for Accuracy]]
