---
name: tribal-teb-043
category: code-tribal
subdomain: finishing
domain: tribal-knowledge
tags: ["isoparametric", "nurbs", "uv-direction", "freeform"]
confidence: 84
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-043.md
promoted_at: 2026-06-09T22:31:16.716Z
---

# Isoparametric Finishing Follows UV Direction of NURBS Surfaces

Tebis isoparametric finishing generates toolpaths along the U or V parameter direction of individual NURBS surfaces. This produces the smoothest possible toolpath on each surface but may create witness lines at surface boundaries. Best for single-surface finishing of high-quality freeform areas. Pre-condition: surfaces must have clean parameterization — use Tebis reparameterize function if the UV directions are distorted.

**Category:** finishing
**Confidence:** 84
**Source:** web:tebis-docs
**Operations:** finishing

## Related
- [[bobcad-cam-tips-bc-140|BobCAM for Rhino NURBS-Native Surface Machining]]
- [[mastercam-cam-tips-mc-057|Flowline finishing follows UV surface direction for best finish on shaped parts]]
- [[mastercam-cam-tips-mc-245|Flowline machining follows the natural UV direction of surfaces for optimal cutter contact]]
- [[catia-cam-tips-cat-016|Isoparametric Machining Aligns Tool Path to UV Flow]]
- [[catia-cam-tips-cat-137|Isoparametric vs Isocrest Surface Machining Path Strategy]]
