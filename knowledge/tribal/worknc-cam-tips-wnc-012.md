---
id: "wnc-012"
title: "Auto 5 with Rest Machining Targets Remaining Material"
source: "web:worknc-auto5rest"
confidence: 91
category: "cam_strategy"
tags: ["auto-5", "rest-machining", "combined", "corners"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.630Z
---

# Auto 5 with Rest Machining Targets Remaining Material

WorkNC combines Auto 5 with rest machining to create 5-axis toolpaths only in areas where material remains from previous operations. The system calculates the rest stock from the reference tool and applies Auto 5 collision avoidance to the rest-material passes. This is especially effective for clearing corners and fillets in deep cavities where the previous larger tool could not reach.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-auto5rest
**Operations:** 5_axis, rest_machining

## Related
- [[cimatron-cam-tips-cim-005|Pencil Milling for Corner Cleanup]]
- [[edgecam-cam-tips-ec-171|Hardened Material Rest Machining with Small Tools]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[worknc-cam-tips-wnc-001|Auto 5 Converts 3-Axis Toolpaths to Collision-Free 5-Axis]]
- [[worknc-cam-tips-wnc-002|Automatic Tool-Axis Calculation Avoids Manual Orientation]]
