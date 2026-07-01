---
name: tribal-gc-077
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "post-processor", "5-axis", "rtcp", "rotary-axis", "kinematics"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-077.md
promoted_at: 2026-06-09T22:31:16.331Z
---

# Multi-axis post processors handle rotary axis output and RTCP compensation

For 5-axis machines, the post processor must output rotary axis positions and handle RTCP (Rotary Tool Center Point) compensation correctly. In GibbsCAM, configure the post for your machine's kinematic type: head/head (two rotary axes on the spindle), table/table (two rotary axes on the table), or head/table (one each). The post must output the correct G-code for RTCP (e.g., G43.4 on Fanuc, TRAORI on Siemens, G234 on Heidenhain). Incorrect RTCP configuration causes the tool tip to deviate from the programmed position during rotary axis moves.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-180|GibbsCAM 5-axis singularity avoidance near pole prevents rotary axis spin-out]]
- [[camworks-cam-tips-cw-086|Multi-Axis Post Processors — Handle Rotary Axis Output Correctly]]
- [[powermill-cam-tips-pm-052|Post Processor Customization for Multi-Axis Machines]]
- [[gibbscam-cam-tips-gc-031|Swarf milling uses the side of the cutter for ruled surface finishing]]
- [[gibbscam-cam-tips-gc-032|Multi-surface 5-axis machining handles complex blended geometry transitions]]
