---
id: "teb-064"
title: "RTCP/TCPM Configuration for 5-Axis Machines"
source: "web:tebis-docs"
confidence: 86
category: "multi_axis"
tags: ["rtcp", "tcpm", "pivot-point", "post-processor"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.269Z
---

# RTCP/TCPM Configuration for 5-Axis Machines

Configure RTCP (Rotation Tool Center Point) in Tebis post processor. When RTCP is active, the controller compensates for rotary axis pivot distances automatically. Set pivot point coordinates precisely — incorrect values cause dimensional errors proportional to the angular range. Test with small angular moves first. Verify the machine controller supports RTCP mode before programming.

**Category:** multi_axis
**Confidence:** 86
**Source:** web:tebis-docs
**Operations:** post_processing

## Related
- [[cimatron-cam-tips-cim-058|RTCP/TCPM Configuration in Post Processor]]
- [[sprutcam-cam-tips-spr-085|RTCP/TCPM Output Configuration]]
- [[hypermill-cam-tips-ext-hm-130|RTCP/TCPM Configuration for Post Processing]]
- [[worknc-cam-tips-wnc-130|Auto5 Post Processor Requirements — RTCP and TCPM Support]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
