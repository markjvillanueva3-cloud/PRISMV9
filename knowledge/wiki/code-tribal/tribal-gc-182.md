---
name: tribal-gc-182
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "composite", "orbital-drilling", "delamination", "pcd"]
confidence: 83
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-182.md
promoted_at: 2026-06-09T22:31:16.359Z
---

# GibbsCAM composite drilling with orbital motion eliminates fiber breakout

For hole-making in composites with GibbsCAM, use orbital drilling (helical interpolation) instead of conventional twist drilling. Program a helical bore operation with a diameter 60-70% of the final hole size. The endmill orbits around the hole center, cutting material progressively without the axial thrust force that causes exit-side delamination. Set the helix pitch to 0.1-0.2 mm per revolution and use a diamond-coated (PCD) endmill. For stacked composite-aluminum (CFRP/Al), program two passes: first pass at composite-appropriate parameters (high speed, low feed), second pass at aluminum parameters (lower speed, higher feed). GibbsCAM's operation can detect material transitions if the stack-up is defined in the model.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-114|Composite machining requires compression routers and dust extraction setup]]
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[nx-cam-tips-ext-nx-136|Composite Machining for CFRP/GFRP Parts]]
- [[sprutcam-cam-tips-spr-033|Composite Machining with Diamond Tools]]
