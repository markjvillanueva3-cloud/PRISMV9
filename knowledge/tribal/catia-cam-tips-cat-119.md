---
id: "cat-119"
title: "Fiber Direction Awareness Prevents Delamination in Composite Machining"
source: "web:catia-docs"
confidence: 87
category: "cam_strategy"
tags: ["catia", "composite", "fiber-direction", "delamination", "trimming"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.894Z
---

# Fiber Direction Awareness Prevents Delamination in Composite Machining

When trimming or drilling CFRP composites in CATIA, the tool path direction relative to fiber orientation critically affects delamination risk. Cutting parallel to fibers causes splitting; cutting at 45-90 degrees to fibers gives cleaner edges. In CATIA, overlay the ply fiber direction data from Composites Design onto the machining workspace to visualize the fiber angles at each point along the trim path. For multi-directional laminates, use compression routers that cut fibers in both directions simultaneously, preventing delamination on both entry and exit plies.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** composite_machining

## Related
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[cimatron-cam-tips-cim-157|Composite Trimming for Automotive Parts]]
- [[edgecam-cam-tips-ec-031|5-Axis Trimming for Sheet and Composite Parts]]
- [[surfcam-cam-tips-sc2-043|Trimming Operations for Composite and Sheet Parts]]
- [[worknc-cam-tips-wnc-162|Composite Trimming — CFRP and GFRP Edge Routing]]
