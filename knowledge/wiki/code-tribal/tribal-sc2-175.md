---
name: tribal-sc2-175
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "waterjet", "edge-trimming", "abrasive", "taper-compensation"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-175.md
promoted_at: 2026-06-09T22:31:16.698Z
---

# SURFCAM Composite Edge Trimming with Waterjet Integration

SURFCAM can generate toolpaths for abrasive waterjet trimming of composite panels when paired with appropriate post processors. The toolpath follows the trim curve with lead-in/lead-out arcs to prevent damage at the cut start/end. Set the standoff distance (nozzle-to-part gap) in the tool definition — typically 1-3mm. Waterjet pressure for CFRP: 300-400 MPa with 80-mesh garnet abrasive. SURFCAM outputs XYZ coordinates while the waterjet controller manages pressure and abrasive flow. Enable taper compensation for thick laminates.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:surfcam-docs
**Operations:** contouring, trimming

## Related
- [[bobcad-cam-tips-bc-192|BobCAD Composite Waterjet Trim Integration]]
- [[catia-cam-tips-cat-208|Composite Edge Trimming with Dust Extraction Path Planning]]
- [[edgecam-cam-tips-ec-167|Composite Waterjet Trimming Toolpath from Edgecam]]
- [[bobcad-cam-tips-bc-037|5-Axis Trimming for Composite and Sheet Parts]]
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
