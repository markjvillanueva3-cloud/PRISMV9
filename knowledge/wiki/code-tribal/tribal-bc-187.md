---
name: tribal-bc-187
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "cfrp", "compression-router", "delamination", "pcd"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-187.md
promoted_at: 2026-06-09T22:31:15.978Z
---

# BobCAD CFRP Composite Trim Cutting with Compression Routers

When machining CFRP composites in BobCAD, select compression router tools (up-down flute geometry) that cut fibers cleanly on both top and bottom plies. Program contour operations with climb milling to reduce delamination risk. Feed rates for CFRP: 2000-4000 mm/min at 8000-12000 RPM. Limit depth of cut to 1-2mm per pass. Enable dust extraction M-codes in the post processor — CFRP dust is carcinogenic and abrasive to machine ways. Use diamond-coated or PCD tools for >100 part production runs. Carbide tools last 10-20 parts in CFRP; PCD tools last 200-500.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** contouring, trimming

## Related
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[fusion360-cam-tips-ext-f360-181|CFRP Trimming with Compression Router]]
- [[mastercam-cam-tips-mc-285|Composite machining in Mastercam requires compression routers and low helix angles to prevent delamination]]
- [[nx-cam-tips-ext-nx-136|Composite Machining for CFRP/GFRP Parts]]
- [[sprutcam-cam-tips-spr-033|Composite Machining with Diamond Tools]]
