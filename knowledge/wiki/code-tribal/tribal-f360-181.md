---
name: tribal-f360-181
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "composite", "cfrp", "compression-router", "delamination"]
confidence: 0
source: "web:autodesk-forum"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-181.md
promoted_at: 2026-06-09T22:31:16.296Z
---

# CFRP Trimming with Compression Router

For carbon fiber reinforced polymer (CFRP) trimming in Fusion, use a compression (up-down) router bit at 8000-12000 RPM with feed rates of 1000-2000mm/min. The compression geometry simultaneously pushes top plies down and bottom plies up, preventing delamination on both surfaces. In Fusion, program a 2D Contour with a 0.1mm radial stock allowance on the first pass, then a finish pass at zero stock. Set the DOC to match the laminate thickness in a single pass. Avoid conventional end mills — they cause delamination, fiber pullout, and uncut fibers (fuzzing). Use vacuum fixturing to hold the part without clamping pressure that could deform the thin laminate.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:autodesk-forum
**Operations:** 2d_contour

## Related
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
- [[mastercam-cam-tips-mc-285|Composite machining in Mastercam requires compression routers and low helix angles to prevent delamination]]
- [[surfcam-cam-tips-sc2-171|SURFCAM Composite Trim Cutting with Diamond-Coated Tools]]
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[cimatron-cam-tips-cim-157|Composite Trimming for Automotive Parts]]
