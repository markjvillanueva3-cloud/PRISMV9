---
name: tribal-mc-167
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "tabs", "bridge", "onion-skin", "router", "hold-down"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-167.md
promoted_at: 2026-06-09T22:31:16.436Z
---

# Tab management in router profiling holds parts in place during cutout without vacuum failure

When profiling parts on a CNC router, tabs (also called bridges or onion skins) hold the finished part to the sheet skeleton, preventing it from shifting when vacuum hold-down loses pressure as the part separates. In Mastercam, add tabs in the Contour or Dynamic Contour parameters: set tab width to 3–6 mm for wood/plastic and 1–3 mm for aluminum, tab height to 0.5–1.0 mm (onion skin) or full thickness (bridge tab). Place tabs at corners or straight edges where post-machining cleanup is easiest — avoid placing tabs at critical profile features. Mastercam allows automatic tab placement at equal spacing or manual placement at specific locations. For parts with curves, use more tabs (one every 100–150 mm of perimeter) because curved parts tend to rotate when released. Program a cleanup pass at reduced depth to remove onion-skin tabs in a subsequent operation.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community
**Operations:** routing, contouring

## Related
- [[mastercam-cam-tips-mc-170|Bridge tabs on router parts must be sized for material strength and removal method]]
- [[mastercam-cam-tips-mc-124|Slug management in wire EDM prevents loose slugs from shorting the wire]]
- [[mastercam-cam-tips-mc-164|Nesting layout optimization in Mastercam Router maximizes sheet utilization above 85%]]
- [[mastercam-cam-tips-mc-165|Compression cutters prevent delamination on both top and bottom surfaces of composite laminates]]
- [[mastercam-cam-tips-mc-168|Remnant tracking in Mastercam nesting reuses partial sheets from previous jobs]]
