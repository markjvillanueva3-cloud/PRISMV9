---
name: tribal-nx-097
category: code-tribal
subdomain: safety
domain: tribal-knowledge
tags: ["siemens-nx", "isv", "collision-detection", "time-analysis", "near-miss"]
confidence: 86
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-097.md
promoted_at: 2026-06-09T22:31:16.486Z
---

# Collision Detection with Time-Based Analysis

NX ISV logs collision events with exact timestamps and NC line numbers. After simulation, review the Collision Report sorted by severity (collision, near-miss, over-travel). For each event, NX highlights the colliding components and the G-code line that caused it. Use the time slider to step through the simulation frame-by-frame at the collision point. Near-miss events within 1.0 mm should be treated as collisions because thermal expansion, fixture misalignment, and setup errors can close the gap in production.

**Category:** safety
**Confidence:** 86
**Source:** web:siemens-nx-docs
**Operations:** simulation

## Related
- [[nx-cam-tips-ext-nx-092|Machine Tool Kit Posts for Turnkey Deployment]]
- [[nx-cam-tips-ext-nx-095|Full Machine Simulation with Collision Pair Definition]]
- [[nx-cam-tips-ext-nx-096|Material Removal Visualization with Compare to Part]]
- [[nx-cam-tips-ext-nx-098|NC Code Based Simulation for External Program Validation]]
- [[surfcam-cam-tips-sc2-064|Collision Detection for Tool Assembly and Fixtures]]
