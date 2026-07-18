---
name: tribal-ts-114
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["core-cavity", "parting-line", "mold", "automatic"]
confidence: 92
source: "web:topsolid-mold"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-114.md
promoted_at: 2026-05-26T16:07:21.085Z
---

# Core/Cavity Split with Automatic Parting Line Detection

TopSolid'Mold automatically detects the parting line based on the mold release direction and part geometry. The parting line follows the maximum perimeter of the part in the draw direction. After detection, TopSolid generates the parting surface that separates core and cavity halves. Review the parting line for undercut regions that may require side actions or lifters. The automatic detection handles 80-90% of cases; complex parts with multiple draw directions require manual parting line definition.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-mold
**Operations:** general

## Related
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-280|Mold core/cavity workflow uses solid model split and electrode extraction for integrated EDM planning]]
- [[catia-cam-tips-cat-191|Core/Cavity Split Surface Machining Strategy in CATIA]]
- [[cimatron-cam-tips-cim-007|Multi-Setup Mold Core/Cavity Coordination]]
- [[powermill-cam-tips-pm-008|Adaptive Area Clear for Complex Core/Cavity Roughing]]
