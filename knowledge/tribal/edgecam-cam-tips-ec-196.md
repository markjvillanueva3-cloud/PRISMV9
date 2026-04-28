---
id: "ec-196"
title: "Bar Feeder Facing Stock Optimization"
source: "web:edgecam-forum"
confidence: 0.82
category: "cam_strategy"
tags: ["bar-feeder", "facing-stock", "material-savings", "optimization"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.419Z
---

# Bar Feeder Facing Stock Optimization

Minimize bar waste by optimizing facing stock in the Edgecam program. After bar pull or bar feed, the cut face has a pip (center nub from parting) and potential burr. Program a facing cut of 0.3-0.5mm to clean the face — this is the facing stock. For precise parts, add a 0.1mm skim cut after rough facing. Total bar consumption per part = part_length + cutoff_blade_width (1.5-3mm) + facing_stock (0.3-0.5mm). Reducing cutoff blade width from 3mm to 1.5mm saves 5-10% material on short parts.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:edgecam-forum
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-060|Bar Feeder Integration for Lights-Out Production]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[catia-cam-tips-cat-156|CATIA Lathe Sub-Spindle Transfer and Bar-Feeder Programming]]
- [[edgecam-cam-tips-ec-195|Bar Feeder Integration with Part Counter]]
- [[edgecam-cam-tips-ec-197|Bar Feeder Lights-Out Operation Safety Programming]]
