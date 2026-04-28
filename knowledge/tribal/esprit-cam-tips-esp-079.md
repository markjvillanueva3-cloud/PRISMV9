---
id: "esp-079"
title: "Peck Drilling Depth Selection by Material"
source: "web:esprit-drilling"
confidence: 88
category: "cam_strategy"
tags: ["drilling", "peck", "depth", "material-specific"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.502Z
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
