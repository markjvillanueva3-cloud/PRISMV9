---
name: tribal-cat-087
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "composite", "cfrp", "pcd", "delamination", "material-specific"]
confidence: 87
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-087.md
promoted_at: 2026-06-09T22:31:16.050Z
---

# Composite CFRP Machining Requires Diamond Tooling and Dust Extraction

When machining CFRP composites in CATIA, specify PCD (polycrystalline diamond) or diamond-coated tools in the tool assembly. Set cutting speed to 150-300 m/min and feed per tooth to 0.03-0.08mm to minimize delamination. In the CATIA operation parameters, use compression-style tool paths that cut both upward and downward fiber directions simultaneously. Configure the setup documentation to specify vacuum dust extraction (not flood coolant) — CFRP dust is abrasive and conductive. Flag any fiber direction changes in the part model for the operator.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** roughing, finishing

## Related
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
- [[nx-cam-tips-ext-nx-136|Composite Machining for CFRP/GFRP Parts]]
- [[sprutcam-cam-tips-spr-033|Composite Machining with Diamond Tools]]
- [[worknc-cam-tips-wnc-098|Composite Machining with PCD Tools]]
- [[catia-cam-tips-cat-118|Ply Trimming Tool Path Generation from CATIA Composites Design]]
