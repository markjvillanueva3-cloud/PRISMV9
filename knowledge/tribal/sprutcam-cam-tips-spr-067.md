---
id: "spr-067"
title: "Pocket Machining with Island Detection"
source: "web:sprutcam-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["pocket", "island-detection", "progressive", "boss"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.930Z
---

# Pocket Machining with Island Detection

SprutCAM automatically detects islands (bosses) within pockets and generates toolpaths that machine around them. Set 'Island Offset' equal to the finish stock allowance. For multiple nested pockets, enable 'Progressive Level Cutting' — each Z-level machines all pockets before stepping down. This prevents excessive rapid moves between disconnected pocket regions and reduces cycle time by 15-25%.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:sprutcam-docs
**Operations:** roughing

## Related
- [[cimatron-cam-tips-cim-154|Pocket Machining with Island Detection]]
- [[hypermill-cam-tips-ext-hm-178|Pocket with Progressive Island Detection]]
- [[nx-cam-tips-ext-nx-177|Pocket with 3D IPW Tracking]]
- [[powermill-cam-tips-pm-132|Pocket with Island Detection]]
- [[powermill-cam-tips-pm-182|Pocket Island Detection Validation]]
