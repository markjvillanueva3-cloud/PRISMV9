---
name: tribal-bc-011
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["profiling", "cutter-comp", "spring-passes", "deflection", "precision"]
confidence: 91
source: "web:bobcad-2d-profiling"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-011.md
promoted_at: 2026-05-26T16:07:16.790Z
---

# 2D Profiling with Cutter Compensation and Spring Passes

BobCAD 2D profiling supports both computer and controller cutter compensation (G41/G42). For precision walls (±0.01mm), use computer compensation with climb milling and 0.1-0.2mm finish stock. V36+ adds 'Spring Passes' — repeated finish passes at zero stock that progressively remove deflection-induced material. Enable spring passes (2-3 passes) on thin walls and deep profiles where tool deflection exceeds 0.01mm. This achieves ±0.005mm wall straightness without stiffer tooling.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:bobcad-2d-profiling
**Operations:** profiling, finishing

## Related
- [[surfcam-cam-tips-sc2-011|2D Profiling with Cutter Compensation for Precision Walls]]
- [[bobcad-cam-tips-bc-050|Profiling with Combined Rough-Finish Cycles]]
- [[catia-cam-tips-cat-158|CATIA Lathe Profiling with Minimum Radius Check]]
- [[edgecam-cam-tips-ec-011|Profiling with Lead-In/Lead-Out Arcs]]
- [[edgecam-cam-tips-ec-043|Profiling with Controlled Overlap for Accuracy]]
