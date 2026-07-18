---
name: tribal-ts-090
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["drilling-pattern", "optimization", "rapid-moves", "cycle-time"]
confidence: 89
source: "web:topsolid-drillopt"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-090.md
promoted_at: 2026-06-09T22:31:16.763Z
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
