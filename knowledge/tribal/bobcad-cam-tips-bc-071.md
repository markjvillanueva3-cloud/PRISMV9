---
id: "bc-071"
title: "Automated Machine Setup from Solid Model"
source: "web:bobcad-auto-setup"
confidence: 88
category: "workflow"
tags: ["auto-setup", "stock-from-solid", "model-driven", "near-net"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.512Z
---

# Automated Machine Setup from Solid Model

BobCAD creates machine setups directly from solid models: the stock is derived from the model bounding box (with optional offsets), the part zero is set from the model coordinate system, and the fixture definition can be imported from assembly files. V36+ 'Stock from Solid' creates near-net stock shapes for castings and forgings by offsetting all part surfaces by a uniform stock allowance. This dramatically improves rest machining accuracy compared to rectangular stock.

**Category:** workflow
**Confidence:** 88
**Source:** web:bobcad-auto-setup
**Operations:** setup

## Related
- [[fusion360-cam-tips-ext-f360-178|Generative Design with Combined Additive and Subtractive]]
- [[gibbscam-cam-tips-gc-100|Air-cut detection eliminates toolpath segments that cut no material]]
