---
name: tribal-sc2-083
category: code-tribal
subdomain: surface_quality
domain: tribal-knowledge
tags: ["smooth-transitions", "witness-lines", "tangential-arcs", "blending"]
confidence: 88
source: "web:surfcam-smooth-transitions"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-083.md
promoted_at: 2026-06-09T22:31:16.678Z
---

# Smooth Transitions Between Passes Eliminate Witness Lines

SURFCAM smooth transitions use tangential arcs to connect adjacent passes rather than sharp direction changes. This is critical at Z-level transitions (waterline to waterline) and at pass start/end points. Set the transition radius to 2-5x the stepover distance. For multi-surface finishing, enable 'Cross-surface blending' to smoothly transition the toolpath as it moves from one surface patch to the next, preventing the faceted appearance that occurs at surface boundaries.

**Category:** surface_quality
**Confidence:** 88
**Source:** web:surfcam-smooth-transitions
**Operations:** finishing

## Related
- [[camworks-cam-tips-cw-113|Smooth Transitions — Avoid Witness Lines at Strategy Boundaries]]
- [[edgecam-cam-tips-ec-088|Smooth Transitions Eliminate Witness Lines]]
- [[esprit-cam-tips-esp-101|Smooth Transitions Between Adjacent Toolpaths]]
- [[bobcad-cam-tips-bc-106|Smooth Transitions and Minimize Retracts for Efficiency]]
- [[fusion360-cam-tips-ext-f360-124|Flow Finishing for Smooth Tool Axis Transitions]]
