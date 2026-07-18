---
name: tribal-ec-024
category: code-tribal
subdomain: surface_finish
domain: tribal-knowledge
tags: ["z-level", "waterline", "steep-walls", "scallop"]
confidence: 89
source: "web:edgecam-milling"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-024.md
promoted_at: 2026-06-09T22:31:16.166Z
---

# Z-Level Finishing for Steep Walls

Edgecam's Z-level (waterline) finishing excels on walls steeper than 45 degrees where raster strategies produce excessive scallop heights. Calculate Z-step from scallop height: for ball-nose radius R and scallop h, Z-step = 2 x sqrt(2Rh). For a 10mm ball nose with 0.005mm scallop: Z-step = 0.63mm. Enable extend-to-floor to continue waterline passes past the steep/shallow boundary for clean transitions. Use constant-Z mode for consistent wall quality.

**Category:** surface_finish
**Confidence:** 89
**Source:** web:edgecam-milling
**Operations:** 3d_finishing

## Related
- [[bobcad-cam-tips-bc-021|Z-Level Finishing for Steep Walls Over 30 Degrees]]
- [[esprit-cam-tips-esp-019|Waterline Finishing Controls Wall Quality]]
- [[surfcam-cam-tips-sc2-023|Z-Level Finishing for Steep Walls Over 30°]]
- [[topsolid-cam-tips-ts-019|Waterline Roughing for Steep Wall Regions]]
- [[bobcad-cam-tips-bc-029|Waterline Roughing for Cavity and Core Work]]
