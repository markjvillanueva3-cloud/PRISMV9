---
name: tribal-ts-068
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["multi-axis", "rtcp", "tcp", "post-processor"]
confidence: 93
source: "web:topsolid-multiaxis-post"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-068.md
promoted_at: 2026-05-26T16:07:20.776Z
---

# Multi-Axis Post Configuration Handles RTCP/TCP

For 5-axis machines, configure the post-processor for the correct RTCP (Rotated Tool Center Point) or TCP (Tool Center Point) mode. TopSolid supports G43.4 (Fanuc), TCPM (Heidenhain), and machine-specific TCP implementations. Set the output to include the correct inverse kinematics transformation. Verify that the post handles rotary-axis direction correctly (positive/negative convention) and that the pivot point distance is accurately defined for each tool length.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:topsolid-multiaxis-post
**Operations:** 5_axis

## Related
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[edgecam-cam-tips-ec-075|Multi-Axis Post Processors for 4/5-Axis Machines]]
- [[catia-cam-tips-cat-188|Multi-Axis Post Processor Rotary Axis Output Configuration]]
- [[worknc-cam-tips-wnc-060|Multi-Axis Post Handles TCP/RTCP Transformations]]
- [[nx-cam-tips-ext-nx-091|Multi-Axis Post Configuration for Table-Table Machines]]
