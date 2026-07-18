---
name: tribal-f360-184
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "composite", "edge-finishing", "diamond-burr", "dust-extraction"]
confidence: 0
source: "web:autodesk-forum"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-184.md
promoted_at: 2026-06-09T22:31:16.296Z
---

# Composite Edge Finishing with Burr Tool

After trimming CFRP parts, edge quality often requires a finishing pass with a fine-grit diamond burr or router. In Fusion, program a 2D Contour at the trimmed edge with 0mm stock allowance and a diamond-coated burr tool (80-120 grit). Set the feed rate to 2000-3000mm/min at 15000-20000 RPM. The high speed and fine abrasive action trims any remaining fiber whiskers without pulling fibers from the matrix. For cosmetic edges visible in the final assembly, follow with a light hand-sanding operation (note this in the setup sheet). Dust extraction is mandatory during composite machining — carbon fiber dust is conductive and damages electronics, and is a respiratory hazard.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:autodesk-forum
**Operations:** 2d_contour

## Related
- [[fusion360-cam-tips-ext-f360-121|Multi-Axis Deburring Toolpath]]
- [[fusion360-cam-tips-ext-f360-181|CFRP Trimming with Compression Router]]
- [[fusion360-cam-tips-ext-f360-182|Diamond-Coated Tools for Composite Drilling]]
- [[fusion360-cam-tips-ext-f360-185|Honeycomb Core Machining Strategy]]
- [[catia-cam-tips-cat-208|Composite Edge Trimming with Dust Extraction Path Planning]]
