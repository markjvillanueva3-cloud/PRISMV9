---
id: "mc-185"
title: "Rest scallop finishing produces uniform cusp height only in regions with remaining material"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["mastercam", "rest-scallop", "cusp-height", "stock-model", "mold-cavity", "uniform-finish"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.268Z
---

# Rest scallop finishing produces uniform cusp height only in regions with remaining material

Scallop toolpath in Mastercam generates toolpath with constant cusp height across 3D surfaces by varying step-over based on local surface curvature. When combined with Rest Material, the scallop toolpath limits its coverage to only those surface regions where the stock model shows remaining material above the target finish surface. This is particularly effective for mold cavities where open areas are already finished by a larger tool and only the concave transitions and fillet regions need the smaller scallop pass. Set the target scallop height to match the previous finishing pass (typically 0.005–0.02 mm) for seamless blending between finished and rest-finished zones. The rest scallop pass should use the same cutting direction (climb or conventional) as the prior finish pass to maintain consistent surface lay. Overlap between rest and previously finished zones should be 2–3 step-overs to prevent visible boundary lines.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** finishing

## Related
- [[mastercam-cam-tips-mc-054|Scallop toolpath produces uniform cusp height across varying surface curvature]]
- [[mastercam-cam-tips-mc-062|Blend finish smooths transitions between adjacent toolpath regions]]
- [[mastercam-cam-tips-mc-096|Save Stock Model at operation boundaries to speed up re-simulation]]
- [[mastercam-cam-tips-mc-129|Lens cutters excel on shallow concave surfaces where ball end mills lose effectiveness]]
- [[mastercam-cam-tips-mc-140|Pencil toolpath with wall cleanup targets fillet corners that larger tools cannot reach]]
