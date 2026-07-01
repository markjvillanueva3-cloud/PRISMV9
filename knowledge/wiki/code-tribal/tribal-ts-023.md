---
name: tribal-ts-023
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["scallop", "constant-cusp", "surface-quality", "stepover"]
confidence: 93
source: "web:topsolid-scallop"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-023.md
promoted_at: 2026-05-26T16:07:20.702Z
---

# Scallop-Height Finishing Ensures Uniform Surface Quality

TopSolid's scallop-height finishing (constant-cusp) dynamically adjusts the stepover to maintain a uniform theoretical scallop height across the entire surface, regardless of local curvature. In high-curvature regions the passes are closer together; on flat areas they spread out. Set the target scallop to the desired surface roughness (typically 0.005-0.01 mm for polished surfaces). This produces the most uniform pre-polish finish compared to fixed-stepover strategies.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:topsolid-scallop
**Operations:** finishing, 3d_finishing

## Related
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[gibbscam-cam-tips-gc-104|Scallop height calculation drives stepover selection for target Ra]]
- [[surfcam-cam-tips-sc2-026|Scallop-Based Stepover for Constant Cusp Height]]
- [[worknc-cam-tips-wnc-030|Scallop-Height Finishing Ensures Uniform Surface Quality]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
