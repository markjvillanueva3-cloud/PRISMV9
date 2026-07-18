---
name: tribal-pm-029
category: code-tribal
subdomain: simulation
domain: tribal-knowledge
tags: ["collision-checking", "tool-assembly", "holder", "deep-cavity"]
confidence: 91
source: "web:powermill-docs"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-029.md
promoted_at: 2026-05-26T16:07:20.399Z
---

# Collision Checking Modes: Tool Only vs Full Assembly

PowerMill offers multiple collision checking levels: 'Tool Only' checks just the cutter, 'Tool and Holder' adds the holder geometry, 'Full Assembly' includes spindle and machine components. Use 'Tool Only' for initial toolpath calculation speed, then re-check with 'Full Assembly' before posting. For deep cavity work, holder collision is the primary concern — a 50mm tool extending 100mm from a 80mm diameter holder will collide on cavity walls before the tool tip reaches the floor.

**Category:** simulation
**Confidence:** 91
**Source:** web:powermill-docs
**Operations:** roughing, finishing, 5axis_finishing

## Related
- [[bobcad-cam-tips-bc-094|Tool Assembly Definitions for Collision Accuracy]]
- [[catia-cam-tips-cat-149|Multi-Axis Collision Avoidance with Holder and Spindle Definition]]
- [[cimatron-cam-tips-cim-010|Tool Assembly Collision Checking]]
- [[edgecam-cam-tips-ec-178|Barrel Cutter Collision Avoidance on Enclosed Surfaces]]
- [[mastercam-cam-tips-mc-097|Tool Assembly definition combines cutter, holder, and extension for accurate collision checking]]
