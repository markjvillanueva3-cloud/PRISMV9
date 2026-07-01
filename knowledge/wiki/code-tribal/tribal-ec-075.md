---
name: tribal-ec-075
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["post-processor", "multi-axis", "tcp", "rtcp"]
confidence: 90
source: "web:edgecam-post"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-075.md
promoted_at: 2026-05-26T16:07:20.182Z
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
