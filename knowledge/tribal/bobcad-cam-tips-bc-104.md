---
id: "bc-104"
title: "Stock-Aware Linking Minimizes Non-Cutting Time"
source: "web:bobcad-stock-aware-linking"
confidence: 90
category: "optimization"
tags: ["stock-aware-linking", "retract", "non-cutting-time", "v37"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.538Z
---

# Stock-Aware Linking Minimizes Non-Cutting Time

BobCAD V37 Stock-Aware Linking optimizes link height to keep tool movement closer to the stock rather than retracting to a high rapid plane. Retract height drops to just above the stock surface for traverses between adjacent passes. For Z-level transitions, retract clears only the highest stock point between positions. This reduces non-cutting time by 25-40% on deep cavity parts. Enable in the linking parameters — it works with all 2D and 3D operations.

**Category:** optimization
**Confidence:** 90
**Source:** web:bobcad-stock-aware-linking
**Operations:** roughing, finishing

## Related
- [[surfcam-cam-tips-sc2-087|Linking Optimization Minimizes Non-Cutting Time]]
- [[tebis-cam-tips-teb-029|Rapid Retract Height Optimization Reduces Non-Cutting Time]]
- [[bobcad-cam-tips-bc-031|Parallel Machining for Large Flat-Bottom Cavities]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
- [[camworks-cam-tips-cw-136|VoluMill Retract Optimization — Minimum Lift Between Passes]]
