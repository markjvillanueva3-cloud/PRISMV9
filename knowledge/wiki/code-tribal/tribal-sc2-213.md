---
name: tribal-sc2-213
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["post-processor", "safe-start", "initialization", "modal-state", "crash-prevention"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-213.md
promoted_at: 2026-06-09T22:31:16.706Z
---

# SURFCAM Post Processor Safe Start Block Configuration

Configure the SURFCAM post processor's safe start block to initialize all critical machine states. A robust safe start block includes: G90 (absolute), G17/G18/G19 (plane), G21/G20 (units), G40 (cutter comp cancel), G49 (tool length comp cancel), G80 (canned cycle cancel), G54 (WCS), and the initial spindle/coolant states. Place these at program start and after every tool change to ensure the machine is in a known state. For 5-axis machines, add RTCP/TCP activation (G43.4, G234, TRAORI) in the safe start. This prevents crashes from residual modal states.

**Category:** post_processing
**Confidence:** 0.89
**Source:** web:surfcam-docs
**Operations:** roughing, finishing, drilling

## Related
- [[bobcad-cam-tips-bc-130|BobCAD V36 Advanced Toolpath Simulation with G-Code Verification]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-086|Multi-Axis Post Processors — Handle Rotary Axis Output Correctly]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
