---
id: "sc-154"
title: "Swiss-Type Bar Cutoff — Synchronize Sub-Spindle Pickup with Parting"
source: "web:solidcam-docs"
confidence: 83
category: "cam_strategy"
tags: ["solidcam", "swiss-type", "cutoff", "sub-spindle", "synchronization"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.782Z
---

# Swiss-Type Bar Cutoff — Synchronize Sub-Spindle Pickup with Parting

For Swiss-type parts requiring sub-spindle pickup before cutoff, program the sequence in SolidCAM as: (1) sub-spindle advance to grip position with C-axis synchronization, (2) spindle speed match between main and sub-spindle, (3) sub-spindle collet clamp, (4) cutoff tool feed with reduced RPM (typically 60-70% of turning speed), (5) sub-spindle retract. Set the overlap distance (sub-spindle grips while still connected) to 2-3mm. Use the SolidCAM Synchronization Manager to define wait codes (M-codes) ensuring the sub-spindle is fully clamped before the parting tool engages.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:solidcam-docs
**Operations:** turning, parting, swiss

## Related
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-147-2|Taguchi Robust Design for Stable Machining]]
