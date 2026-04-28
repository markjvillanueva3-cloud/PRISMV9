---
id: "mc-131"
title: "Accelerated Finishing toolpath type auto-calculates step-over from target scallop and tool profile"
source: "web:mastercam-docs"
confidence: 88
category: "cam_strategy"
tags: ["mastercam", "accelerated-finishing", "auto-stepover", "scallop-control", "surface-quality", "dynamic"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.212Z
---

# Accelerated Finishing toolpath type auto-calculates step-over from target scallop and tool profile

Mastercam's Accelerated Finishing toolpath differs from standard Surface Finish toolpaths by calculating step-over dynamically based on the actual tool profile geometry (barrel, lens, oval, or taper) and the user-specified target scallop height. Instead of entering a fixed step-over value, you enter the desired scallop height (typically 0.5–5 µm for finishing) and Mastercam computes the optimal step-over at each point on the surface based on local curvature and the tool's effective radius at the contact point. This means step-over varies across the part — wider on flat areas, tighter on curved areas — producing uniform surface quality with minimum passes. Always verify the computed step-over in Backplot to ensure it stays within the machine's minimum feed resolution.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:mastercam-docs
**Operations:** finishing, 5_axis

## Related
- [[mastercam-cam-tips-mc-061|Equal Scallop produces tighter surface tolerance than standard Scallop]]
- [[mastercam-cam-tips-mc-128|Barrel cutters achieve 5–10× larger step-over than ball end mills for equivalent scallop height]]
- [[mastercam-cam-tips-mc-129|Lens cutters excel on shallow concave surfaces where ball end mills lose effectiveness]]
- [[mastercam-cam-tips-mc-130|Taper barrel cutters combine wall finishing and floor blending in a single tool]]
- [[mastercam-cam-tips-mc-246|Blending distance control in multiaxis toolpaths smooths feed rate transitions at zone boundaries]]
