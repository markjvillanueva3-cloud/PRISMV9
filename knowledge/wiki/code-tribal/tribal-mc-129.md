---
name: tribal-mc-129
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "lens-cutter", "concave", "mold-cavity", "accelerated-finishing", "scallop"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-129.md
promoted_at: 2026-06-09T22:31:16.427Z
---

# Lens cutters excel on shallow concave surfaces where ball end mills lose effectiveness

Lens-shaped cutters have a large convex radius on the tool tip (R=25–200 mm) and are designed for finishing shallow concave surfaces such as mold cavity floors. A standard ball end mill must be tilted significantly to cut shallow areas, which limits the effective cutting radius. A lens cutter contacts the surface with its full large radius even at near-vertical tool orientation. In Mastercam Accelerated Finishing, select the Lens tool shape and set the surface normal tilt to 1–3° to maintain consistent contact. Lens cutters typically reduce finishing time on mold cavity floors by 60–80% compared to ball end mills because the large radius allows step-overs of 2–5 mm while maintaining target scallop heights below 1 µm.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** finishing, 5_axis

## Related
- [[mastercam-cam-tips-mc-128|Barrel cutters achieve 5–10× larger step-over than ball end mills for equivalent scallop height]]
- [[mastercam-cam-tips-mc-054|Scallop toolpath produces uniform cusp height across varying surface curvature]]
- [[mastercam-cam-tips-mc-058|Hybrid finishing combines Scallop and Waterline for steep/shallow surface transitions]]
- [[mastercam-cam-tips-mc-062|Blend finish smooths transitions between adjacent toolpath regions]]
- [[mastercam-cam-tips-mc-130|Taper barrel cutters combine wall finishing and floor blending in a single tool]]
