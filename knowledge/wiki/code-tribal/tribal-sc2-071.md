---
name: tribal-sc2-071
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["multi-axis-post", "rotary-axis", "rtcp", "tcp", "configuration"]
confidence: 89
source: "web:surfcam-multiaxis-post"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-071.md
promoted_at: 2026-06-09T22:31:16.676Z
---

# Multi-Axis Post Configuration for Rotary Axis Output

SURFCAM multi-axis posting requires correct configuration of the rotary axis directions, zero positions, and output format. For table-table machines (e.g., trunnion), configure A and C axis directions matching the physical machine. For head-head machines, configure B and C. Set the rotary axis output to shortest-path rotation to minimize axis travel. Verify the RTCP (Rotary Tool Center Point) or TCP output matches your controller's coordinate system requirements.

**Category:** post_processor
**Confidence:** 89
**Source:** web:surfcam-multiaxis-post
**Operations:** posting, 5_axis

## Related
- [[bobcad-cam-tips-bc-088|Multi-Axis Post Configuration for Rotary Axes]]
- [[camworks-cam-tips-cw-086|Multi-Axis Post Processors — Handle Rotary Axis Output Correctly]]
- [[gibbscam-cam-tips-gc-077|Multi-axis post processors handle rotary axis output and RTCP compensation]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[edgecam-cam-tips-ec-075|Multi-Axis Post Processors for 4/5-Axis Machines]]
