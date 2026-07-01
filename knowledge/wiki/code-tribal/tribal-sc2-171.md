---
name: tribal-sc2-171
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "cfrp", "delamination", "compression-router", "diamond-coated"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-171.md
promoted_at: 2026-06-09T22:31:16.697Z
---

# SURFCAM Composite Trim Cutting with Diamond-Coated Tools

When machining CFRP composites in SURFCAM, use compression router (up-down flute) or diamond-coated tools to prevent delamination. Program the toolpath with conventional (up) milling on the top ply and climb milling on the bottom ply — SURFCAM's contour operation can split the cut at a specified Z-height to change milling direction. Feed rates for CFRP: 2000-4000 mm/min with 8000-12000 RPM. Reduce depth of cut to 1-2mm per pass. Enable dust extraction M-codes in the post — composite dust is a health and machine hazard.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:surfcam-docs
**Operations:** contouring, trimming

## Related
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
- [[fusion360-cam-tips-ext-f360-181|CFRP Trimming with Compression Router]]
- [[mastercam-cam-tips-mc-230|Composite CFRP machining in Mastercam uses diamond-coated tools and dust management]]
- [[mastercam-cam-tips-mc-285|Composite machining in Mastercam requires compression routers and low helix angles to prevent delamination]]
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
