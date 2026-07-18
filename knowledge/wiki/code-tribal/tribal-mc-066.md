---
name: tribal-mc-066
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "flow-5-axis", "impeller", "turbine", "channel", "morph"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-066.md
promoted_at: 2026-06-09T22:31:16.411Z
---

# Flow 5-axis is the primary toolpath for impeller and turbine blade channels

Flow 5-axis generates toolpaths that follow the natural flow of channel geometry between two boundary curves, with the tool axis tilting to maintain contact on compound curved surfaces. For impeller channels, select hub and shroud curves as boundaries and the blade surfaces as avoidance. Set cut pattern to Morph for channels that narrow or widen, and Parallel for uniform-width channels. Flow produces the smoothest finish on freeform channels with minimal cusps at 0.005-0.01 mm scallop height.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** multiaxis, 5_axis, finishing

## Related
- [[mastercam-cam-tips-mc-057|Flowline finishing follows UV surface direction for best finish on shaped parts]]
- [[mastercam-cam-tips-mc-059|Morph finishing interpolates between two boundary curves for blending regions]]
- [[mastercam-cam-tips-mc-065|Multi-Surface 5-axis uses multiple drive surfaces for complex compound shapes]]
- [[mastercam-cam-tips-mc-243|Morph between two curves creates smooth blended 5-axis finishing across complex surface transitions]]
- [[mastercam-cam-tips-mc-245|Flowline machining follows the natural UV direction of surfaces for optimal cutter contact]]
