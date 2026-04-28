---
id: "cim-183"
title: "Electrode Set Burn Order Optimization"
source: "web:cimatron-docs"
confidence: 0.82
category: "cam_strategy"
tags: ["electrode", "burn-order", "tsp", "edm-optimization"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.139Z
---

# Electrode Set Burn Order Optimization

Multi-electrode sets: optimize burn sequence using traveling salesman (shortest path between burn positions). This minimizes electrode change time on the sinker EDM. Cimatron outputs electrode setup sheets with optimized sequence. For 20+ electrode sets, TSP optimization saves 15-30% of total EDM cycle time.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:cimatron-docs
**Operations:** specialty

## Related
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[cimatron-cam-tips-cim-015|Graphite Electrode Machining Parameters]]
- [[cimatron-cam-tips-cim-017|Copper Electrode EDM Burn Compensation]]
- [[cimatron-cam-tips-cim-039|Process Variability in Electrode Spark Gap Control]]
