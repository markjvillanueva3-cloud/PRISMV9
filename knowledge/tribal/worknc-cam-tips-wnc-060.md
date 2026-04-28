---
id: "wnc-060"
title: "Multi-Axis Post Handles TCP/RTCP Transformations"
source: "web:worknc-multiaxis-post"
confidence: 92
category: "cam_strategy"
tags: ["multi-axis", "tcp", "rtcp", "inverse-kinematics"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.668Z
---

# Multi-Axis Post Handles TCP/RTCP Transformations

WorkNC's 5-axis post-processors handle TCP (Tool Center Point) and RTCP transformations for all major controller brands. Configure the correct inverse kinematics for your machine type (trunnion, swivel-head, mixed). Verify rotary axis direction conventions and pivot point distances. The post must output the correct G-code for TCP activation (G43.4 for Fanuc, TCPM for Heidenhain, etc.).

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:worknc-multiaxis-post
**Operations:** 5_axis

## Related
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[edgecam-cam-tips-ec-075|Multi-Axis Post Processors for 4/5-Axis Machines]]
- [[topsolid-cam-tips-ts-068|Multi-Axis Post Configuration Handles RTCP/TCP]]
- [[catia-cam-tips-cat-188|Multi-Axis Post Processor Rotary Axis Output Configuration]]
- [[nx-cam-tips-ext-nx-091|Multi-Axis Post Configuration for Table-Table Machines]]
