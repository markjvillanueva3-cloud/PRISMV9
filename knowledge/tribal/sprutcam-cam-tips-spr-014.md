---
id: "spr-014"
title: "3D HSM Finishing with Constant Scallop"
source: "web:sprutcam-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["constant-scallop", "3d-finishing", "surface-quality", "hsm"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.857Z
---

# 3D HSM Finishing with Constant Scallop

SprutCAM's 3D Finishing supports constant scallop height mode where step-over varies based on surface curvature. Set target scallop height (e.g., 0.005mm for mirror finish). The system computes variable step-over: small on high-curvature areas, large on flat regions. This produces uniform surface quality while minimizing cycle time — typically 20-30% faster than fixed step-over for complex freeform parts.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:sprutcam-docs
**Operations:** finishing

## Related
- [[nx-cam-tips-ext-nx-072|Hub Finishing with Constant-Scallop Step-Over]]
- [[solidcam-cam-tips-sc-175-2|Constant Scallop Height Finishing]]
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[cimatron-cam-tips-cim-072|Constant Scallop Height Finishing]]
- [[hypermill-cam-tips-ext-hm-137|Constant Scallop Height Finishing]]
