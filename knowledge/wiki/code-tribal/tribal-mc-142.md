---
name: tribal-mc-142
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "electrode", "edm", "spark-gap", "mold", "sinker-edm"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-142.md
promoted_at: 2026-06-09T22:31:16.430Z
---

# Electrode creation from solid bodies automates EDM electrode design and machining

For features that cannot be reached by milling (deep narrow ribs, sharp internal corners, complex textures), create EDM electrodes in Mastercam. Extract the target feature geometry from the mold solid, offset it by the spark gap (typically 0.1–0.3 mm per side for finishing, 0.3–0.5 mm for roughing), and extend the electrode body with a uniform holder section. Program the electrode machining with fine step-overs (0.05–0.1 mm) using ball end mills to achieve the surface finish that will transfer to the mold. Create multiple electrodes per feature: a roughing electrode with larger gap for bulk removal and a finishing electrode with smaller gap for final dimensions. Always include datum surfaces on the electrode holder for alignment on the EDM sinker machine.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** mold_die, finishing

## Related
- [[mastercam-cam-tips-mc-280|Mold core/cavity workflow uses solid model split and electrode extraction for integrated EDM planning]]
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[tebis-cam-tips-teb-007|Electrode Design-to-NC Workflow Covers Full EDM Process]]
- [[topsolid-cam-tips-ts-053|Automatic Electrode Extraction from Mold Geometry]]
