---
id: "sc-141"
title: "Spot and Center Drilling — Precise Start Points for Deep Holes"
source: "web:solidcam-docs"
confidence: 90
category: "cam_strategy"
tags: ["solidcam", "spot-drilling", "center-drilling", "hole-accuracy", "preparation"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.772Z
---

# Spot and Center Drilling — Precise Start Points for Deep Holes

Program spot or center drill operations in SolidCAM before every deep hole operation (anything over 3xD). For twist drills, use a 90-degree spot drill to create a centering cone matching the drill's point angle (118 or 140 degrees). For gun drills and BTA, use a 180-degree (flat-bottom) spot to create a flat reference surface. Set the spot drill diameter to 1.1-1.3x the subsequent drill diameter to ensure the drill tip fully engages the spot before the margins contact the workpiece. In SolidCAM, link the spot drill operation to the main drilling operation so they share the same hole positions and update together.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:solidcam-docs
**Operations:** drilling

## Related
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-147-2|Taguchi Robust Design for Stable Machining]]
