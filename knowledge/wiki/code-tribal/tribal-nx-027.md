---
name: tribal-nx-027
category: code-tribal
subdomain: safety
domain: tribal-knowledge
tags: ["nx", "isv", "simulation", "g-code", "verification"]
confidence: 88
source: "web:siemens-docs"
promoted_from: knowledge/tribal/nx-cam-tips-nx-027.md
promoted_at: 2026-06-09T22:31:16.524Z
---

# ISV G-Code Driven Simulation vs Internal Simulation

Always use NX ISV (Integrated Simulation and Verification) for final validation instead of basic Internal simulation. ISV runs the actual G-code through a virtual controller (Fanuc, Sinumerik, Heidenhain) and simulates the machine's interpretation of the posted output. Internal simulation only shows toolpath motion and misses post-processor errors, canned cycle issues, and controller-specific behavior.

**Category:** safety
**Confidence:** 88
**Source:** web:siemens-docs
**Operations:** simulation

## Related
- [[nx-cam-tips-nx-029|Simulating External G-Code Files in NX]]
- [[worknc-cam-tips-wnc-053|Full Machine Simulation Validates Complete Programs]]
- [[nx-cam-tips-nx-015|5-Axis Collision Avoidance with Holder Checking]]
- [[nx-cam-tips-nx-028|Machine Tool Builder for ISV Setup]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
