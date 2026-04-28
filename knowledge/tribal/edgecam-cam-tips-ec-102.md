---
id: "ec-102"
title: "Hole Pattern Optimization Reduces Rapid Travel"
source: "web:edgecam-drilling"
confidence: 87
category: "cam_strategy"
tags: ["pattern-optimization", "rapid-travel", "cycle-time", "drilling"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.331Z
---

# Hole Pattern Optimization Reduces Rapid Travel

Edgecam's drill pattern optimizer resequences holes using nearest-neighbor algorithms to minimize total rapid travel distance. For plates with hundreds of holes this saves 5-15% of cycle time. Enable pattern optimization and set the starting hole nearest to the current tool position. For multi-tool operations (spot, drill, chamfer, tap), optimize each tool's sequence independently. Group hole types by depth and diameter for efficient tool changes.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:edgecam-drilling
**Operations:** drilling, tapping

## Related
- [[esprit-cam-tips-esp-085|Hole Pattern Optimization Minimizes Rapid Travel]]
- [[fusion360-cam-tips-ext-f360-110|Minimum Retract Height to Reduce Rapid Travel]]
- [[surfcam-cam-tips-sc2-127|Retract Optimization to Minimize Rapid Travel Distance]]
- [[camworks-cam-tips-cw-100|Chip-Break Drilling — Partial Retract for Faster Deep Holes]]
- [[controller-knowledge-tips-ctrl-005|Fanuc high-speed peck drilling G73 vs G83]]
