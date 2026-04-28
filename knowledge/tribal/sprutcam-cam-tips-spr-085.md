---
id: "spr-085"
title: "RTCP/TCPM Output Configuration"
source: "web:sprutcam-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["rtcp", "tcpm", "pivot-point", "post-processor"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.944Z
---

# RTCP/TCPM Output Configuration

Configure RTCP (Rotation Tool Center Point) output in SprutCAM's post processor. When RTCP is active, the controller automatically compensates for rotary axis pivot distances. Set the pivot point coordinates precisely in the post — incorrect values cause dimensional errors proportional to the angular range. Test with small angular moves first. Not all controllers support RTCP — verify with the machine builder.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:sprutcam-docs
**Operations:** post_processing

## Related
- [[cimatron-cam-tips-cim-058|RTCP/TCPM Configuration in Post Processor]]
- [[tebis-cam-tips-teb-064|RTCP/TCPM Configuration for 5-Axis Machines]]
- [[hypermill-cam-tips-ext-hm-130|RTCP/TCPM Configuration for Post Processing]]
- [[worknc-cam-tips-wnc-130|Auto5 Post Processor Requirements — RTCP and TCPM Support]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
