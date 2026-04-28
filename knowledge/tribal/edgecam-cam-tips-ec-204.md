---
id: "ec-204"
title: "Custom Probing Cycle for In-Process Measurement"
source: "web:edgecam-docs"
confidence: 0.83
category: "cam_strategy"
tags: ["custom-cycle", "probing", "in-process-measurement", "quality"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.425Z
---

# Custom Probing Cycle for In-Process Measurement

Create custom probing cycles in Edgecam for in-process measurement that goes beyond standard probe routines. Define multi-point measurement patterns: bore circularity (8-point), flatness (grid pattern), parallelism (two-surface comparison). Program the probe to write measured values to macro variables, calculate deviations, and output results to a data file (DPRNT or equivalent). Add conditional logic: if deviation exceeds tolerance, execute a correction pass with tool-offset adjustment.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:edgecam-docs
**Operations:** probing

## Related
- [[controller-knowledge-tips-ctrl-004|Fanuc Macro B custom probing cycles]]
- [[catia-cam-tips-cat-080|On-Machine Verification Probing Reduces Setup Iterations]]
- [[edgecam-cam-tips-ec-202|Custom Drilling Cycle for Step-Bore Operations]]
- [[edgecam-cam-tips-ec-203|Custom Thread Milling Cycle with Variable Pitch]]
- [[edgecam-cam-tips-ec-205|Custom Tapping Cycle with Torque Monitoring]]
