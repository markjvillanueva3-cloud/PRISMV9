---
name: tribal-bc-192
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "waterjet", "trim", "taper-compensation", "kerf"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-192.md
promoted_at: 2026-06-09T22:31:15.979Z
---

# BobCAD Composite Waterjet Trim Integration

BobCAD generates toolpaths for waterjet trimming of composite parts. The toolpath follows the trim profile with lead-in/out arcs, and BobCAD outputs XYZ coordinates for the CNC motion while the waterjet controller manages pressure and abrasive. Set nozzle standoff (1-3mm) in the tool definition. Program pierce points away from the part edge — the initial high-pressure burst can damage composite surfaces. For thick CFRP (>10mm), enable taper compensation to counteract the waterjet's natural taper angle (0.5-2°). BobCAD's kerf compensation offsets the toolpath by half the kerf width (0.3-0.5mm for 80-mesh garnet).

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:bobcad-docs
**Operations:** contouring, trimming

## Related
- [[surfcam-cam-tips-sc2-175|SURFCAM Composite Edge Trimming with Waterjet Integration]]
- [[edgecam-cam-tips-ec-167|Composite Waterjet Trimming Toolpath from Edgecam]]
- [[bobcad-cam-tips-bc-037|5-Axis Trimming for Composite and Sheet Parts]]
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
- [[bobcad-cam-tips-bc-188|BobCAD Composite Drilling with Delamination Prevention]]
