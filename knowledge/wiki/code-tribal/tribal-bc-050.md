---
name: tribal-bc-050
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["profiling", "rough-finish", "g71-g70", "corner-dwell"]
confidence: 88
source: "web:bobcad-profiling"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-050.md
promoted_at: 2026-06-09T22:31:15.944Z
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
