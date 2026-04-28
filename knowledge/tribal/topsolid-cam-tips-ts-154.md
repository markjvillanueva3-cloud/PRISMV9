---
id: "ts-154"
title: "TopSolid Multi-Electrode Management — Rougher/Finisher/Orbiter Sets"
source: "web:topsolid-docs"
confidence: 90
category: "cam_strategy"
tags: ["topsolid", "electrode", "set", "rougher", "finisher", "orbiter"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.504Z
---

# TopSolid Multi-Electrode Management — Rougher/Finisher/Orbiter Sets

Complex cavities require electrode sets: a rougher (larger spark gap, higher MRR), a finisher (smaller gap, target surface finish), and sometimes an orbiter (undersized electrode that orbits to reach undercuts). TopSolid manages the complete electrode set as a linked group — all electrodes reference the same cavity geometry but with different spark gap offsets. The burn sequence plan specifies the order: rough all areas first, then finish. TopSolid calculates electrode wear and recommends whether electrodes need replacement between rough and finish passes.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-docs
**Operations:** edm

## Related
- [[worknc-cam-tips-wnc-149|Electrode Set Management — Rougher, Finisher, and Orbiter]]
- [[topsolid-cam-tips-ts-150|TopSolid Electrode Design — Automatic Electrode Extraction from Cavity]]
- [[topsolid-cam-tips-ts-151|TopSolid Electrode Blank Optimization — Minimize Graphite/Copper Waste]]
- [[topsolid-cam-tips-ts-152|TopSolid Electrode Machining — Graphite-Specific CAM Strategies]]
- [[topsolid-cam-tips-ts-153|TopSolid Electrode Qualification — Measuring Electrode Before Burning]]
