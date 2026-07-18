---
name: tribal-pm-043
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["rest-machining", "reference-tools", "remaining-stock", "ribs"]
confidence: 0
source: "web:powermill-docs"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-043.md
promoted_at: 2026-06-09T22:31:16.542Z
---

# Rest Machining with Multiple Reference Tools

PowerMill's rest machining detects material remaining from previous operations by referencing multiple tool shapes. Add ALL previous tools to the 'Reference Tool Set' — not just the most recent. The system computes the true remaining stock from the combined swept volume of all reference tools. Critical for mold cavities with deep ribs where progressively smaller tools are needed.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:powermill-docs
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-009|Rest Machining with Multiple Reference Tools]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[bobcad-cam-tips-bc-005|Rest Machining with Adaptive Toolpath for Uneven Stock]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
