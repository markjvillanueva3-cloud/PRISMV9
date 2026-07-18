---
name: tribal-ts-118
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["draft-analysis", "moldability", "texture", "vdi"]
confidence: 91
source: "web:topsolid-draft"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-118.md
promoted_at: 2026-05-26T16:07:21.106Z
---

# Draft Analysis Ensures Moldability Before Machining

TopSolid's draft analysis tool color-codes all part surfaces based on their draft angle relative to the mold opening direction. Insufficient draft (<0.5° for textured surfaces, <1° for polished surfaces) is highlighted in red. Run draft analysis before committing to machining to catch design issues early. For surfaces requiring EDM texture (VDI 3400), the minimum draft must be at least 1° per 0.01 mm texture depth. Feed the analysis results back to the design team for corrections.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-draft
**Operations:** general

## Related
- [[worknc-cam-tips-wnc-038|Draft Angle Machining for Textured Mold Surfaces]]
- [[fusion360-cam-tips-ext-f360-059|Swarf Wall Angle Limits for Ruled Surface Validation]]
- [[mastercam-cam-tips-mc-144|Draft angle finishing in mold work requires tool axis alignment to the draft direction]]
- [[tebis-cam-tips-teb-010|Automatic Core/Cavity Split Separates Mold Halves]]
- [[bobcad-cam-tips-bc-184|BobART Texture Mapping for Surface Finishing Effects]]
