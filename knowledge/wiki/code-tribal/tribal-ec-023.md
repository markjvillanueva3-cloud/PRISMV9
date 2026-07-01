---
name: tribal-ec-023
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["steep-shallow", "hybrid", "z-level", "mold"]
confidence: 90
source: "web:edgecam-milling"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-023.md
promoted_at: 2026-05-26T16:07:20.158Z
---

# Steep and Shallow Hybrid Finishing Strategy

Edgecam's steep/shallow strategy automatically divides surfaces at a threshold angle (typically 45-60 degrees). Steep regions receive Z-level (waterline) finishing for uniform wall quality; shallow regions receive raster or scallop finishing for floor quality. Set the overlap band to 2-3 stepover widths to ensure seamless blending. This hybrid approach is essential for mold and die finishing where a single strategy cannot optimize both walls and floors.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:edgecam-milling
**Operations:** 3d_finishing

## Related
- [[esprit-cam-tips-esp-018|Steep/Shallow Boundary Detection for Hybrid Finishing]]
- [[bobcad-cam-tips-bc-028|Steep/Shallow Hybrid Finishing for Optimal Surface Quality]]
- [[cimatron-cam-tips-cim-022|Steep/Shallow Boundary Detection for Hybrid Finishing]]
- [[hypermill-cam-tips-ext-hm-135|Steep-Shallow Automatic Strategy Assignment]]
- [[mastercam-cam-tips-mc-058|Hybrid finishing combines Scallop and Waterline for steep/shallow surface transitions]]
