---
name: tribal-mc-170
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "bridge-tab", "material-specific", "removal", "onion-skin", "router"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-170.md
promoted_at: 2026-06-09T22:31:16.436Z
---

# Bridge tabs on router parts must be sized for material strength and removal method

Bridge tab dimensions depend on the material being cut and the post-cutting removal method. For solid wood and MDF, use full-thickness tabs 4–6 mm wide — these snap off cleanly with a chisel and sand flush. For aluminum sheet (1–3 mm), use 2–3 mm wide tabs at full thickness and remove with a nibbler or flush-cut saw. For acrylic and polycarbonate, use 3–4 mm wide onion-skin tabs (0.3–0.5 mm remaining thickness) that flex and break cleanly without crazing. In Mastercam, set the Tab Style to rectangular for hard materials and triangular for flexible materials (triangular tabs concentrate the break force at the apex for cleaner separation). Tab spacing depends on part weight — lighter parts need fewer tabs (one per 200 mm of perimeter), heavier parts need more (one per 80–100 mm). Always place at least one tab on each isolated section of the profile.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** routing, contouring

## Related
- [[mastercam-cam-tips-mc-167|Tab management in router profiling holds parts in place during cutout without vacuum failure]]
- [[mastercam-cam-tips-mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]]
- [[mastercam-cam-tips-mc-164|Nesting layout optimization in Mastercam Router maximizes sheet utilization above 85%]]
- [[mastercam-cam-tips-mc-165|Compression cutters prevent delamination on both top and bottom surfaces of composite laminates]]
- [[mastercam-cam-tips-mc-168|Remnant tracking in Mastercam nesting reuses partial sheets from previous jobs]]
