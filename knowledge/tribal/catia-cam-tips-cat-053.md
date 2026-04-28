---
id: "cat-053"
title: "Collision Detection Clearance Margins for Safety"
source: "web:catia-docs"
confidence: 91
category: "cam_strategy"
tags: ["catia", "collision", "detection", "near-miss", "safety"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.842Z
---

# Collision Detection Clearance Margins for Safety

In CATIA collision detection settings, set the Near Miss distance to 2mm and the Collision distance to 0mm. Near Miss warnings alert you when components approach within the safety margin without actual contact, giving you time to modify the tool path before a crash occurs. Enable collision checking for all components: tool, holder, spindle, part, fixture, and machine structure. Check the 'Stop on Collision' option during simulation to identify the exact NC block where the interference occurs.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:catia-docs
**Operations:** simulation

## Related
- [[tebis-cam-tips-teb-025|Stock Island Detection Prevents Collisions with Unmachined Areas]]
- [[catia-cam-tips-cat-009|Closed Pocket Island Detection and Machining Strategy]]
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
- [[catia-cam-tips-cat-059|Tool Holder Definition Enables Accurate Collision Checking]]
