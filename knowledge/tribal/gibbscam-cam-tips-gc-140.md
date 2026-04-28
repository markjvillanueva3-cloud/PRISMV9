---
id: "gc-140"
title: "MTM bar-feed cycle integration automates continuous production runs"
source: "web:gibbscam-docs"
confidence: 85
category: "cam_strategy"
tags: ["gibbscam", "mtm", "bar-feed", "automation", "continuous-production"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.941Z
---

# MTM bar-feed cycle integration automates continuous production runs

GibbsCAM MTM programs can embed bar-feed cycles that automatically advance stock, clamp, and face the bar remnant before starting the next part. Configure the bar feeder parameters in Machine Setup: bar length (typically 3000-4000 mm), remnant length (minimum grippable length, usually 30-50 mm), and feed pressure. The system calculates how many parts per bar and inserts the bar-advance sequence automatically. Include a part counter macro that stops the machine after the calculated part count and alerts the operator to load a new bar. For oil-country work with expensive bar stock, program an end-of-bar optimization that checks if the remaining bar can produce one more part before triggering the remnant eject.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
- [[gibbscam-cam-tips-gc-044|Multi-turret synchronization allows simultaneous cutting on opposite sides]]
- [[gibbscam-cam-tips-gc-045|B-axis milling on MTM machines enables 5-axis capability from a lathe platform]]
