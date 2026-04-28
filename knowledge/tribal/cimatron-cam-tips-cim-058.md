---
id: "cim-058"
title: "RTCP/TCPM Configuration in Post Processor"
source: "web:cimatron-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["rtcp", "tcpm", "pivot-point", "post-processor"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.028Z
---

# RTCP/TCPM Configuration in Post Processor

Configure RTCP (Rotation Tool Center Point) in Cimatron post processor. When RTCP is active, the controller compensates for rotary axis pivot distances. Set pivot point coordinates precisely — incorrect values cause dimensional errors proportional to angular range. Test with small angular moves first. Verify controller supports RTCP before programming. Common controllers: Heidenhain, Siemens, Fanuc.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:cimatron-docs
**Operations:** post_processing

## Related
- [[sprutcam-cam-tips-spr-085|RTCP/TCPM Output Configuration]]
- [[tebis-cam-tips-teb-064|RTCP/TCPM Configuration for 5-Axis Machines]]
- [[hypermill-cam-tips-ext-hm-130|RTCP/TCPM Configuration for Post Processing]]
- [[worknc-cam-tips-wnc-130|Auto5 Post Processor Requirements — RTCP and TCPM Support]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
