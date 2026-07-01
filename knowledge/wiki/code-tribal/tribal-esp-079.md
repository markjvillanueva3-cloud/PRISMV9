---
name: tribal-esp-079
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["drilling", "peck", "depth", "material-specific"]
confidence: 88
source: "web:esprit-drilling"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-079.md
promoted_at: 2026-06-09T22:31:16.230Z
---

# Peck Drilling Depth Selection by Material

Set ESPRIT's peck drilling depth (G83) based on material and drill diameter: 0.5-1x diameter for steel, 1-2x diameter for aluminum, 0.3-0.5x diameter for stainless and superalloys. For carbide drills with through-coolant, you can often skip pecking entirely up to 3x diameter depth — the coolant evacuates chips effectively. ESPRIT's technology database stores optimal peck parameters per material/drill combination; use these as a starting point and adjust based on actual chip formation.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:esprit-drilling
**Operations:** peck_drilling

## Related
- [[camworks-cam-tips-cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]]
- [[camworks-cam-tips-cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]]
- [[catia-cam-tips-cat-110|Spot Drilling Depth Controls Subsequent Drill Centering]]
- [[controller-knowledge-tips-ctrl-005|Fanuc high-speed peck drilling G73 vs G83]]
- [[edgecam-cam-tips-ec-042|Drilling on Lathe with Center Support]]
