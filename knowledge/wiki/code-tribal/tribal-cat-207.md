---
name: tribal-cat-207
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "honeycomb", "composite", "core-machining", "ultrasonic"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-207.md
promoted_at: 2026-06-09T22:31:16.080Z
---

# Honeycomb Core Machining with Ultrasonic-Assisted Cutting in CATIA

For Nomex or aluminum honeycomb core machining in CATIA, program contour cutting with specialized honeycomb cutters (diamond-pattern or serrated-edge tools). Set the cutting speed to 500-800 m/min for Nomex and 200-400 m/min for aluminum honeycomb. In the CATIA operation, use Surface Machining with the tool axis normal to the core surface and minimal axial force (honeycomb crushes under excessive tool pressure). Define 'Maximum Axial Force' as a constraint if your machine supports force-controlled feed. For complex contoured cores (aircraft nacelle panels), use 5-axis sweeping to maintain the tool perpendicular to the curved core surface throughout the cut.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:dassault-forum
**Operations:** composite_machining

## Related
- [[gibbscam-cam-tips-gc-184|GibbsCAM honeycomb core machining uses ultrasonic knife tools on 5-axis routers]]
- [[surfcam-cam-tips-sc2-174|SURFCAM Honeycomb Core Machining with Ultrasonic Knife]]
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[catia-cam-tips-cat-118|Ply Trimming Tool Path Generation from CATIA Composites Design]]
- [[catia-cam-tips-cat-119|Fiber Direction Awareness Prevents Delamination in Composite Machining]]
