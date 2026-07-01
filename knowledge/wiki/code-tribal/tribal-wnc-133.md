---
name: tribal-wnc-133
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["auto-5", "machine-compatibility", "kinematics", "verification"]
confidence: 91
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-133.md
promoted_at: 2026-05-26T16:07:21.595Z
---

# Auto5 Machine Compatibility Check — Verify Before Programming

Before using Auto5, verify the CNC machine supports continuous 5-axis motion (not just 3+2 indexing). Requirements: (1) simultaneous interpolation of 5+ axes, (2) RTCP/TCPM capability in the controller, (3) adequate rotary axis speed (minimum 10°/s for reasonable cycle times), (4) rotary axis accuracy (backlash-compensated). WorkNC's machine definition file must accurately describe the kinematic chain (table-table, head-head, or head-table configuration). An incorrect kinematic definition produces toolpaths that collide on the real machine.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-docs
**Operations:** 5_axis

## Related
- [[worknc-cam-tips-wnc-131|Auto5 Toolpath Quality Assessment — Cusp Height Verification]]
- [[topsolid-cam-tips-ts-061|Full Machine Simulation with Kinematic Chain]]
- [[worknc-cam-tips-wnc-001|Auto 5 Converts 3-Axis Toolpaths to Collision-Free 5-Axis]]
- [[worknc-cam-tips-wnc-002|Automatic Tool-Axis Calculation Avoids Manual Orientation]]
- [[worknc-cam-tips-wnc-003|Smooth Tool-Axis Transitions Prevent Jerky Motion]]
