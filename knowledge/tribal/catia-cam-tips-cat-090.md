---
id: "cat-090"
title: "Trochoidal Milling in CATIA for Slot and Channel Roughing"
source: "web:catia-docs"
confidence: 88
category: "cam_strategy"
tags: ["catia", "trochoidal", "hsm", "slot", "adaptive"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.872Z
---

# Trochoidal Milling in CATIA for Slot and Channel Roughing

Implement trochoidal milling in CATIA by using the Pocketing operation with a small radial stepover (10-15% of tool diameter) and full axial depth (up to 2-3xD). The key is to set the tool path style to ensure the tool follows overlapping circular arcs rather than straight-line passes. In CATIA V5, this may require manual definition using the 'User-Defined' tool path pattern. In 3DEXPERIENCE/DELMIA, use the Adaptive Milling operation which natively supports trochoidal motion. Feedrate: 150-300% of conventional pocketing feed.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** roughing, pocketing

## Related
- [[catia-cam-tips-cat-044|Adaptive Roughing Maintains Constant Tool Engagement]]
- [[catia-cam-tips-cat-091|Constant Engagement Angle Control for Stable Cutting]]
- [[catia-cam-tips-cat-092|Corner Rounding Enables High Feed Rates Through Direction Changes]]
- [[catia-cam-tips-cat-093|Arc Fitting Reduces NC Program Size and Improves Motion Quality]]
- [[catia-cam-tips-cat-094|Feed Optimization Based on Instantaneous Chip Load]]
