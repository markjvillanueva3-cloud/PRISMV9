---
name: tribal-sc2-167
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "submerged", "flushing", "dielectric", "thick-workpiece"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-167.md
promoted_at: 2026-06-09T22:31:16.696Z
---

# SURFCAM Wire EDM Submerged vs Flushing Mode Selection

SURFCAM's wire EDM post processor supports both submerged cutting (workpiece fully immersed in dielectric) and flush-nozzle cutting. Submerged cutting provides superior flushing and thermal stability for thick workpieces (>100mm) and tight-tolerance work. Flush-nozzle mode is faster for thin workpieces (<30mm) and open geometries. Set the cutting technology accordingly — submerged mode uses 10-20% lower power settings but achieves better surface finish and dimensional accuracy. Output the appropriate tank fill/drain M-codes in the post.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** wire_edm

## Related
- [[esprit-cam-tips-esp-158|Wire EDM Submerged vs. Flushing Mode Selection]]
- [[wedm-knowledge-tips-wedm-kb-021|Submerged vs non-submerged: always submerge when possible]]
- [[wedm-knowledge-tips-wedm-sp-005|SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap]]
- [[mastercam-cam-tips-mc-121|Wire EDM flushing pressure must be balanced to prevent wire deflection and breakage]]
- [[mastercam-cam-tips-mc-125|Open profile wire EDM cuts require extra stock and careful start/end positioning]]
