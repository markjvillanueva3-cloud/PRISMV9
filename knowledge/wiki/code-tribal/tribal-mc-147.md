---
name: tribal-mc-147
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "burnishing", "mold", "mirror-finish", "polishing", "hardened-steel"]
confidence: 83
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-147.md
promoted_at: 2026-06-09T22:31:16.431Z
---

# Burnishing toolpaths in mold finishing use a ball tool at zero stock to polish hardened surfaces

Burnishing is a final operation where a polished ball end mill runs over the hardened mold surface at high speed with zero or slightly negative stock-to-leave. The ball compresses surface peaks without cutting, producing a mirror-like finish (Ra 0.05–0.1 µm) on pre-hardened steel (50–62 HRC). In Mastercam, program a Surface Finish Parallel or Contour toolpath with stock-to-leave set to -0.002 to 0 mm, using a new (unworn) ball end mill. Set spindle speed to maximum (20,000–40,000 RPM) and feed rate to 2,000–5,000 mm/min. The burnishing pass follows the same path as the final finishing pass but with these adjusted parameters. This technique is most effective on P20 and H13 tool steels and can reduce or eliminate manual polishing, saving 10–40 hours per mold.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** finishing, mold_die

## Related
- [[mastercam-cam-tips-mc-283|Mold runner and gate machining uses 2D contour with depth ramp to prevent tool breakage in hardened steel]]
- [[worknc-cam-tips-wnc-044|Burnishing Pass for Mirror-Quality Mold Surfaces]]
- [[mastercam-cam-tips-mc-043|OptiRough Critical Depths in 2026 flatten stepped floors automatically]]
- [[mastercam-cam-tips-mc-048|Area Roughing Plunge cutting is fastest for deep narrow slots in hardened steel]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
