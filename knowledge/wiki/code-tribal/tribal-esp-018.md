---
name: tribal-esp-018
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["steep-shallow", "hybrid-finishing", "z-level", "mold"]
confidence: 91
source: "web:esprit-3d-machining"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-018.md
promoted_at: 2026-05-26T16:07:20.222Z
---

# Steep/Shallow Boundary Detection for Hybrid Finishing

ESPRIT's steep/shallow strategy automatically separates surfaces based on a threshold angle (typically 45-60 degrees from horizontal). Steep regions receive Z-level (waterline) finishing for uniform wall quality, while shallow regions receive raster or scallop finishing for floor quality. Set the overlap band to 2-3 tool stepover widths to ensure seamless blending between the two strategies. This hybrid approach is essential for mold and die finishing.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:esprit-3d-machining
**Operations:** 3d_finishing, z_level

## Related
- [[edgecam-cam-tips-ec-023|Steep and Shallow Hybrid Finishing Strategy]]
- [[hypermill-cam-tips-ext-hm-135|Steep-Shallow Automatic Strategy Assignment]]
- [[nx-cam-tips-nx-008|Z-Level Finishing with Automatic Steep/Shallow Detection]]
- [[powermill-cam-tips-pm-015|Steep and Shallow Threshold Tuning for Mold Surfaces]]
- [[powermill-cam-tips-pm-033|Steep and Shallow Finishing with Automatic Boundary]]
