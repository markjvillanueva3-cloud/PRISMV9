---
name: tribal-cim-090
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["rapid-moves", "safe-z", "optimization", "cycle-time"]
confidence: 0
source: "web:cimatron-docs"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-090.md
promoted_at: 2026-06-09T22:31:16.104Z
---

# Rapid Move Optimization

Use incremental safe heights (10mm above highest stock) instead of absolute fixed Z to minimize rapid travel. Enable 'Safe Area' rapids that traverse at safe Z only when crossing obstacles. Saves 5-15% cycle time on complex multi-pocket parts. Configure per-operation based on workpiece complexity. Verify in simulation that rapid moves clear all fixturing.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:cimatron-docs
**Operations:** optimization

## Related
- [[powermill-cam-tips-pm-068|Rapid Move Optimization for Cycle Time Reduction]]
- [[sprutcam-cam-tips-spr-156|Rapid Move Optimization]]
- [[tebis-cam-tips-teb-088|Rapid Move Optimization for Cycle Time Reduction]]
- [[cimatron-cam-tips-cim-171|Rapid Height Optimization for Cycle Time]]
- [[tebis-cam-tips-teb-186|Rapid Move Height Optimization]]
