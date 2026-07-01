---
name: tribal-f360-159
category: code-tribal
subdomain: simulation
domain: tribal-knowledge
tags: ["fusion360", "simulation", "collision-investigation", "step-forward", "clearance"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-159.md
promoted_at: 2026-06-09T22:31:16.291Z
---

# Simulation Speed Control for Collision Investigation

When simulation detects a collision, slow the playback speed to 1-5% near the collision point to identify exactly which component collides and at what position. Use the step-forward button to advance one G-code block at a time through the collision zone. The collision panel shows the clearance distance between components — values below your safety threshold (typically 1-2mm) should be treated as near-misses even if not actual collisions. After identifying the collision cause (usually tool holder hitting a fixture or the tool shank hitting a wall), modify the toolpath: increase retract height, add tilt, use a longer tool, or split the operation to approach from a different direction.

**Category:** simulation
**Confidence:** 0.86
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-081|Machine Configuration Ties Post to Kinematic Model]]
- [[fusion360-cam-tips-ext-f360-086|In-App Simulation Resolution for Detecting Small Gouges]]
- [[fusion360-cam-tips-ext-f360-088|Collision Detection Scope: Tool vs Holder vs Shaft]]
- [[fusion360-cam-tips-ext-f360-090|Stock Model Updates Between Operations]]
- [[fusion360-cam-tips-ext-f360-160|Cycle Time Estimation from Simulation]]
