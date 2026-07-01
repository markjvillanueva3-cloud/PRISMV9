---
name: tribal-sc-093
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "simulation", "collision-margins", "safety", "machine-definition"]
confidence: 88
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-093.md
promoted_at: 2026-06-09T22:31:16.592Z
---

# Collision Zone Margins — Set Per-Component Safety Distances

Define different collision margins for different machine components in SolidCAM's Machine Definition. Use 2mm margin for tool holder to workpiece, 5mm for spindle housing to fixture, and 10mm for machine table to tool assembly. A single global margin either causes false alarms (too large) or misses near-misses (too small). For production work, run simulation twice — once with tight margins to find true collisions, then with production margins to verify safe clearance including machine backlash and thermal growth.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** simulation, verification

## Related
- [[solidcam-cam-tips-sc-096|Kinematic Chain Configuration — Correct Joint Order for Your Machine]]
- [[solidcam-cam-tips-sc-077|5-Axis Rotary Axis Limits — Define Machine Travel to Prevent Over-Travel]]
- [[solidcam-cam-tips-sc-092|Machine Simulation Setup — Import Exact Machine STL Models]]
- [[solidcam-cam-tips-sc-094|Stock Comparison — Real-Time Remaining Material Visualization]]
- [[solidcam-cam-tips-sc-095|Tool Holder Verification — Simulate Complete Tool Assembly]]
