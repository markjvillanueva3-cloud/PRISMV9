---
id: "sc-140"
title: "Peck Drilling Optimization — Chip Break vs Full Retract Strategies"
source: "web:solidcam-docs"
confidence: 89
category: "cam_strategy"
tags: ["solidcam", "peck-drilling", "chip-break", "deep-hole", "cycle-optimization"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.772Z
---

# Peck Drilling Optimization — Chip Break vs Full Retract Strategies

SolidCAM offers multiple peck drilling strategies: full retract (G83 — drill retracts to R-plane for chip clearing), chip break (G73 — short retract of 0.5-1mm to break chip without full withdrawal), and high-speed peck (reduced retract distance with increased feed). For depths up to 3xD in steel, use chip-break pecking with 0.5-1.0xD peck depth. For 3-6xD, switch to full retract with decreasing peck depths (first peck 1.5xD, subsequent pecks reducing by 20% each). For aluminum, use chip-break only — full retract wastes time since aluminum chips evacuate easily. Set the retract feed rate to maximum rapid to minimize cycle time on full-retract pecks.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** drilling

## Related
- [[solidcam-cam-tips-sc-138|BTA Deep Hole Drilling — Programming Long Bore Cycles in SolidCAM]]
- [[solidcam-cam-tips-sc-139|Gun Drilling — Single-Flute Deep Hole Strategy with Guide Bushing]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
