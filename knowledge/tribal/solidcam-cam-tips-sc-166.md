---
id: "sc-166"
title: "Thread Milling Single-Tooth vs. Multi-Tooth — Choose by Hole Depth and Pitch"
source: "web:solidcam-docs"
confidence: 88
category: "cam_strategy"
tags: ["solidcam", "thread-milling", "single-tooth", "multi-tooth", "helical"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.791Z
---

# Thread Milling Single-Tooth vs. Multi-Tooth — Choose by Hole Depth and Pitch

SolidCAM supports both single-tooth and multi-tooth thread mills. Single-tooth cutters are preferred for: (1) blind holes where full-depth threading to near the bottom is required, (2) different pitches with one tool (only the helical interpolation pitch changes), (3) large thread diameters (>M20) where multi-tooth cutters are expensive. Multi-tooth cutters are preferred for: (1) through-holes where speed matters (threads in one helical revolution), (2) production runs of the same pitch requiring minimal cycle time. In SolidCAM's Thread Milling operation, set Passes=1 for multi-tooth and Passes=thread-length/pitch for single-tooth.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** threading, milling

## Related
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-147-2|Taguchi Robust Design for Stable Machining]]
