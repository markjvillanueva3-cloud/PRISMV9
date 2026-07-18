---
name: tribal-sc2-022
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["islands", "draft-angle", "taper", "mold-cavity"]
confidence: 86
source: "web:surfcam-island-draft"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-022.md
promoted_at: 2026-06-09T22:31:16.666Z
---

# Island Machining with Tapered Walls and Draft Angles

SURFCAM handles islands with tapered (drafted) walls by applying draft angle compensation to the toolpath. For mold cavities with 1-3° draft, set the draft angle in the island definition rather than offsetting the geometry manually. The toolpath automatically adjusts at each Z-level to account for the changing island boundary. Use ball-nose tools for drafted island finishing to avoid step marks at the wall-to-floor transition.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:surfcam-island-draft
**Operations:** pocketing, finishing

## Related
- [[bobcad-cam-tips-bc-020|Island Machining with Automatic Detection and Multi-Level]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[cimatron-cam-tips-cim-170|Pocket with Progressive Level Cutting]]
- [[edgecam-cam-tips-ec-012|Pocketing with Island Detection and Offset Strategy]]
- [[hypermill-cam-tips-ext-hm-178|Pocket with Progressive Island Detection]]
