---
id: "ec-075"
title: "Multi-Axis Post Processors for 4/5-Axis Machines"
source: "web:edgecam-post"
confidence: 90
category: "cam_strategy"
tags: ["post-processor", "multi-axis", "tcp", "rtcp"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.310Z
---

# Multi-Axis Post Processors for 4/5-Axis Machines

Multi-axis post processors in Edgecam must correctly handle RTCP/TCP (tool center point) control, rotary axis direction conventions, and work plane definitions. For Fanuc, output G43.4/G43.5; for Siemens, TRAORI; for Heidenhain, TCPM. Configure the post with the exact pivot point distances and rotary axis directions (positive/negative conventions) to match the machine's kinematic calibration. Incorrect TCP setup is the leading cause of 5-axis program errors.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:edgecam-post
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[topsolid-cam-tips-ts-068|Multi-Axis Post Configuration Handles RTCP/TCP]]
- [[catia-cam-tips-cat-188|Multi-Axis Post Processor Rotary Axis Output Configuration]]
- [[worknc-cam-tips-wnc-060|Multi-Axis Post Handles TCP/RTCP Transformations]]
- [[cimatron-cam-tips-cim-058|RTCP/TCPM Configuration in Post Processor]]
