---
name: tribal-gc-187
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "die-mold", "hsm", "constant-z", "morphed-transition"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-187.md
promoted_at: 2026-06-09T22:31:16.361Z
---

# GibbsCAM die/mold HSM strategies use constant-Z with morphed transitions

For hardened die/mold cavities in GibbsCAM, use constant-Z (waterline) finishing with morphed transitions between levels. Enable 'Smooth Z Transitions' to convert the staircase pattern at steep walls into a continuous spiral motion. Set the Z-step to achieve the required scallop height (typically 0.005-0.01 mm for polished surfaces). For flat or near-flat regions where constant-Z produces widely spaced passes, switch to raster or 3D offset patterns. GibbsCAM's automatic strategy selection can blend constant-Z on steep regions with 3D offset on shallow regions within a single operation, producing optimal coverage across the entire cavity.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-103|Acceleration-aware toolpath generation matches machine dynamics for actual speed]]
- [[gibbscam-cam-tips-gc-186|GibbsCAM hardened steel HSM uses light DOC with high speed to stay below thermal threshold]]
- [[gibbscam-cam-tips-gc-188|GibbsCAM pencil tracing cleans fillets and edges missed by area-clearing passes]]
- [[gibbscam-cam-tips-gc-189|GibbsCAM barrel cutter finishing doubles step-over on hardened die walls]]
- [[gibbscam-cam-tips-gc-190|GibbsCAM rest-finishing with smaller ball nose reaches tight radii in hardened cavities]]
