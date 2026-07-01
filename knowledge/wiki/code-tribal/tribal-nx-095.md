---
name: tribal-nx-095
category: code-tribal
subdomain: safety
domain: tribal-knowledge
tags: ["siemens-nx", "isv", "collision-pairs", "machine-simulation", "clearance"]
confidence: 87
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-095.md
promoted_at: 2026-06-09T22:31:16.486Z
---

# Full Machine Simulation with Collision Pair Definition

Define collision pairs explicitly in NX ISV Machine Tool Builder rather than relying on automatic detection. Create pairs between: spindle-fixture, tool holder-workpiece, turret-chuck (mill-turn), and table-spindle housing. Set collision clearance to 2.0 mm for production validation (catches near-misses) and 0.0 mm for final prove-out. Automatic collision detection checks all pairs which is slow — explicit pair definition reduces simulation time by 40-60% while covering the dangerous combinations.

**Category:** safety
**Confidence:** 87
**Source:** web:siemens-nx-docs
**Operations:** simulation

## Related
- [[nx-cam-tips-ext-nx-092|Machine Tool Kit Posts for Turnkey Deployment]]
- [[nx-cam-tips-ext-nx-096|Material Removal Visualization with Compare to Part]]
- [[nx-cam-tips-ext-nx-097|Collision Detection with Time-Based Analysis]]
- [[nx-cam-tips-ext-nx-098|NC Code Based Simulation for External Program Validation]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
