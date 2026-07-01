---
name: tribal-pm-068
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["rapid-moves", "safe-z", "cycle-time", "optimization"]
confidence: 0
source: "web:powermill-docs"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-068.md
promoted_at: 2026-06-09T22:31:16.550Z
---

# Rapid Move Optimization for Cycle Time Reduction

PowerMill's 'Rapid Move Height' settings control safe Z-heights for rapid repositioning. Use 'Incremental' safe heights (10mm above highest stock) instead of 'Absolute' (fixed Z) to minimize rapid travel distance. Enable 'Safe Area' rapid moves that traverse horizontally at the safe Z only when crossing obstacles. This can save 5-15% cycle time on complex multi-pocket parts.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:powermill-docs
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-090|Rapid Move Optimization]]
- [[sprutcam-cam-tips-spr-156|Rapid Move Optimization]]
- [[tebis-cam-tips-teb-088|Rapid Move Optimization for Cycle Time Reduction]]
- [[cimatron-cam-tips-cim-171|Rapid Height Optimization for Cycle Time]]
- [[tebis-cam-tips-teb-186|Rapid Move Height Optimization]]
