---
name: tribal-sc-096
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "simulation", "kinematic-chain", "machine-definition", "5-axis"]
confidence: 87
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-096.md
promoted_at: 2026-06-09T22:31:16.592Z
---

# Kinematic Chain Configuration — Correct Joint Order for Your Machine

SolidCAM's machine simulation requires the kinematic chain (parent-child relationships between moving components) to exactly match your physical machine. For a table-table 5-axis (e.g., DMG MORI DMU), the chain is: base → column → spindle, and base → table → A-rotary → C-rotary → workpiece. An incorrect kinematic chain produces visually plausible but geometrically wrong simulations. Verify by commanding a known 5-axis position and comparing simulated vs. actual machine joint angles.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** simulation, verification

## Related
- [[solidcam-cam-tips-sc-077|5-Axis Rotary Axis Limits — Define Machine Travel to Prevent Over-Travel]]
- [[solidcam-cam-tips-sc-093|Collision Zone Margins — Set Per-Component Safety Distances]]
- [[solidcam-cam-tips-sc-158-2|Digital Twin Feedback for Continuous Improvement]]
- [[solidcam-cam-tips-sc-159-2|AMSAA Reliability Growth for Program Maturity]]
- [[solidcam-cam-tips-sc-160-2|Deflection Compensation δ=FL³/3EI for Finishing]]
