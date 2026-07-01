---
name: tribal-sc2-127
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["retract-optimization", "skim-retract", "rapid-travel", "cycle-time"]
confidence: 88
source: "web:surfcam-retract-optimization"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-127.md
promoted_at: 2026-06-09T22:31:16.687Z
---

# Retract Optimization to Minimize Rapid Travel Distance

SURFCAM retract optimization reduces non-cutting time by lowering the retract height from a fixed safe plane to a dynamic height just above the in-process stock. For adjacent passes at the same Z-level, use 'Skim retract' (retract 1-2mm above stock) instead of full retract. For Z-level transitions, retract only enough to clear the highest stock point between the current and next cutting positions. This can reduce cycle time by 20-40% on deep cavity parts.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-retract-optimization
**Operations:** roughing, finishing

## Related
- [[edgecam-cam-tips-ec-102|Hole Pattern Optimization Reduces Rapid Travel]]
- [[esprit-cam-tips-esp-085|Hole Pattern Optimization Minimizes Rapid Travel]]
- [[fusion360-cam-tips-ext-f360-110|Minimum Retract Height to Reduce Rapid Travel]]
- [[bobcad-cam-tips-bc-179|BobCAD Nesting Cutting Sequence Optimization]]
- [[bobcad-cam-tips-bc-006|Feed Optimization Based on Instantaneous Engagement]]
