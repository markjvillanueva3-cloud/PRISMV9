---
id: "pm-009"
title: "Offset Area Clear Ordering by Distance Minimizes Rapids"
source: "web:powermill-tutorials"
confidence: 87
category: "optimization"
tags: ["offset-area-clear", "ordering", "rapids", "cycle-time"]
_source: "powermill-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.534Z
---

# Offset Area Clear Ordering by Distance Minimizes Rapids

Set segment ordering to 'Shortest' in Offset Area Clear to minimize rapid travel between cutting passes. PowerMill's nearest-neighbor algorithm reorders offset passes to reduce total non-cutting distance. For large parts with multiple Z-levels, this can save 5-15% total cycle time. Combine with 'Start Point Optimization' to ensure each pass begins at the closest point to the previous pass end.

**Category:** optimization
**Confidence:** 87
**Source:** web:powermill-tutorials
**Operations:** roughing

## Related
- [[powermill-cam-tips-pm-001|Offset Area Clear Profile Order Reduces Air Cutting]]
- [[mastercam-cam-tips-mc-116|Depth-first ordering reduces tool changes; breadth-first reduces setup complexity]]
- [[cimatron-cam-tips-cim-027|NC Code Optimization for Reduced Cycle Time]]
- [[powermill-cam-tips-pm-002|Offset Area Clear Stepdown Strategy for Variable Stock]]
- [[powermill-cam-tips-pm-003|Offset Area Clear Helical Entry Prevents Plunge Shock]]
