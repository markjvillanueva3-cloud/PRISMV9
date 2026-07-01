---
name: tribal-mc-058
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "hybrid", "steep-shallow", "waterline", "scallop", "threshold-angle"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-058.md
promoted_at: 2026-06-09T22:31:16.409Z
---

# Hybrid finishing combines Scallop and Waterline for steep/shallow surface transitions

Mastercam Hybrid finishing automatically splits the part into steep and shallow regions, applying Waterline cuts on steep walls and Scallop or Parallel cuts on shallow floors. The Threshold Angle (typically 45-60 degrees from horizontal) controls the split. This eliminates the manual step of creating separate toolpaths for steep and shallow areas. The transition zone blends both patterns to avoid witness lines. Use Hybrid as a single-operation replacement for Waterline + Scallop combinations.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** finishing, 3d_finishing

## Related
- [[mastercam-cam-tips-mc-063|Steep/Shallow boundary angle must match between roughing and finishing]]
- [[mastercam-cam-tips-mc-054|Scallop toolpath produces uniform cusp height across varying surface curvature]]
- [[mastercam-cam-tips-mc-060|Waterline finishing is mandatory for steep walls above 60 degrees]]
- [[mastercam-cam-tips-mc-128|Barrel cutters achieve 5–10× larger step-over than ball end mills for equivalent scallop height]]
- [[mastercam-cam-tips-mc-129|Lens cutters excel on shallow concave surfaces where ball end mills lose effectiveness]]
