---
id: "sc-085"
title: "Swiss-Type Bar Feeder — Automatic Remnant Length Calculation"
source: "web:solidcam-docs"
confidence: 86
category: "cam_strategy"
tags: ["solidcam", "swiss-type", "bar-feeder", "remnant", "clamping"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.729Z
---

# Swiss-Type Bar Feeder — Automatic Remnant Length Calculation

When programming SolidCAM for Swiss-type machines with bar feeders, set the bar remnant length to at least 2x the guide bushing length plus the part-off tool width. SolidCAM's bar feeder cycle calculates the number of parts per bar based on part length + part-off width + facing stock, but does not automatically account for the minimum clamping length required for the last part. Manually verify the remnant calculation to prevent the collet from losing grip on the final part, which risks a crash or scrapped part.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** swiss_type, bar_feeding

## Related
- [[solidcam-cam-tips-sc-152-2|Uncertainty Budget for iMachining vs Conventional]]
- [[solidcam-cam-tips-sc-153-2|Kienzle Force Verification for iMachining]]
- [[solidcam-cam-tips-sc-154-2|Taylor Tool Life for Economic Speed Selection]]
- [[solidcam-cam-tips-sc-155-2|Sobol Sensitivity for Parameter Importance]]
- [[solidcam-cam-tips-sc-156-2|Pareto Front for Quality-Throughput Trade-Off]]
