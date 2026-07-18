---
name: tribal-ec-098
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["peck-drilling", "depth", "material-specific", "g83"]
confidence: 88
source: "web:edgecam-drilling"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-098.md
promoted_at: 2026-06-09T22:31:16.183Z
---

# Peck Drilling Depth by Material Type

Set peck depth in Edgecam based on material: 0.5-1x diameter for steel, 1-2x for aluminum, 0.3-0.5x for stainless and superalloys. Carbide drills with through-coolant can often skip pecking up to 3x diameter depth. Use G83 (full retract) for gummy materials where chips pack in flutes, G73 (chip break) for free-machining materials. Edgecam's technology database suggests optimal peck parameters per material-drill combination.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-drilling
**Operations:** peck_drilling

## Related
- [[mastercam-cam-tips-mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]]
- [[bobcad-cam-tips-bc-109|Peck Drilling with Configurable Retract Strategy]]
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[surfcam-cam-tips-sc2-093|Peck Drilling with Configurable Retract and Peck Depth]]
- [[esprit-cam-tips-esp-079|Peck Drilling Depth Selection by Material]]
