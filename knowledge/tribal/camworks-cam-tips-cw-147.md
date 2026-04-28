---
id: "cw-147"
title: "TBM Override and Manual Refinement — Hybrid Approach"
source: "web:camworks-docs"
confidence: 87
category: "cam_strategy"
tags: ["camworks", "tbm", "override", "manual", "hybrid"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.759Z
---

# TBM Override and Manual Refinement — Hybrid Approach

TBM provides automatic parameter assignment as a starting point, but experienced programmers should review and refine. Override TBM suggestions when: (1) the material has unusual properties not captured in TechDB, (2) fixturing limitations restrict approach directions, (3) batch size affects strategy choice (single part vs production run). TBM overrides are saved per-feature and persist through model updates. Use TBM for 80% of features and manually optimize the critical 20%.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:camworks-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-138|TBM Reads PMI to Auto-Assign Machining Parameters]]
- [[camworks-cam-tips-cw-139|TBM Surface Finish Mapping — Ra to Strategy Selection]]
- [[camworks-cam-tips-cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]]
- [[camworks-cam-tips-cw-141|TBM GD&T Integration — Datum Features Drive Setup Order]]
