---
name: tribal-cw-086
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "post-processor", "5-axis", "rotary-axis", "configuration"]
confidence: 92
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-086.md
promoted_at: 2026-05-26T16:07:19.927Z
---

# Multi-Axis Post Processors — Handle Rotary Axis Output Correctly

5-axis posts must correctly map CAMWorks' internal tool axis vectors to the machine's specific rotary axis configuration (A/B table-table, B/C head-table, A/C head-head). Verify the post outputs the correct rotary axis direction (some machines use positive B for tilt left, others for tilt right). Test with known toolpath points: a vertical tool should output A0 B0 (or equivalent), and a 45° tilt in X should output the correct A or B angle for your machine. Incorrect axis mapping produces correct-looking code that crashes the machine.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:camworks-docs
**Operations:** 5_axis

## Related
- [[gibbscam-cam-tips-gc-077|Multi-axis post processors handle rotary axis output and RTCP compensation]]
- [[camworks-cam-tips-cw-018|Machine-Specific TechDB — Different Parameters per Machine Tool]]
- [[camworks-cam-tips-cw-045|Simultaneous 5-Axis — Continuous Tool Orientation for Complex Surfaces]]
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
- [[camworks-cam-tips-cw-047|Swarf Cutting — Side-of-Tool Machining for Ruled Surfaces]]
