---
name: tribal-sc-130
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "wire-edm", "profile", "skim-pass", "surface-finish"]
confidence: 88
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-130.md
promoted_at: 2026-06-09T22:31:16.599Z
---

# Wire EDM Profile Cutting — 2-Axis Contour with Multiple Skim Passes

SolidCAM's Wire EDM module programs 2-axis profile cuts by selecting contour geometry and defining cut sequence: rough cut, then 1-4 skim (trim) passes. The rough cut removes the bulk with maximum power settings and 0.15-0.25mm offset from final size. Each subsequent skim pass uses reduced power and smaller offset — typically 0.08mm, 0.04mm, 0.02mm, and 0.005mm for the final skin pass. Define skim pass count based on surface finish requirement: Ra 0.8 needs 2 skims, Ra 0.4 needs 3, and Ra 0.2 (mirror finish) needs 4. The wire type and material thickness determine power settings via the machine's built-in technology tables.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** wire_edm, finishing

## Related
- [[solidcam-cam-tips-sc-167-2|Chance-Constrained with iMachining Advantage]]
- [[solidcam-cam-tips-sc-181-2|Feature Recognition for Drilling Automation]]
- [[wedm-knowledge-tips-wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]]
- [[wedm-knowledge-tips-wedm-kb-023|Reduce flush pressure during skim passes]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
