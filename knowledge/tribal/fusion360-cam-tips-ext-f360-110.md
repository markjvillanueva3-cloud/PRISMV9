---
id: "f360-110"
title: "Minimum Retract Height to Reduce Rapid Travel"
source: "web:autodesk-community"
confidence: 87
category: "cam_strategy"
tags: ["fusion360", "retract-height", "rapid-travel", "cycle-time", "heights"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.714Z
---

# Minimum Retract Height to Reduce Rapid Travel

Set the Retract Height to the minimum safe value rather than using a large default clearance. For parts under 50mm tall, a retract height of 5-10mm above the highest stock point is sufficient. Every millimeter of unnecessary retract height adds wasted rapid travel time — on a 100-operation program with 500 retracts, reducing the retract by 20mm at 10m/min rapid saves over 10 minutes of cycle time. Use the Feed Height (2-5mm above stock) for approach moves and the Retract Height only for tool changes.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:autodesk-community
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-047|Morphing Between Depths for Smooth Adaptive Transitions]]
- [[fusion360-cam-tips-ext-f360-084|Tool Change Optimization in Post Processor]]
- [[fusion360-cam-tips-ext-f360-087|Force-Based Feed Optimization to Reduce Cycle Time]]
- [[fusion360-cam-tips-ext-f360-109|Stock-Aware Linking Minimizes Air Cutting]]
- [[fusion360-cam-tips-ext-f360-140|Barrel Cutter Selection for Large Stepovers]]
