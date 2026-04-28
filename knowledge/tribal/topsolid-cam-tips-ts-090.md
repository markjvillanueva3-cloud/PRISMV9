---
id: "ts-090"
title: "Drilling Pattern Optimization Minimizes Rapid Moves"
source: "web:topsolid-drillopt"
confidence: 89
category: "cam_strategy"
tags: ["drilling-pattern", "optimization", "rapid-moves", "cycle-time"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.455Z
---

# Drilling Pattern Optimization Minimizes Rapid Moves

TopSolid optimizes the drilling sequence across multiple holes to minimize total rapid traverse distance. The algorithm uses nearest-neighbor or traveling-salesman heuristics to find the shortest path between all hole positions. Enable 'Optimize drilling order' in the operation settings. For large bolt patterns (20+ holes), this can save 10-30% of the drilling cycle time. The optimization respects any manually defined sequence constraints (e.g., pilot holes before through-holes).

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:topsolid-drillopt
**Operations:** drilling

## Related
- [[cimatron-cam-tips-cim-090|Rapid Move Optimization]]
- [[powermill-cam-tips-pm-068|Rapid Move Optimization for Cycle Time Reduction]]
- [[sprutcam-cam-tips-spr-156|Rapid Move Optimization]]
- [[tebis-cam-tips-teb-088|Rapid Move Optimization for Cycle Time Reduction]]
- [[camworks-cam-tips-cw-091|Feed Optimization — Post-Process Feed Rate Adjustment by Engagement]]
