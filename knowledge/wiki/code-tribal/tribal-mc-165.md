---
name: tribal-mc-165
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "compression-cutter", "composite", "delamination", "cfrp", "router"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-165.md
promoted_at: 2026-06-09T22:31:16.435Z
---

# Compression cutters prevent delamination on both top and bottom surfaces of composite laminates

Standard up-cut end mills delaminate the top surface of composite laminates (CFRP, fiberglass); down-cut mills delaminate the bottom. Compression cutters combine up-cut geometry on the lower portion and down-cut on the upper portion, pushing both surfaces inward toward the material core. In Mastercam Router, set the axial depth of cut so the transition zone between up-cut and down-cut falls at the mid-thickness of the laminate. For a 6 mm thick panel with a compression cutter having a 3 mm up-cut zone, set the depth to exactly 6 mm (full through-cut) so the transition occurs at the 3 mm mid-plane. Feed rate should be moderate (1,000–3,000 mm/min) at high RPM (18,000–24,000) to produce short chips that evacuate cleanly. Never use compression cutters for pocketing — they are designed for full-depth profiling only.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community
**Operations:** routing, contouring

## Related
- [[mastercam-cam-tips-mc-285|Composite machining in Mastercam requires compression routers and low helix angles to prevent delamination]]
- [[mastercam-cam-tips-mc-230|Composite CFRP machining in Mastercam uses diamond-coated tools and dust management]]
- [[edgecam-cam-tips-ec-164|CFRP Routing with Diamond-Coated Compression Cutters]]
- [[mastercam-cam-tips-mc-166|Ramp entry into composites prevents plunge delamination and fiber pull-out]]
- [[mastercam-cam-tips-mc-171|Dust collection programming on CNC routers requires coordinated M-codes and feed adjustments]]
