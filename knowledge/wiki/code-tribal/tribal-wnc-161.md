---
name: tribal-wnc-161
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["spiral", "finishing", "continuous", "surface-quality", "mold"]
confidence: 90
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-161.md
promoted_at: 2026-05-26T16:07:21.680Z
---

# WorkNC Spiral Finishing — Continuous Tool Contact for Best Surface Quality

WorkNC's spiral finishing generates a continuous spiral toolpath that covers the entire part surface without the retract-reposition moves that leave witness marks. The spiral starts at the center (or top) and expands outward (or downward) with constant stepover. For mold cavities, spiral finishing produces the smoothest surface because the tool never lifts and re-enters the material. Combine spiral finishing with constant-curvature toolpath options for HSM compatibility. The trade-off: spiral paths can be 10-20% longer than row-based paths, but the surface quality improvement justifies the extra time on appearance surfaces.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** finishing

## Related
- [[camworks-cam-tips-cw-042|Spiral Finishing — Continuous Single-Path Motion Eliminates Step Marks]]
- [[cimatron-cam-tips-cim-011|Spiral Finishing for Flat and Near-Flat Areas]]
- [[gibbscam-cam-tips-gc-016|Spiral machining eliminates retract moves for continuous engagement]]
- [[topsolid-cam-tips-ts-024|Spiral Finishing Eliminates Retract Marks]]
- [[worknc-cam-tips-wnc-025|Spiral Finishing Eliminates Entry/Exit Witness Marks]]
