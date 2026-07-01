---
name: tribal-mc-043
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "optirough", "critical-depths", "2026", "floor-flatness", "mold"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-043.md
promoted_at: 2026-06-09T22:31:16.405Z
---

# OptiRough Critical Depths in 2026 flatten stepped floors automatically

Mastercam 2026 introduces Critical Depths for OptiRough, which automatically detects flat regions within complex 3D geometry and inserts additional stepdown passes at those exact Z-levels. This produces flat floors without manual depth specification, eliminating scalloped stair-step artifacts that would otherwise require a separate facing pass. Enable Critical Depths for mold cavities and pocketed aerospace parts where floor flatness is critical.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** roughing, 3d_roughing

## Related
- [[mastercam-cam-tips-mc-053|3+2 Automatic Roughing outperforms OptiRough on steep-walled prismatic parts]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
- [[mastercam-cam-tips-mc-143|Parting line machining requires precise Z-level control and smooth surface finish]]
- [[mastercam-cam-tips-mc-144|Draft angle finishing in mold work requires tool axis alignment to the draft direction]]
