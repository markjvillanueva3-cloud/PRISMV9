---
id: "spr-156"
title: "Rapid Move Optimization"
source: "web:sprutcam-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["rapid-moves", "safe-z", "cycle-time", "optimization"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.999Z
---

# Rapid Move Optimization

Incremental safe heights (10mm above stock) vs absolute. Safe area rapids only when crossing obstacles. Saves 5-15% cycle time on complex parts. SprutCAM configures per-operation based on geometry. Verify in simulation that rapids clear fixturing. Critical for multi-pocket parts.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:sprutcam-docs
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-090|Rapid Move Optimization]]
- [[powermill-cam-tips-pm-068|Rapid Move Optimization for Cycle Time Reduction]]
- [[tebis-cam-tips-teb-088|Rapid Move Optimization for Cycle Time Reduction]]
- [[cimatron-cam-tips-cim-171|Rapid Height Optimization for Cycle Time]]
- [[tebis-cam-tips-teb-186|Rapid Move Height Optimization]]
