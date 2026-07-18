---
name: tribal-f360-110
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "retract-height", "rapid-travel", "cycle-time", "heights"]
confidence: 87
source: "web:autodesk-community"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-110.md
promoted_at: 2026-06-09T22:31:16.279Z
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
