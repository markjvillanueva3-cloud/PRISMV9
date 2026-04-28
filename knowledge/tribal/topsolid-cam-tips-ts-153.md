---
id: "ts-153"
title: "TopSolid Electrode Qualification — Measuring Electrode Before Burning"
source: "web:topsolid-docs"
confidence: 90
category: "cam_strategy"
tags: ["topsolid", "electrode", "qualification", "measurement", "cmm"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.503Z
---

# TopSolid Electrode Qualification — Measuring Electrode Before Burning

TopSolid generates electrode qualification (measurement) programs for CMM or on-machine probing. Critical dimensions: overall X/Y/Z size (must be within ±0.005mm of nominal), electrode face profile accuracy, and datum feature alignment to the holder reference. The qualification report links to the electrode's CAM project and EDM burn parameters. Reject electrodes that are undersize — they produce oversize cavities. Oversize electrodes can be re-machined, but undersize electrodes are scrap. Always measure at multiple Z-levels to check for taper.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-docs
**Operations:** probing, edm

## Related
- [[topsolid-cam-tips-ts-150|TopSolid Electrode Design — Automatic Electrode Extraction from Cavity]]
- [[topsolid-cam-tips-ts-151|TopSolid Electrode Blank Optimization — Minimize Graphite/Copper Waste]]
- [[topsolid-cam-tips-ts-152|TopSolid Electrode Machining — Graphite-Specific CAM Strategies]]
- [[topsolid-cam-tips-ts-154|TopSolid Multi-Electrode Management — Rougher/Finisher/Orbiter Sets]]
- [[topsolid-cam-tips-ts-122|TopSolid'Cam 7 Unified Architecture — Single Environment for All Operations]]
