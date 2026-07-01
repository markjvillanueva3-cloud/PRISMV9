---
name: tribal-sc2-174
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "honeycomb", "ultrasonic-knife", "nomex", "core-machining"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-174.md
promoted_at: 2026-06-09T22:31:16.698Z
---

# SURFCAM Honeycomb Core Machining with Ultrasonic Knife

SURFCAM supports ultrasonic knife toolpaths for trimming honeycomb core materials (Nomex, aluminum honeycomb). The ultrasonic knife vibrates at 20-40 kHz, cutting the cell walls without crushing the core structure. Program the knife path using SURFCAM's contour operation with zero radial offset. Feed rate depends on core density: 1000-3000 mm/min for Nomex, 500-1500 mm/min for aluminum honeycomb. Set the knife tilt angle to follow the surface normal for contoured honeycomb panels. Use SURFCAM's 5-axis support for compound-curved core shapes.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:surfcam-docs
**Operations:** contouring, trimming

## Related
- [[bobcad-cam-tips-bc-191|BobCAD Honeycomb Core Machining Strategies]]
- [[catia-cam-tips-cat-207|Honeycomb Core Machining with Ultrasonic-Assisted Cutting in CATIA]]
- [[edgecam-cam-tips-ec-166|Honeycomb Core Machining with Vacuum Fixturing]]
- [[fusion360-cam-tips-ext-f360-185|Honeycomb Core Machining Strategy]]
- [[gibbscam-cam-tips-gc-184|GibbsCAM honeycomb core machining uses ultrasonic knife tools on 5-axis routers]]
