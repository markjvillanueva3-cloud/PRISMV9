---
id: "teb-088"
title: "Rapid Move Optimization for Cycle Time Reduction"
source: "web:tebis-docs"
confidence: 85
category: "optimization"
tags: ["rapid-moves", "safe-z", "cycle-time", "optimization"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.287Z
---

# Rapid Move Optimization for Cycle Time Reduction

Tebis rapid move optimization controls safe Z-heights for repositioning. Use incremental safe heights (10mm above highest stock) instead of absolute (fixed Z) to minimize travel distance. Enable 'Safe Area' rapid moves that traverse at safe Z only when crossing obstacles. This saves 5-15% cycle time on complex multi-pocket parts. Configure per-operation based on workpiece complexity.

**Category:** optimization
**Confidence:** 85
**Source:** web:tebis-docs
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-090|Rapid Move Optimization]]
- [[powermill-cam-tips-pm-068|Rapid Move Optimization for Cycle Time Reduction]]
- [[sprutcam-cam-tips-spr-156|Rapid Move Optimization]]
- [[cimatron-cam-tips-cim-171|Rapid Height Optimization for Cycle Time]]
- [[tebis-cam-tips-teb-186|Rapid Move Height Optimization]]
