---
id: "f360-006"
title: "Rest Machining with Smaller Tool After Adaptive"
source: "web:fusion360-docs"
confidence: 86
category: "cam_strategy"
tags: ["adaptive-clearing", "rest-machining", "tool-change", "efficiency"]
_source: "fusion360-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.791Z
---

# Rest Machining with Smaller Tool After Adaptive

After Adaptive Clearing with a large end mill, use a second Adaptive pass with a smaller tool and check Rest Machining in the Geometry tab. Set the tool reference to the previous operation so Fusion only generates toolpath where the larger tool could not reach — internal corners, narrow slots, and fillet radii. This avoids redundant cutting over already-cleared areas.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** 3d_adaptive, 2d_adaptive

## Related
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[cimatron-cam-tips-cim-074|Progressive Rest Machining Strategy]]
- [[esprit-cam-tips-esp-106|Air Cut Reduction with In-Process Stock Tracking]]
- [[hypermill-cam-tips-ext-hm-144|Progressive Rest Machining]]
