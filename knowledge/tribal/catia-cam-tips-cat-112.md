---
id: "cat-112"
title: "Peck Drilling Cycle Configuration for Deep Holes"
source: "web:catia-docs"
confidence: 90
category: "cam_strategy"
tags: ["catia", "peck-drill", "deep-hole", "G83", "drilling"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.888Z
---

# Peck Drilling Cycle Configuration for Deep Holes

In CATIA, configure peck drilling (G83 equivalent) for holes deeper than 3x drill diameter. Set the first peck depth to 1-1.5xD (deepest, since the drill starts in full material) and subsequent pecks to 0.5-1xD (shallower, since chips accumulate). Enable full retract between pecks for through-holes (chips clear completely) or chip-break mode (G73 — partial retract) for blind holes where full retract wastes time. Set the dwell at bottom to 0 seconds for through-holes, 0.5-1 second for blind holes to clear the bottom.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** drilling

## Related
- [[catia-cam-tips-cat-117|Deep Hole Drilling Beyond 10xD Requires Gun Drill Strategy]]
- [[catia-cam-tips-cat-042|Axial Operations Center Drill Before Deep Hole Drilling]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[catia-cam-tips-cat-110|Spot Drilling Depth Controls Subsequent Drill Centering]]
- [[catia-cam-tips-cat-111|Center Drilling vs Spot Drilling Selection Criteria]]
