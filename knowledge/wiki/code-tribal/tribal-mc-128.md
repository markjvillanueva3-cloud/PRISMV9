---
name: tribal-mc-128
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "barrel-cutter", "scallop", "step-over", "accelerated-finishing", "circle-segment"]
confidence: 88
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-128.md
promoted_at: 2026-06-09T22:31:16.427Z
---

# Barrel cutters achieve 5–10× larger step-over than ball end mills for equivalent scallop height

Barrel cutters (also called circle-segment or tangent-arc cutters) have a large-radius cutting profile (typically R=50–500 mm) ground onto a small-diameter shank (6–16 mm). This large effective radius produces much smaller scallop heights per unit step-over compared to a standard ball end mill. For example, a 10 mm ball end mill at 0.3 mm step-over produces a scallop height of ~2.3 µm, while a barrel cutter with R=200 mm at 3.0 mm step-over produces the same ~2.3 µm scallop. In Mastercam, use the Accelerated Finishing toolpath type to take advantage of this geometry — it calculates step-over based on the barrel radius and target scallop, not the shank diameter.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:mastercam-docs
**Operations:** finishing, 5_axis

## Related
- [[mastercam-cam-tips-mc-129|Lens cutters excel on shallow concave surfaces where ball end mills lose effectiveness]]
- [[mastercam-cam-tips-mc-136|Scallop height versus step-over math differs fundamentally between ball and barrel cutters]]
- [[bobcad-cam-tips-bc-161|BobCAD Barrel Cutter Support for Large-Step-Over Finishing]]
- [[cimatron-cam-tips-cim-055|Barrel Cutter Strategies for Large Step-Over Finishing]]
- [[hypermill-cam-tips-ext-hm-118|MAXX Machining Roughing with Barrel Cutters]]
