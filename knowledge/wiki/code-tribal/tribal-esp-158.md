---
name: tribal-esp-158
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "flushing", "submerged", "dielectric", "cutting-speed"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-158.md
promoted_at: 2026-06-09T22:31:16.249Z
---

# Wire EDM Submerged vs. Flushing Mode Selection

ESPRIT's wire EDM module accounts for dielectric mode when calculating cutting speeds. Submerged cutting (workpiece fully immersed) provides uniform flushing and 10-15% faster cutting in tall parts (>50mm) but requires a sealed tank. Flush-jet mode (upper and lower nozzles spray dielectric) is adequate for parts under 50mm and required for parts clamped in fixtures that prevent submersion. Set the dielectric mode under Wire EDM → Technology → Flushing Mode. ESPRIT adjusts the technology table parameters (power, servo voltage, wire tension) based on the selected flushing mode and part height.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:esprit-docs
**Operations:** wire_edm

## Related
- [[surfcam-cam-tips-sc2-167|SURFCAM Wire EDM Submerged vs Flushing Mode Selection]]
- [[wedm-knowledge-tips-wedm-kb-021|Submerged vs non-submerged: always submerge when possible]]
- [[wedm-knowledge-tips-wedm-sp-005|SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap]]
- [[mastercam-cam-tips-mc-121|Wire EDM flushing pressure must be balanced to prevent wire deflection and breakage]]
- [[mastercam-cam-tips-mc-125|Open profile wire EDM cuts require extra stock and careful start/end positioning]]
